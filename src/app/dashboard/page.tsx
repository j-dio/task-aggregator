"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTasks, type TaskFilters } from "@/hooks/use-tasks";
import { useCourses } from "@/hooks/use-courses";
import { useSync } from "@/hooks/use-sync";
import { TaskBoard } from "@/components/task-board";
import { TaskFilters as FilterBar } from "@/components/task-filters";
import { SyncButton } from "@/components/sync-button";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList } from "lucide-react";

function TodayViewContent() {
  const searchParams = useSearchParams();
  const { mutate: sync } = useSync();

  const filters: TaskFilters = {};
  const source = searchParams.get("source");
  const type = searchParams.get("type");
  const course = searchParams.get("course");
  if (source && source !== "all")
    filters.source = source as TaskFilters["source"];
  if (type && type !== "all") filters.type = type as TaskFilters["type"];
  if (course && course !== "all") filters.courseId = course;

  const { data: tasks, isLoading: tasksLoading } = useTasks(filters);
  const { data: courses } = useCourses();

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Today</h1>
          <p className="text-sm text-muted-foreground">
            Your tasks organized by urgency.
          </p>
        </div>
        <div className="hidden lg:block">
          <SyncButton />
        </div>
      </div>

      {/* Filters */}
      <FilterBar courses={courses ?? []} />

      {/* Board */}
      {tasksLoading ? (
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      ) : tasks && tasks.length > 0 ? (
        <TaskBoard tasks={tasks} />
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No tasks yet"
          description="Connect UVEC or Google Classroom, then sync to pull in your tasks."
          action={{ label: "Sync now", onClick: () => sync() }}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-1 space-y-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <TodayViewContent />
    </Suspense>
  );
}
