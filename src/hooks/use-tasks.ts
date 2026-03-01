"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type {
  TaskWithCourse,
  TaskSource,
  TaskType,
  TaskStatus,
} from "@/types/task";

export interface TaskFilters {
  source?: TaskSource;
  type?: TaskType;
  courseId?: string;
  status?: string;
}

function mapRow(row: Record<string, unknown>): TaskWithCourse {
  const course = row.courses as Record<string, unknown> | null;
  return {
    id: row.id as string,
    userId: row.user_id as string,
    courseId: (row.course_id as string) ?? null,
    source: row.source as TaskSource,
    externalId: row.external_id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    type: (row.type as TaskType) ?? "assignment",
    status: ((row.status as string) ?? "pending") as TaskStatus,
    dueDate: (row.due_date as string) ?? null,
    url: (row.url as string) ?? null,
    metadata: {},
    fetchedAt: (row.updated_at as string) ?? "",
    createdAt: (row.created_at as string) ?? "",
    updatedAt: (row.updated_at as string) ?? "",
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

async function fetchTasks(filters: TaskFilters): Promise<TaskWithCourse[]> {
  const supabase = createClient();
  let query = supabase
    .from("tasks")
    .select("*, courses(*)")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (filters.source) {
    query = query.eq("source", filters.source);
  }
  if (filters.type) {
    query = query.eq("type", filters.type);
  }
  if (filters.courseId) {
    query = query.eq("course_id", filters.courseId);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => fetchTasks(filters),
    // Use global QueryProvider defaults (5 min staleTime, no refetchOnWindowFocus)
    // to avoid load spikes at scale — do not override here
  });
}
