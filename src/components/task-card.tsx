"use client";

import { useState } from "react";
import type { TaskWithCourse } from "@/types/task";
import { getTaskUrgency, cn } from "@/lib/utils";
import { CourseBadge } from "@/components/course-badge";
import { CountdownBadge } from "@/components/countdown-badge";
import { SourceIcon } from "@/components/source-icon";
import { Badge } from "@/components/ui/badge";
import { TaskDetailModal } from "@/components/task-detail-modal";

interface TaskCardProps {
  task: TaskWithCourse;
}

const urgencyBorder: Record<string, string> = {
  overdue: "border-l-destructive",
  urgent: "border-l-warning",
  soon: "border-l-info",
  upcoming: "border-l-border",
  later: "border-l-border",
  none: "border-l-border",
};

export function TaskCard({ task }: TaskCardProps) {
  const [open, setOpen] = useState(false);
  const urgency = getTaskUrgency(task.dueDate);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full rounded-lg border border-l-[3px] bg-card p-3 text-left transition-colors hover:bg-accent/50",
          urgencyBorder[urgency],
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium leading-snug line-clamp-2">
            {task.title}
          </span>
          <SourceIcon source={task.source} />
        </div>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <CourseBadge course={task.course} />
          {task.type !== "assignment" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {task.type}
            </Badge>
          )}
          <CountdownBadge dueDate={task.dueDate} className="ml-auto" />
        </div>
      </button>

      <TaskDetailModal task={task} open={open} onOpenChange={setOpen} />
    </>
  );
}
