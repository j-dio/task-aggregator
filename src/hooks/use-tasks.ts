"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { TaskWithCourse, TaskSource } from "@/types/task";
import { mapRow } from "@/lib/task-mapper";

/**
 * Default forward window for `due_date` fetches. Must cover calendar navigation
 * and long-range custom / adopted tasks (action board still buckets by its own
 * shorter To Do window client-side).
 */
export const DEFAULT_TASK_LATER_WINDOW_DAYS = 365 * 6;

export interface TaskFilters {
  source?: TaskSource;
  courseId?: string;
  /** How many days back to include overdue tasks (default 30) */
  overdueWindowDays?: number;
  /** How many days ahead to include future-due tasks (default ~6 years) */
  laterWindowDays?: number;
}

async function fetchTasks(filters: TaskFilters): Promise<TaskWithCourse[]> {
  const supabase = createClient();

  // Compute date window boundaries
  const overdueFloor = new Date();
  overdueFloor.setDate(
    overdueFloor.getDate() - (filters.overdueWindowDays ?? 30),
  );
  const laterCeiling = new Date();
  laterCeiling.setDate(
    laterCeiling.getDate() +
      (filters.laterWindowDays ?? DEFAULT_TASK_LATER_WINDOW_DAYS),
  );

  // Try with task_overrides join first; fall back without if the table/FK is missing
  let selectStr = "*, courses(*), task_overrides(*)";
  let query = supabase
    .from("tasks")
    .select(selectStr)
    .order("due_date", { ascending: true, nullsFirst: false });

  // Apply date window: include null due_date, and constrain known dates to the window
  query = query.or(
    `due_date.is.null,and(due_date.gte.${overdueFloor.toISOString()},due_date.lte.${laterCeiling.toISOString()})`,
  );

  if (filters.source) {
    query = query.eq("source", filters.source);
  }
  if (filters.courseId) {
    query = query.eq("course_id", filters.courseId);
  }

  let result = await query;

  // PGRST200: relationship not found — retry without task_overrides
  if (result.error && result.error.code === "PGRST200") {
    selectStr = "*, courses(*)";
    let fallbackQuery = supabase
      .from("tasks")
      .select(selectStr)
      .order("due_date", { ascending: true, nullsFirst: false });

    fallbackQuery = fallbackQuery.or(
      `due_date.is.null,and(due_date.gte.${overdueFloor.toISOString()},due_date.lte.${laterCeiling.toISOString()})`,
    );

    if (filters.source)
      fallbackQuery = fallbackQuery.eq("source", filters.source);
    if (filters.courseId)
      fallbackQuery = fallbackQuery.eq("course_id", filters.courseId);

    result = await fallbackQuery;
  }

  if (result.error) throw result.error;

  const rows = (result.data ?? []) as unknown as Record<string, unknown>[];
  return rows.map(mapRow);
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => fetchTasks(filters),
    // Use global QueryProvider defaults (5 min staleTime, no refetchOnWindowFocus)
    // to avoid load spikes at scale — do not override here
  });
}
