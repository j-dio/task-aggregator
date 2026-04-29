"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { mapRow } from "@/lib/task-mapper";
import type { TaskWithCourse } from "@/types/task";

/** Matches the courses(*) sub-select inside tasks!inner. */
interface HistoryCourseRow {
  id: string;
  user_id: string;
  source: string;
  external_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

/** Matches the tasks!inner(*, courses(*)) sub-select. */
interface HistoryTaskRow {
  id: string;
  user_id: string;
  course_id: string | null;
  source: string;
  external_id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  due_date: string | null;
  url: string | null;
  metadata: Record<string, unknown>;
  is_custom: boolean;
  fetched_at: string;
  created_at: string;
  updated_at: string;
  courses: HistoryCourseRow | null;
}

/** Matches one row returned by: .from("task_overrides").select("*, tasks!inner(*, courses(*))") */
interface HistoryOverrideRow {
  id: string;
  user_id: string;
  task_id: string;
  custom_status: string | null;
  priority: string | null;
  notes: string | null;
  reminder_at: string | null;
  created_at: string;
  updated_at: string;
  tasks: HistoryTaskRow;
}

async function fetchHistoryTasks(): Promise<TaskWithCourse[]> {
  const supabase = createClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Query from task_overrides so the filters are on the main table's columns —
  // filtering on embedded resource columns via .eq("task_overrides.xxx") is
  // unreliable in the Supabase JS client and would silently drop valid rows.
  const { data, error } = await supabase
    .from("task_overrides")
    .select("*, tasks!inner(*, courses(*))")
    .eq("custom_status", "dismissed")
    .gte("updated_at", cutoff)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as HistoryOverrideRow[];
  return rows.map((row) => {
    // Reconstruct the shape that mapRow expects:
    // { ...task fields, courses: {...}, task_overrides: [override] }
    const syntheticRow: Record<string, unknown> = {
      ...row.tasks,
      task_overrides: [row],
    };
    return mapRow(syntheticRow);
  });
}

export function useHistoryTasks() {
  return useQuery({
    queryKey: ["history-tasks"],
    queryFn: fetchHistoryTasks,
  });
}
