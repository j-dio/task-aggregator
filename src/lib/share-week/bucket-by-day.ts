import type { TaskWithCourse } from "@/types/task";

/**
 * Group tasks by day-of-week index (0 = Mon … 6 = Sun) relative to weekStart.
 * Tasks without a dueDate are dropped — week shares are inherently
 * date-anchored and a "no due date" task can't be placed on a row.
 */
export function bucketByDay(
  tasks: TaskWithCourse[],
  weekStart: Date,
): TaskWithCourse[][] {
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const buckets: TaskWithCourse[][] = Array.from({ length: 7 }, () => []);
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const due = new Date(task.dueDate);
    if (due < start || due >= end) continue;
    const dayIdx = Math.floor(
      (due.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (dayIdx < 0 || dayIdx > 6) continue;
    buckets[dayIdx].push(task);
  }

  for (const bucket of buckets) {
    bucket.sort((a, b) => {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return aTime - bTime;
    });
  }

  return buckets;
}
