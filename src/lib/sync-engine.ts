// Sync engine for Task Aggregator
// Orchestrates task ingestion from UVEC and Google Classroom

import type { ParsedTask } from "../types/task";
import { GClassroomService } from "../services/gclassroom-service";
import { parseGClassroomResponse } from "./parsers/gclassroom-parser";
import { ingestUvecTasks } from "../services/uvec-service";

export interface SyncConfig {
  gclassroomToken?: string;
  uvecIcalUrl?: string;
  userId?: string;
}

export interface SyncResult {
  tasks: ParsedTask[];
  errors: string[];
}

export async function syncTasks(config?: SyncConfig): Promise<SyncResult> {
  const errors: string[] = [];
  let uvecTasks: ParsedTask[] = [];
  let gclassroomTasks: ParsedTask[] = [];

  // Fetch UVEC tasks
  if (config?.uvecIcalUrl && config?.userId) {
    try {
      const fetched = await ingestUvecTasks({
        icalUrl: config.uvecIcalUrl,
        userId: config.userId,
      });
      uvecTasks = Array.isArray(fetched) ? [...fetched] : [];
    } catch (err) {
      errors.push(
        `UVEC sync failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  // Fetch Google Classroom tasks
  if (config?.gclassroomToken) {
    try {
      const gclassroom = new GClassroomService({
        accessToken: config.gclassroomToken,
      });
      const courses = await gclassroom.getCourses();

      // Fetch courseWork in parallel for performance
      const results = await Promise.allSettled(
        courses.map((course) => gclassroom.getCourseWork(course.id)),
      );

      const allCourseWork: unknown[] = [];
      for (const result of results) {
        if (result.status === "fulfilled") {
          allCourseWork.push(...result.value);
        } else {
          errors.push(`Failed to fetch courseWork: ${result.reason}`);
        }
      }

      gclassroomTasks = parseGClassroomResponse({ courseWork: allCourseWork });
    } catch (err) {
      errors.push(
        `GClassroom sync failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  // Merge and deduplicate tasks by source + externalId
  const merged = [...uvecTasks, ...gclassroomTasks];
  const deduped = Array.from(
    new Map(merged.map((t) => [`${t.source}:${t.externalId}`, t])).values(),
  );

  return { tasks: deduped, errors };
}
