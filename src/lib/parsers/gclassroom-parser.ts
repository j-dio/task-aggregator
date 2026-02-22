// Google Classroom parser for Task Aggregator
// Phase 3: Scaffolding only

import { z } from "zod";
import { Task } from "../../types/task";

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
  assignment: z.any().optional(),
});

export const GClassroomAnnouncementSchema = z.object({
  id: z.string(),
  text: z.string(),
  creationTime: z.string(),
  courseId: z.string(),
  state: z.string(),
});

// Convert Google Classroom courseWork array to Task[]
export function parseGClassroomResponse(response: unknown): Task[] {
  if (!response || typeof response !== 'object') return [];
  // Accepts { courseWork: [...] }
  const courseWorkArr = (response as { courseWork?: unknown[] }).courseWork;
  if (!Array.isArray(courseWorkArr)) return [];
  return courseWorkArr
    .map((item) => {
      try {
        const cw = GClassroomCourseWorkSchema.parse(item);
        // Map to Task type
        return {
          id: cw.id,
          title: cw.title,
          description: cw.description ?? '',
          dueDate: cw.dueDate && cw.dueTime
            ? `${cw.dueDate.year.toString().padStart(4, '0')}-${cw.dueDate.month.toString().padStart(2, '0')}-${cw.dueDate.day.toString().padStart(2, '0')}T${cw.dueTime.hours.toString().padStart(2, '0')}:${cw.dueTime.minutes.toString().padStart(2, '0')}:${cw.dueTime.seconds ? cw.dueTime.seconds.toString().padStart(2, '0') : '00'}`
            : undefined,
          source: 'google-classroom',
          courseId: cw.courseId,
        } as Task;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Task[];
}

// Zod schemas will be added in a later commit
