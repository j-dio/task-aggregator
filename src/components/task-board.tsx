"use client";

import type { TaskWithCourse } from "@/types/task";
import { groupTasksByUrgency, cn } from "@/lib/utils";
import { TaskCard } from "@/components/task-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Clock, CalendarDays, CalendarRange } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface TaskBoardProps {
  tasks: TaskWithCourse[];
}

interface ColumnDef {
  key: string;
  label: string;
  icon: LucideIcon;
  accentClass: string;
}

const columns: ColumnDef[] = [
  {
    key: "overdue",
    label: "Overdue",
    icon: AlertTriangle,
    accentClass: "text-destructive",
  },
  {
    key: "today",
    label: "Due Today",
    icon: Clock,
    accentClass: "text-warning",
  },
  {
    key: "thisWeek",
    label: "This Week",
    icon: CalendarDays,
    accentClass: "text-info",
  },
  {
    key: "later",
    label: "Later",
    icon: CalendarRange,
    accentClass: "text-muted-foreground",
  },
];

export function TaskBoard({ tasks }: TaskBoardProps) {
  const buckets = groupTasksByUrgency(tasks);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:-mx-0 lg:px-0">
      {columns.map((col) => {
        const items =
          buckets[col.key as keyof typeof buckets] ?? [];
        return (
          <div
            key={col.key}
            className="flex w-[280px] shrink-0 flex-col lg:flex-1 lg:min-w-[240px]"
          >
            {/* Column header */}
            <div className="mb-3 flex items-center gap-2">
              <col.icon className={cn("size-4", col.accentClass)} />
              <span className="text-sm font-semibold">{col.label}</span>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {items.length}
              </span>
            </div>

            {/* Column body */}
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {items.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                    No tasks
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
