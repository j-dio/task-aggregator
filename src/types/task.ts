export type TaskSource = "uvec" | "gclassroom";

export type TaskType =
  | "assignment"
  | "quiz"
  | "exam"
  | "event"
  | "announcement";

export type TaskStatus =
  | "pending"
  | "submitted"
  | "graded"
  | "overdue"
  | "dismissed";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  userId: string;
  courseId: string | null;
  source: TaskSource;
  externalId: string;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  dueDate: string | null;
  url: string | null;
  metadata: Record<string, unknown>;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  userId: string;
  source: TaskSource;
  externalId: string;
  name: string;
  shortName: string | null;
  instructor: string | null;
  color: string | null;
  isArchived: boolean;
  createdAt: string;
}

/**
 * Intermediate type returned by parsers before DB insertion.
 * Does not include DB-generated fields (id, userId, timestamps).
 */
export interface ParsedTask {
  externalId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  type: TaskType;
  source: TaskSource;
  courseExternalId: string | null;
  url: string | null;
}

export interface TaskOverride {
  id: string;
  userId: string;
  taskId: string;
  customStatus: TaskStatus | null;
  priority: TaskPriority | null;
  notes: string | null;
  reminderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  displayName: string | null;
  universityId: string | null;
  uvecIcalUrl: string | null;
  googleConnected: boolean;
  notificationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
