"use client";

import { memo, useState } from "react";
import { Archive, Circle, Clock, GripVertical } from "lucide-react";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { TaskWithCourse } from "@/types/task";
import { getTaskUrgency, cn } from "@/lib/utils";
import { CourseBadge } from "@/components/course-badge";
import { CountdownBadge } from "@/components/countdown-badge";
import { SourceIcon } from "@/components/source-icon";
import { TaskDetailModal } from "@/components/task-detail-modal";
import { useTaskActions } from "@/hooks/use-task-actions";

interface TaskCardProps {
  task: TaskWithCourse;
  isDragging?: boolean;
  compact?: boolean;
  onModalOpenChange?: (open: boolean) => void;
  dragHandleListeners?: SyntheticListenerMap;
  onRequestEditCustomTask?: (task: TaskWithCourse) => void;
}

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


interface TaskCardQuickActionsProps {
  task: TaskWithCourse;
}

const TaskCardQuickActions = memo(function TaskCardQuickActions({ task }: TaskCardQuickActionsProps) {
  const { setStatus } = useTaskActions();

  const handleQuickDoneOrDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.status === "done") {
      setStatus.mutate({ taskId: task.id, status: "dismissed" });
      return;
    }
    setStatus.mutate({ taskId: task.id, status: "done" });
  };

  const handleQuickInProgress = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === "in_progress" ? "pending" : "in_progress";
    setStatus.mutate({ taskId: task.id, status: newStatus });
  };

  return (
    <div className="absolute top-2.5 right-2.5 hidden items-center gap-0.5 opacity-0 transition-all duration-150 group-hover:opacity-100 lg:flex">
      <button
        type="button"
        onClick={handleQuickInProgress}
        className={cn(
          "flex size-6 items-center justify-center rounded-md transition-all duration-150",
          task.status === "in_progress"
            ? "bg-warning/15 text-warning"
            : "text-muted-foreground hover:bg-warning/12 hover:text-warning",
        )}
        aria-label={
          task.status === "in_progress"
            ? "Remove from in progress"
            : "Mark as in progress"
        }
      >
        <Clock className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={handleQuickDoneOrDismiss}
        className={cn(
          "flex size-6 items-center justify-center rounded-md transition-all duration-150",
          task.status === "done"
            ? "text-muted-foreground hover:bg-muted hover:text-foreground"
            : "text-muted-foreground hover:bg-success/12 hover:text-success",
        )}
        aria-label={
          task.status === "done"
            ? "Dismiss completed task"
            : "Mark as done"
        }
      >
        {task.status === "done" ? (
          <Archive className="size-3.5" />
        ) : (
          <Circle className="size-3.5" />
        )}
      </button>
    </div>
  );
});

export function TaskCard({
  task,
  isDragging,
  compact,
  onModalOpenChange,
  dragHandleListeners,
  onRequestEditCustomTask,
}: TaskCardProps) {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onModalOpenChange?.(nextOpen);
  };
  const urgency = getTaskUrgency(task.dueDate);

  return (
    <>
      <div
        className={cn(
          "group skeu-card relative rounded-[14px] border-l-[3px] overflow-hidden",
          urgencyBorder[urgency],
          isDragging && "opacity-15",
          (task.status === "done" || task.status === "dismissed") && "opacity-60",
        )}
      >
        {/* Subtle urgency tint strip */}
        {(urgency === "overdue" || urgency === "urgent" || urgency === "soon") && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 opacity-100",
              urgencyGlow[urgency],
            )}
          />
        )}

        {/* Desktop quick actions — desktop only, isolated so useTaskActions() is not called on mobile */}
        <TaskCardQuickActions task={task} />

        {/* Mobile drag handle — listeners are scoped here so the TouchSensor
            only activates from this element. touch-action:none confines
            scroll-blocking to the handle; the rest of the card scrolls freely.
            Hidden on desktop where the whole card is pointer-draggable. */}
        <div
          className="absolute top-2 right-2 flex size-6 items-center justify-center lg:hidden"
          style={{ touchAction: "none" }}
          data-dnd-drag-region="true"
          onClick={(e) => e.stopPropagation()}
          aria-label="Drag to reorder"
          {...(dragHandleListeners ?? {})}
        >
          <GripVertical className="size-4 text-muted-foreground/40" />
        </div>

        {/* Source type icon — bottom-right, very subtle */}
        <SourceIcon source={task.source} className="absolute right-2.5 bottom-2.5 opacity-30" />

        {/* Card content — clickable to open modal */}
        <button
          type="button"
          onClick={() => handleOpenChange(true)}
            className="w-full pl-3.5 pr-8 pt-3 pb-3.5 text-left lg:pr-14"
        >
          <span
            className={cn(
              "line-clamp-2 block text-[13px] leading-[1.45] font-medium tracking-[-0.01em]",
              (task.status === "done" || task.status === "dismissed") &&
                "line-through text-muted-foreground decoration-muted-foreground/70 decoration-2",
            )}
          >
            {task.title}
          </span>

          {!compact && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <CourseBadge course={task.course} />
              <CountdownBadge dueDate={task.dueDate} />
            </div>
          )}
        </button>
      </div>

      {open && (
        <TaskDetailModal
          task={task}
          open={open}
          onOpenChange={handleOpenChange}
          onRequestEditCustomTask={onRequestEditCustomTask}
        />
      )}
    </>
  );
}
