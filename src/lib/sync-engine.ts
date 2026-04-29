// Sync engine for Task Aggregator
// Orchestrates task ingestion from UVEC and Google Classroom

import * as Sentry from "@sentry/nextjs";
import type { ParsedTask } from "../types/task";
import { GClassroomService } from "../services/gclassroom-service";
import { refreshGoogleAccessToken } from "../services/gclassroom-service";
import { parseGClassroomResponse } from "./parsers/gclassroom-parser";
import { ingestUvecTasks } from "../services/uvec-service";
import {
  messageForGoogleClassroomAuthFailure,
  messageForGoogleRefreshFailure,
} from "./google-sync-errors";

export interface SyncConfig {
  /** Google OAuth access token (may be null after first session) */
  gclassroomToken?: string;
  /** Google OAuth refresh token (persisted in profiles table) */
  gclassroomRefreshToken?: string;
  /** UVEC iCal export URL */
  uvecIcalUrl?: string;
}

export interface SyncResult {
  tasks: ParsedTask[];
  errors: string[];
  /** Map of courseExternalId -> display name (from Google Classroom API) */
  courseNames: Map<string, string>;
}

/** Fetch all courseWork and submissions for the given GClassroom service. */
async function fetchGoogleClassroomData(
  gclassroom: GClassroomService,
  courseNames: Map<string, string>,
  errors: string[],
): Promise<ParsedTask[]> {
  const courses = await gclassroom.getCourses();
  for (const course of courses) {
    courseNames.set(course.id, course.name);
  }

  const results = await Promise.allSettled(
    courses.map(async (course) => {
      const [courseWork, submissions] = await Promise.all([
        gclassroom.getCourseWork(course.id),
        gclassroom.getStudentSubmissions(course.id),
      ]);
      return { courseWork, submissions };
    }),
  );

  const allCourseWork: unknown[] = [];
  const allSubmissions = new Map<string, string>();
  for (const [i, result] of results.entries()) {
    if (result.status === "fulfilled") {
      allCourseWork.push(...result.value.courseWork);
      for (const [cwId, state] of result.value.submissions) {
        allSubmissions.set(cwId, state);
      }
    } else {
      const courseId = courses[i]?.id ?? "unknown";
      const err =
        result.reason instanceof Error
          ? result.reason
          : new Error(String(result.reason));
      Sentry.captureException(err, {
        tags: { source: "gclassroom" },
        extra: { courseExternalId: courseId },
      });
      errors.push(`Failed to fetch courseWork: ${err.message}`);
    }
  }

  return parseGClassroomResponse({ courseWork: allCourseWork }, allSubmissions);
}

export async function syncTasks(config: SyncConfig): Promise<SyncResult> {
  const errors: string[] = [];
  const courseNames = new Map<string, string>();
  let uvecTasks: ParsedTask[] = [];
  let gclassroomTasks: ParsedTask[] = [];

  if (
    !config.uvecIcalUrl &&
    !config.gclassroomToken &&
    !config.gclassroomRefreshToken
  ) {
    return {
      tasks: [],
      errors: [
        "No data sources configured. Add UVEC URL or connect Google Classroom in Settings.",
      ],
      courseNames,
    };
  }

  // --- UVEC ---
  if (config.uvecIcalUrl) {
    try {
      const result = await ingestUvecTasks(config.uvecIcalUrl);
      uvecTasks = Array.isArray(result.tasks) ? [...result.tasks] : [];
      // Merge UVEC course names
      for (const [id, name] of result.courseNames) {
        courseNames.set(id, name);
      }
    } catch (err) {
      errors.push(
        `UVEC sync failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  // --- Google Classroom ---
  let googleToken = config.gclassroomToken;

  // If no access token but we have a refresh token, refresh it
  if (!googleToken && config.gclassroomRefreshToken) {
    try {
      const refreshed = await refreshGoogleAccessToken(
        config.gclassroomRefreshToken,
      );
      googleToken = refreshed.access_token;
    } catch (err) {
      errors.push(messageForGoogleRefreshFailure(err));
    }
  }

  if (googleToken) {
    try {
      const gclassroom = new GClassroomService({
        accessToken: googleToken,
      });
      gclassroomTasks = await fetchGoogleClassroomData(
        gclassroom,
        courseNames,
        errors,
      );
    } catch (err) {
      if (err instanceof Error && err.message === "GOOGLE_TOKEN_EXPIRED") {
        // Try refreshing if the token expired mid-sync
        if (config.gclassroomRefreshToken) {
          try {
            const refreshed = await refreshGoogleAccessToken(
              config.gclassroomRefreshToken,
            );
            const gclassroom = new GClassroomService({
              accessToken: refreshed.access_token,
            });
            gclassroomTasks = await fetchGoogleClassroomData(
              gclassroom,
              courseNames,
              errors,
            );
          } catch (retryErr) {
            errors.push(messageForGoogleClassroomAuthFailure(retryErr));
          }
        } else {
          errors.push(
            "Google Classroom token expired. Please reconnect Google in Settings.",
          );
        }
      } else {
        errors.push(
          `GClassroom sync failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }
  }

  // Merge and deduplicate tasks by source + externalId
  const merged = [...uvecTasks, ...gclassroomTasks];
  const deduped = Array.from(
    new Map(merged.map((t) => [`${t.source}:${t.externalId}`, t])).values(),
  );

  return { tasks: deduped, errors, courseNames };
}
