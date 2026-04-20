"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Course } from "@/types/task";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskFiltersProps {
  courses: Course[];
}

export function TaskFilters({ courses }: TaskFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSource = searchParams.get("source") ?? "all";
  const currentCourse = searchParams.get("course") ?? "all";

  const setFilter = useCallback(
    (key: "source" | "course", value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  // Drop legacy query keys so bookmarks and shared links match supported filters
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;
    for (const key of ["type", "status", "sort"] as const) {
      if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    }
    if (!changed) return;
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [router, searchParams]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={currentSource}
        onValueChange={(v) => setFilter("source", v)}
      >
        <SelectTrigger className="h-8 w-32.5 text-xs">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          <SelectItem value="uvec">UVEC</SelectItem>
          <SelectItem value="gclassroom">Classroom</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      {courses.length > 0 && (
        <Select
          value={currentCourse}
          onValueChange={(v) => setFilter("course", v)}
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
