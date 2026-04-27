import type {
  TaskWithCourse,
  TaskSource,
  TaskType,
  TaskStatus,
  TaskPriority,
  TaskDisplayStatus,
} from "@/types/task";

export interface ResolveTaskDisplayStatusInput {
  baseStatus: TaskStatus;
  overrideStatus?: TaskStatus | null;
  dueDate: string | null;
  now?: Date;
}

/**
 * Resolve a task's effective status and display status.
 *
 * `dueDate` is an ISO timestamp. A task is "overdue" only when its status is
 * pending and the due timestamp's UTC calendar date is before `now`'s UTC
 * calendar date. Comparing UTC dates keeps SSR, tests, and browser caches from
 * disagreeing around local timezone boundaries; same-day tasks remain pending.
 */
export function resolveTaskDisplayStatus({
  baseStatus,
  overrideStatus = null,
  dueDate,
  now = new Date(),
}: ResolveTaskDisplayStatusInput): {
  status: TaskStatus;
  displayStatus: TaskDisplayStatus;
} {
  const status = overrideStatus ?? baseStatus;
  const displayStatus: TaskDisplayStatus =
    status === "pending" && isDueBeforeUtcDay(dueDate, now)
      ? "overdue"
      : status;

  return { status, displayStatus };
}

function isDueBeforeUtcDay(dueDate: string | null, now: Date) {
  if (!dueDate) return false;

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;

  return utcDayKey(due) < utcDayKey(now);
}

function utcDayKey(date: Date) {
  return (
    date.getUTCFullYear() * 10_000 +
    (date.getUTCMonth() + 1) * 100 +
    date.getUTCDate()
  );
}

function mapMetadata(metadata: unknown): Record<string, unknown> {
  if (
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata)
  ) {
    return metadata as Record<string, unknown>;
  }

  return {};
}

export function mapRow(row: Record<string, unknown>): TaskWithCourse {
  const course = row.courses as Record<string, unknown> | null;
  const overrides = row.task_overrides as Record<string, unknown>[] | null;
  const override = overrides?.[0] ?? null;
  const baseStatus = ((row.status as string) ?? "pending") as TaskStatus;
  const customStatus = (override?.custom_status as TaskStatus | null) ?? null;
  const dueDate = (row.due_date as string) ?? null;
  const { status, displayStatus } = resolveTaskDisplayStatus({
    baseStatus,
    overrideStatus: customStatus,
    dueDate,
  });
  // Use the more recent of tasks.updated_at and task_overrides.updated_at so that
  // marking a task as done (which only touches the override row) results in an
  // up-to-date updatedAt, keeping the task visible in the done window.
  const taskUpdatedAt = (row.updated_at as string) ?? "";
  const overrideUpdatedAt = (override?.updated_at as string) ?? null;
  const effectiveUpdatedAt =
    overrideUpdatedAt && overrideUpdatedAt > taskUpdatedAt
      ? overrideUpdatedAt
      : taskUpdatedAt;

  return {
    id: row.id as string,
    userId: row.user_id as string,
    courseId: (row.course_id as string) ?? null,
    source: row.source as TaskSource,
    externalId: row.external_id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    type: (row.type as TaskType) ?? "assignment",
    status,
    dueDate,
    url: (row.url as string) ?? null,
    metadata: mapMetadata(row.metadata),
    isCustom: (row.is_custom as boolean) ?? false,
    fetchedAt: taskUpdatedAt,
    createdAt: (row.created_at as string) ?? "",
    updatedAt: effectiveUpdatedAt,
    priority: (override?.priority as TaskPriority | null) ?? null,
    notes: (override?.notes as string | null) ?? null,
    displayStatus,
    course: course
      ? {
          id: course.id as string,
          userId: course.user_id as string,
          source: course.source as TaskSource,
          externalId: course.external_id as string,
          name: course.name as string,
          shortName: null,
          instructor: null,
          color: (course.color as string) ?? null,
          isArchived: false,
          createdAt: (course.created_at as string) ?? "",
        }
      : null,
  };
}
