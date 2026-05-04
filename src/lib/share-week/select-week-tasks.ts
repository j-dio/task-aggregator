import type { TaskWithCourse } from "@/types/task";

/**
 * Pure filter + sort for the weekly share image.
 *
 * - Drops tasks with no dueDate (a date-anchored layout has nowhere to put them).
 * - Includes tasks of every state (pending, in_progress, done, dismissed,
 *   overdue) — the share is a snapshot of the user's full week, not a
 *   curated to-do list.
 * - Range is [weekStart, weekStart + 7 days) in the runtime's local time —
 *   i.e. a task at Sun 23:59 local is in, a task at the next Mon 00:00 local is out.
 * - Sorts ascending by dueDate.
 */
export function selectWeekTasks(
  all: TaskWithCourse[],
  weekStart: Date,
): TaskWithCourse[] {
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const filtered = all.filter((task) => {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate);
    return due >= start && due < end;
  });

  filtered.sort((a, b) => {
    const aT = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const bT = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return aT - bT;
  });

  return filtered;
}
