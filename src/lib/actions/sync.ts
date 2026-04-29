"use server";

import { createClient } from "@/lib/supabase/server";
import { syncTasks, type SyncResult } from "@/lib/sync-engine";
import {
  buildTaskUpsertRows,
  taskStatusKey,
} from "@/lib/actions/sync-task-rows";
import { generateCourseColor } from "@/lib/utils";
import {
  syncErrorRequiresGoogleReconnect,
  GOOGLE_RECONNECT_USER_MESSAGE,
} from "@/lib/google-sync-errors";
import type { TaskSource, TaskStatus } from "@/types/task";

/** Sanitize error messages before sending to the client to prevent leaking server internals. */
function sanitizeErrors(errors: string[]): string[] {
  return errors.map((e) => {
    if (syncErrorRequiresGoogleReconnect(e)) return GOOGLE_RECONNECT_USER_MESSAGE;
    if (e.startsWith("UVEC sync failed")) return "UVEC sync failed. Please check your iCal URL in Settings.";
    if (e.startsWith("GClassroom sync failed")) return "Google Classroom sync encountered an error. Please try again.";
    if (e.startsWith("Google token refresh failed")) return "Google token refresh failed. Try reconnecting in Settings.";
    if (e.startsWith("Failed to fetch courseWork")) return "Failed to fetch some course data. Please try again.";
    if (e.startsWith("Task status lookup failed")) return "Failed to load existing task statuses. Please try again.";
    if (e.startsWith("Task upsert failed")) return "Failed to save tasks. Please try again.";
    if (e.startsWith("Failed to load profile")) return "Failed to load your profile. Please try again.";
    if (e.startsWith("No data sources configured")) return e;
    if (e.startsWith("Google Classroom token expired")) return e;
    return "An unexpected sync error occurred.";
  });
}

export interface SyncResponse {
  synced: number;
  errors: string[];
}

/**
 * Server action to sync tasks from UVEC and Google Classroom.
 * Fetches from external sources, parses, and upserts to database.
 */
export async function syncAllTasks(): Promise<SyncResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { synced: 0, errors: ["Not authenticated"] };
  }

  // Get session for access token and provider tokens
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { synced: 0, errors: ["No active session. Please sign in again."] };
  }

  // Get profile for UVEC URL and stored Google refresh token
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("uvec_ical_url, google_refresh_token")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return {
      synced: 0,
      errors: sanitizeErrors([`Failed to load profile: ${profileError.message}`]),
    };
  }

  // provider_token is only available immediately after OAuth sign-in
  // (not persisted in Supabase SSR cookies), so we primarily rely on
  // the stored refresh token for Google Classroom sync.
  const googleAccessToken = session.provider_token ?? undefined;
  const googleRefreshToken =
    session.provider_refresh_token ??
    profile?.google_refresh_token ??
    undefined;

  // Build config and surface helpful messages when sources are missing
  const hasUvec = !!profile?.uvec_ical_url;
  const hasGoogle = !!(googleAccessToken || googleRefreshToken);

  if (!hasUvec && !hasGoogle) {
    return {
      synced: 0,
      errors: [
        "No data sources configured. Add your UVEC URL or connect Google Classroom in Settings.",
      ],
    };
  }

  // Run sync engine with all tokens
  let result: SyncResult;
  try {
    result = await syncTasks({
      uvecIcalUrl: profile?.uvec_ical_url ?? undefined,
      gclassroomToken: googleAccessToken,
      gclassroomRefreshToken: googleRefreshToken,
    });
  } catch (err) {
    return {
      synced: 0,
      errors: [
        `Sync engine error: ${err instanceof Error ? err.message : "Unknown error"}`,
      ],
    };
  }

  // If Google returned invalid_grant (or the error was already normalized to
  // the reconnect message by the sync engine), the stored refresh token is
  // permanently invalid.  Clear it so Settings shows "not connected".
  if (result.errors.some((e) => syncErrorRequiresGoogleReconnect(e))) {
    await supabase
      .from("profiles")
      .update({ google_refresh_token: null })
      .eq("id", user.id);
  }

  if (result.tasks.length === 0) {
    return { synced: 0, errors: sanitizeErrors(result.errors) };
  }

  // Upsert courses first (collect unique course external IDs)
  const courseMap = new Map<string, string>(); // externalId:source -> db id
  const uniqueCourses = new Map<
    string,
    { externalId: string; source: string; name: string }
  >();

  for (const task of result.tasks) {
    if (task.courseExternalId) {
      const key = `${task.courseExternalId}:${task.source}`;
      if (!uniqueCourses.has(key)) {
        // Use real course name from the API if available, fall back to externalId
        const displayName =
          result.courseNames.get(task.courseExternalId) ??
          task.courseExternalId;
        uniqueCourses.set(key, {
          externalId: task.courseExternalId,
          source: task.source,
          name: displayName,
        });
      }
    }
  }

  if (uniqueCourses.size > 0) {
    const courseRows = Array.from(uniqueCourses.values()).map((c) => ({
      user_id: user.id,
      external_id: c.externalId,
      source: c.source,
      name: c.name,
    }));

    const { data: upsertedCourses } = await supabase
      .from("courses")
      .upsert(courseRows, {
        onConflict: "user_id,external_id,source",
        ignoreDuplicates: false,
      })
      .select("id, external_id, source");

    if (upsertedCourses) {
      for (const c of upsertedCourses) {
        courseMap.set(`${c.external_id}:${c.source}`, c.id);
      }
    }
  }

  // If courseMap is empty but we have courses, fetch them
  if (courseMap.size === 0 && uniqueCourses.size > 0) {
    const { data: existingCourses } = await supabase
      .from("courses")
      .select("id, external_id, source")
      .eq("user_id", user.id);

    if (existingCourses) {
      for (const c of existingCourses) {
        courseMap.set(`${c.external_id}:${c.source}`, c.id);
      }
    }
  }

  // Backfill course colors for any courses missing a color
  if (courseMap.size > 0) {
    const { data: coursesWithoutColor } = await supabase
      .from("courses")
      .select("id")
      .eq("user_id", user.id)
      .is("color", null);

    if (coursesWithoutColor && coursesWithoutColor.length > 0) {
      await Promise.all(
        coursesWithoutColor.map((row) =>
          supabase
            .from("courses")
            .update({ color: generateCourseColor(row.id) })
            .eq("id", row.id),
        ),
      );
    }
  }

  const externalIds = Array.from(new Set(result.tasks.map((t) => t.externalId)));
  const existingStatuses = new Map<string, TaskStatus>();
  const { data: existingTasks, error: existingTasksError } = await supabase
    .from("tasks")
    .select("external_id, source, status")
    .eq("user_id", user.id)
    .in("external_id", externalIds);

  if (existingTasksError) {
    return {
      synced: 0,
      errors: sanitizeErrors([
        ...result.errors,
        `Task status lookup failed: ${existingTasksError.message}`,
      ]),
    };
  }

  if (existingTasks) {
    for (const task of existingTasks as Array<{
      external_id: string;
      source: TaskSource;
      status: TaskStatus;
    }>) {
      existingStatuses.set(
        taskStatusKey(task.external_id, task.source),
        task.status,
      );
    }
  }

  const taskRows = buildTaskUpsertRows({
    tasks: result.tasks,
    userId: user.id,
    courseMap,
    existingStatuses,
  });

  const { error: taskError } = await supabase.from("tasks").upsert(taskRows, {
    onConflict: "user_id,external_id,source",
    ignoreDuplicates: false,
  });

  if (taskError) {
    result.errors.push(`Task upsert failed: ${taskError.message}`);
  }

  return {
    synced: taskError ? 0 : result.tasks.length,
    errors: sanitizeErrors(result.errors),
  };
}
