"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Clock, Zap } from "lucide-react";
import type { TaskWithCourse } from "@/types/task";
import { formatRelativeDate, getTaskUrgency, cn } from "@/lib/utils";
import { CourseBadge } from "@/components/course-badge";
import { SourceIcon } from "@/components/source-icon";
import { Button } from "@/components/ui/button";
import { useTaskActions } from "@/hooks/use-task-actions";
import { TaskDetailModal } from "@/components/task-detail-modal";

interface UpNextWidgetProps {
  task: TaskWithCourse | null;
  onRequestEditCustomTask?: (task: TaskWithCourse) => void;
}

const urgencyGradient: Record<string, string> = {
  overdue: "from-destructive/20 to-destructive/5",
  urgent: "from-warning/20 to-warning/5",
  soon: "from-info/20 to-info/5",
  upcoming: "from-muted/20 to-muted/5",
  later: "from-muted/20 to-muted/5",
  none: "from-muted/20 to-muted/5",
};

export function UpNextWidget({
  task,
  onRequestEditCustomTask,
}: UpNextWidgetProps) {
  const { setStatus } = useTaskActions();
  const [modalOpen, setModalOpen] = useState(false);

  if (!task) {
    return (
      <div className="border-muted rounded-xl border-2 border-dashed p-6 text-center">
        <CheckCircle2 className="text-success mx-auto mb-2 size-8" />
        <p className="text-muted-foreground text-sm font-medium">
          All caught up! No urgent tasks.
        </p>
      </div>
    );
  }

  const urgency = getTaskUrgency(task.dueDate);
  const isInProgress = task.status === "in_progress";

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border-2 bg-linear-to-br p-5",
          urgencyGradient[urgency],
          isInProgress ? "border-warning" : "border-primary",
        )}
      >
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              isInProgress
                ? "bg-warning text-warning-foreground"
                : "bg-primary text-primary-foreground",
            )}
          >
            {isInProgress ? (
              <>
                <Clock className="size-3" />
                In Progress
              </>
            ) : (
              <>
                <Zap className="size-3" />
                Up Next
              </>
            )}
          </div>
          <SourceIcon source={task.source} className="ml-auto" />
        </div>

        {/* Task title */}
        <h3 className="mb-2 line-clamp-2 text-lg leading-tight font-semibold">
          {task.title}
        </h3>

        {/* Meta info */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <CourseBadge course={task.course} />
          {task.dueDate && (
            <span
              className={cn(
                "text-sm",
                urgency === "overdue"
                  ? "text-destructive font-medium"
                  : "text-muted-foreground",
              )}
            >
              {urgency === "overdue" ? "Overdue" : "Due"}{" "}
              {formatRelativeDate(new Date(task.dueDate))}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!isInProgress && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              aria-label="Start working on this task"
              onClick={() =>
                setStatus.mutate({
                  taskId: task.id,
                  status: "in_progress",
                })
              }
            >
              <Clock className="size-3.5" />
              Start
            </Button>
          )}
          <Button
            size="sm"
            variant={isInProgress ? "default" : "outline"}
            className={cn(
              "gap-1",
              isInProgress && "bg-success text-success-foreground",
            )}
            aria-label="Mark this task as done"
            onClick={() =>
              setStatus.mutate({ taskId: task.id, status: "done" })
            }
          >
            <CheckCircle2 className="size-3.5" />
            Done
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto gap-1"
            aria-label="View task details"
            onClick={() => setModalOpen(true)}
          >
            View
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <TaskDetailModal
        task={task}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onRequestEditCustomTask={onRequestEditCustomTask}
      />
    </>
  );
}
