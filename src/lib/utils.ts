import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TaskUrgency } from "@/types/task";

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
 * Generate a unique HSL color string for a course based on its ID.
 * Uses a hash-based hue with fixed saturation/lightness for consistent,
 * visually distinct colors that avoid the 5-color collision of the old palette.
 */
export function generateCourseColor(courseId: string): string {
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = (hash * 31 + courseId.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

/**
 * Get a deterministic chart color variable for a course.
 * Prefers persisted `courseColor`, falls back to HSL generation.
 */
export function getCourseColor(
  courseId: string | null,
  courseColor: string | null,
): string {
  if (courseColor) return courseColor;
  if (!courseId) return "hsl(0, 70%, 60%)";
  return generateCourseColor(courseId);
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
