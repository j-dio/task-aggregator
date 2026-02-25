"use client";

import { useCallback } from "react";
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
  const currentType = searchParams.get("type") ?? "all";
  const currentCourse = searchParams.get("course") ?? "all";

  const setFilter = useCallback(
    (key: string, value: string) => {
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={currentSource} onValueChange={(v) => setFilter("source", v)}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          <SelectItem value="uvec">UVEC</SelectItem>
          <SelectItem value="gclassroom">Classroom</SelectItem>
        </SelectContent>
      </Select>

      <Select value={currentType} onValueChange={(v) => setFilter("type", v)}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="assignment">Assignment</SelectItem>
          <SelectItem value="quiz">Quiz</SelectItem>
          <SelectItem value="exam">Exam</SelectItem>
          <SelectItem value="event">Event</SelectItem>
        </SelectContent>
      </Select>

      {courses.length > 0 && (
        <Select
          value={currentCourse}
          onValueChange={(v) => setFilter("course", v)}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
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
