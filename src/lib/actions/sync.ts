"use server";

import { createClient } from "@/lib/supabase/server";
import { syncTasks } from "@/lib/sync-engine";

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

  // Get profile for UVEC URL
  const { data: profile } = await supabase
    .from("profiles")
    .select("uvec_ical_url")
    .eq("id", user.id)
    .single();

  // Get Google token from session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const gclassroomToken = session?.provider_token ?? undefined;

  // Run sync engine
  const result = await syncTasks({
    uvecIcalUrl: profile?.uvec_ical_url ?? undefined,
    userId: user.id,
    gclassroomToken,
  });

  if (result.tasks.length === 0) {
    return { synced: 0, errors: result.errors };
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
        uniqueCourses.set(key, {
          externalId: task.courseExternalId,
          source: task.source,
          name: task.courseExternalId, // Will be overridden by actual name if available
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

  // Upsert tasks
  const taskRows = result.tasks.map((t) => {
    const courseKey = t.courseExternalId
      ? `${t.courseExternalId}:${t.source}`
      : null;
    return {
      user_id: user.id,
      external_id: t.externalId,
      source: t.source,
      title: t.title,
      description: t.description,
      due_date: t.dueDate,
      type: t.type,
      url: t.url,
      course_id: courseKey ? (courseMap.get(courseKey) ?? null) : null,
    };
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
    errors: result.errors,
  };
}
