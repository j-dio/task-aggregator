// Google Classroom parser for Task Aggregator

import { z } from "zod";
import type { ParsedTask, TaskStatus } from "../../types/task";

// Zod schemas for Google Classroom API responses
export const GClassroomCourseSchema = z.object({
  id: z.string(),
  name: z.string(),
  section: z.string().optional(),
  description: z.string().optional(),
  teacherFolder: z.object({ id: z.string() }).optional(),
  courseState: z.string(),
});

export const GClassroomCourseWorkSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  dueDate: z
    .object({
      year: z.number(),
      month: z.number(),
      day: z.number(),
    })
    .optional(),
  dueTime: z
    .object({
      hours: z.number(),
      minutes: z.number(),
      seconds: z.number().optional(),
    })
    .optional(),
  state: z.string(),
  courseId: z.string(),
  alternateLink: z.string().optional(),
  assignment: z.any().optional(),
});

export const GClassroomAnnouncementSchema = z.object({
  id: z.string(),
  text: z.string(),
  creationTime: z.string(),
  courseId: z.string(),
  state: z.string(),
});

function formatDueDate(
  dueDate: { year: number; month: number; day: number },
  dueTime?: { hours: number; minutes: number; seconds?: number },
): string {
  const y = dueDate.year.toString().padStart(4, "0");
  const m = dueDate.month.toString().padStart(2, "0");
  const d = dueDate.day.toString().padStart(2, "0");
  if (!dueTime) {
    // No time component: treat as end-of-day in UTC+8 (23:59:59+08:00 = 15:59:59Z)
    return `${y}-${m}-${d}T15:59:59.000Z`;
  }
  const h = dueTime.hours.toString().padStart(2, "0");
  const min = dueTime.minutes.toString().padStart(2, "0");
  const s = (dueTime.seconds ?? 0).toString().padStart(2, "0");
  // dueTime is UTC per Google Classroom API
  return `${y}-${m}-${d}T${h}:${min}:${s}Z`;
}

/**
 * The app has no dedicated "needs revision" status. Classroom RETURNED often means
 * graded/returned, so mapping it to done avoids resurrecting old no-deadline work.
 * Unknown states return undefined so sync can preserve the existing DB status.
 */
function mapSubmissionStateToStatus(state: string): TaskStatus | undefined {
  switch (state) {
    case "TURNED_IN":
    case "RETURNED":
      return "done";
    case "DRAFT":
    case "RECLAIMED_BY_STUDENT":
      return "in_progress";
    default:
      return undefined;
  }
}

// Convert Google Classroom courseWork array to ParsedTask[]
export function parseGClassroomResponse(
  response: unknown,
  submissionMap?: Map<string, string>,
): ParsedTask[] {
  if (!response || typeof response !== "object") return [];
  const courseWorkArr = (response as { courseWork?: unknown[] }).courseWork;
  if (!Array.isArray(courseWorkArr)) return [];
  return courseWorkArr
    .map((item): ParsedTask | null => {
      try {
        const cw = GClassroomCourseWorkSchema.parse(item);
        const subState = submissionMap?.get(cw.id);
        const task: ParsedTask = {
          externalId: cw.id,
          title: cw.title,
          description: cw.description ?? null,
          dueDate: cw.dueDate ? formatDueDate(cw.dueDate, cw.dueTime) : null,
          type: "assignment",
          source: "gclassroom",
          courseExternalId: cw.courseId,
          url: cw.alternateLink ?? null,
        };
        if (subState) {
          const status = mapSubmissionStateToStatus(subState);
          if (status) {
            task.status = status;
          }
        }
        return task;
      } catch {
        return null;
      }
    })
    .filter((t): t is ParsedTask => t !== null);
}
