import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TaskUrgency, TaskWithCourse } from "@/types/task";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date relative to now (e.g., "in 2 hours", "3 days ago").
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (Math.abs(diffMins) < 1) return "just now";

  if (diffMs > 0) {
    if (diffMins < 60) return `in ${diffMins}m`;
    if (diffHours < 24) return `in ${diffHours}h`;
    if (diffDays < 7) return `in ${diffDays}d`;
    return date.toLocaleDateString();
  }

  if (Math.abs(diffMins) < 60) return `${Math.abs(diffMins)}m ago`;
  if (Math.abs(diffHours) < 24) return `${Math.abs(diffHours)}h ago`;
  if (Math.abs(diffDays) < 7) return `${Math.abs(diffDays)}d ago`;
  return date.toLocaleDateString();
}

/**
 * Check if a task is overdue based on its due date.
 */
export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

/**
 * Classify task urgency based on due date.
 * - overdue: past due
 * - urgent: due within 24 hours
 * - soon: due within 3 days
 * - upcoming: due within 7 days
 * - later: due after 7 days
 * - none: no due date
 */
export function getTaskUrgency(dueDate: string | null): TaskUrgency {
  if (!dueDate) return "none";
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffMs < 0) return "overdue";
  if (diffHours < 24) return "urgent";
  if (diffHours < 72) return "soon";
  if (diffHours < 168) return "upcoming";
  return "later";
}

/**
 * Group tasks into urgency buckets for the board view.
 */
export function groupTasksByUrgency(tasks: TaskWithCourse[]) {
  const buckets = {
    overdue: [] as TaskWithCourse[],
    today: [] as TaskWithCourse[],
    thisWeek: [] as TaskWithCourse[],
    later: [] as TaskWithCourse[],
  };

  for (const task of tasks) {
    if (task.status === "done" || task.status === "dismissed") continue;
    const urgency = getTaskUrgency(task.dueDate);
    switch (urgency) {
      case "overdue":
        buckets.overdue.push(task);
        break;
      case "urgent":
        buckets.today.push(task);
        break;
      case "soon":
      case "upcoming":
        buckets.thisWeek.push(task);
        break;
      default:
        buckets.later.push(task);
        break;
    }
  }

  // Sort each bucket by due date ascending
  const sortByDue = (a: TaskWithCourse, b: TaskWithCourse) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  };

  buckets.overdue.sort(sortByDue);
  buckets.today.sort(sortByDue);
  buckets.thisWeek.sort(sortByDue);
  buckets.later.sort(sortByDue);

  return buckets;
}

/**
 * Group tasks by day for the week view.
 */
export function groupTasksByDay(
  tasks: TaskWithCourse[],
): Map<string, TaskWithCourse[]> {
  const groups = new Map<string, TaskWithCourse[]>();
  for (const task of tasks) {
    const key = task.dueDate
      ? new Date(task.dueDate).toISOString().slice(0, 10)
      : "no-date";
    const list = groups.get(key) ?? [];
    list.push(task);
    groups.set(key, list);
  }
  return groups;
}

/**
 * Get a deterministic chart color variable for a course.
 */
const COURSE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function getCourseColor(
  courseId: string | null,
  courseColor: string | null,
): string {
  if (courseColor) return courseColor;
  if (!courseId) return COURSE_COLORS[0];
  // Simple hash to pick a consistent color
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = (hash * 31 + courseId.charCodeAt(i)) | 0;
  }
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
}

/**
 * Get the start of a week (Monday) for a given date.
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get array of 7 dates for a week starting from Monday.
 */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/**
 * Format a date as a short day label (e.g., "Mon 24").
 */
export function formatDayLabel(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[date.getDay()]} ${date.getDate()}`;
}

/**
 * Check if two dates are the same calendar day.
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
