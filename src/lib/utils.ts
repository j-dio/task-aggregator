import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
