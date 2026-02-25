"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Course, TaskSource } from "@/types/task";

function mapRow(row: Record<string, unknown>): Course {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    source: row.source as TaskSource,
    externalId: row.external_id as string,
    name: row.name as string,
    shortName: null,
    instructor: null,
    color: (row.color as string) ?? null,
    isArchived: false,
    createdAt: (row.created_at as string) ?? "",
  };
}

async function fetchCourses(): Promise<Course[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
    staleTime: 5 * 60_000,
  });
}
