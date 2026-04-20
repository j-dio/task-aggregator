import { z } from "zod/v4";

const TASK_TYPES = [
  "assignment",
  "quiz",
  "exam",
  "event",
  "announcement",
] as const;
const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

/**
 * Schema for creating a custom task.
 */
export const createCustomTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  type: z.enum(TASK_TYPES).optional().default("assignment"),
  courseId: z.uuid().optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  shareWith: z.array(z.uuid()).max(20).optional(),
});

export type CreateCustomTaskInput = z.infer<typeof createCustomTaskSchema>;

/**
 * Schema for updating a custom task.
 * Title remains required; all other fields optional.
 */
export const updateCustomTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).nullable().optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  type: z.enum(TASK_TYPES).optional(),
  courseId: z.uuid().nullable().optional(),
  priority: z.enum(TASK_PRIORITIES).nullable().optional(),
});

export type UpdateCustomTaskInput = z.infer<typeof updateCustomTaskSchema>;
