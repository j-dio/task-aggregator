"use client";

import type { TaskWithCourse } from "@/types/task";
import { getTaskUrgency, cn } from "@/lib/utils";
import { CourseBadge } from "@/components/course-badge";
import { CountdownBadge } from "@/components/countdown-badge";
import { SourceIcon } from "@/components/source-icon";

const urgencyBorder: Record<string, string> = {
  overdue: "border-l-destructive",
  urgent: "border-l-warning",
  soon: "border-l-info",
  upcoming: "border-l-border",
  later: "border-l-border",
  none: "border-l-border",
};

const urgencyGlow: Record<string, string> = {
  overdue: "before:bg-destructive/5",
  urgent: "before:bg-warning/5",
  soon: "before:bg-info/5",
  upcoming: "",
  later: "",
  none: "",
};

interface TaskCardOverlayProps {
  task: TaskWithCourse;
}

export function TaskCardOverlay({ task }: TaskCardOverlayProps) {
  const urgency = getTaskUrgency(task.dueDate);

  return (
    <div
      className={cn(
        "skeu-card relative rounded-[14px] border-l-[3px] overflow-hidden",
        urgencyBorder[urgency],
        (task.status === "done" || task.status === "dismissed") && "opacity-60",
      )}
    >
      {(urgency === "overdue" || urgency === "urgent" || urgency === "soon") && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-100",
            urgencyGlow[urgency],
          )}
        />
      )}
      <SourceIcon source={task.source} className="absolute right-2.5 bottom-2.5 opacity-30" />
      <div className="w-full pl-3.5 pr-8 pt-3 pb-3.5">
        <span
          className={cn(
            "line-clamp-2 block text-[13px] leading-[1.45] font-medium tracking-[-0.01em]",
            (task.status === "done" || task.status === "dismissed") &&
              "line-through text-muted-foreground decoration-muted-foreground/70 decoration-2",
          )}
        >
          {task.title}
        </span>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <CourseBadge course={task.course} />
          <CountdownBadge dueDate={task.dueDate} />
        </div>
      </div>
    </div>
  );
}
