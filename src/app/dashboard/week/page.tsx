"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { useTasks, type TaskFilters } from "@/hooks/use-tasks";
import { useCourses } from "@/hooks/use-courses";
import { TaskList } from "@/components/task-list";
import { TaskFilters as FilterBar } from "@/components/task-filters";
import { SyncButton } from "@/components/sync-button";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getWeekStart,
  getWeekDays,
  formatDayLabel,
  isSameDay,
  cn,
} from "@/lib/utils";
import type { TaskWithCourse } from "@/types/task";

function WeekViewContent() {
  const searchParams = useSearchParams();
  const [weekOffset, setWeekOffset] = useState(0);

  const filters: TaskFilters = {};
  const source = searchParams.get("source");
  const type = searchParams.get("type");
  const course = searchParams.get("course");
  if (source && source !== "all")
    filters.source = source as TaskFilters["source"];
  if (type && type !== "all") filters.type = type as TaskFilters["type"];
  if (course && course !== "all") filters.courseId = course;

  const { data: tasks, isLoading } = useTasks(filters);
  const { data: courses } = useCourses();

  const today = new Date();
  const baseDate = new Date(today);
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekStart = getWeekStart(baseDate);
  const days = getWeekDays(weekStart);

  // Group tasks by day
  function getTasksForDay(
    day: Date,
    allTasks: TaskWithCourse[],
  ): TaskWithCourse[] {
    return allTasks.filter((t) => {
      if (!t.dueDate) return false;
      return isSameDay(new Date(t.dueDate), day);
    });
  }

  const weekLabel = `${days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${days[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Week</h1>
          <p className="text-muted-foreground text-sm">Tasks grouped by day.</p>
        </div>
        <div className="hidden lg:block">
          <SyncButton />
        </div>
      </div>

      {/* Filters */}
      <FilterBar courses={courses ?? []} />

      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setWeekOffset((o) => o - 1)}
          aria-label="Previous week"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-35 text-center text-sm font-medium">
          {weekLabel}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setWeekOffset((o) => o + 1)}
          aria-label="Next week"
        >
          <ChevronRight className="size-4" />
        </Button>
        {weekOffset !== 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekOffset(0)}
            className="text-xs"
          >
            This week
          </Button>
        )}
      </div>

      {/* Day columns */}
      {isLoading ? (
        <div className="flex gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 space-y-3">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <ScrollArea className="-mx-4 px-4 lg:mx-0 lg:px-0">
          <div className="flex min-w-max gap-3 pb-4 lg:min-w-0">
            {days.map((day) => {
              const dayTasks = getTasksForDay(day, tasks ?? []);
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={day.toISOString()}
                  className={cn("w-55 shrink-0 lg:min-w-40 lg:flex-1")}
                >
                  {/* Day header */}
                  <div
                    className={cn(
                      "mb-2 flex items-center gap-1.5 text-sm font-medium",
                      isToday ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <span>{formatDayLabel(day)}</span>
                    {dayTasks.length > 0 && (
                      <span className="bg-muted rounded-full px-1.5 py-0.5 text-[10px]">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Tasks */}
                  {dayTasks.length > 0 ? (
                    <TaskList tasks={dayTasks} />
                  ) : (
                    <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs">
                      —
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {!isLoading && (!tasks || tasks.length === 0) && (
        <EmptyState
          icon={CalendarRange}
          title="No tasks this week"
          description="Tasks will show up here once you sync from your sources."
        />
      )}
    </div>
  );
}

export default function WeekPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <Skeleton className="h-10 w-32" />
          <div className="flex gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 space-y-3">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <WeekViewContent />
    </Suspense>
  );
}
