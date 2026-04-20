export type TaskSource = "uvec" | "gclassroom" | "custom";

export type TaskType =
  | "assignment"
  | "quiz"
  | "exam"
  | "event"
  | "announcement";

export type TaskStatus = "pending" | "in_progress" | "done" | "dismissed";

export type TaskDisplayStatus = TaskStatus | "overdue";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type ActionBoardColumn = "todo" | "in_progress" | "done";

export interface ActionBoardBuckets {
  todo: TaskWithCourse[];
  inProgress: TaskWithCourse[];
  done: TaskWithCourse[];
  /** Full count in the To Do bucket before display slicing (time window + sort). */
  todoTotal: number;
  /** Full count in the In Progress bucket before display slicing. */
  inProgressTotal: number;
  /** Full count in the Done bucket before display slicing (7-day window + sort). */
  doneTotal: number;
  /** Task IDs in the Done bucket before display slicing — use for "Dismiss all". */
  doneTaskIds: string[];
  /** True when pending tasks exist beyond the current To Do time window. */
  todoHasMore: boolean;
  /** True when in-progress tasks exist beyond the current limit. */
  inProgressHasMore: boolean;
  /** True when done tasks exist beyond the current done window. */
  doneHasMore: boolean;
}

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
  isCustom: boolean;
  fetchedAt: string;
  createdAt: string;
  updatedAt: string;
  sharedFromUserId?: string;
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
  /** Set by parsers when external source indicates completion (e.g. GC submission) */
  status?: TaskStatus;
}

/**
 * Task with its associated course data (from Supabase join).
 */
export interface TaskWithCourse extends Task {
  course: Course | null;
  priority?: TaskPriority | null;
  notes?: string | null;
  displayStatus?: TaskDisplayStatus;
}

export type TaskUrgency =
  | "overdue"
  | "urgent"
  | "soon"
  | "upcoming"
  | "later"
  | "none";

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
