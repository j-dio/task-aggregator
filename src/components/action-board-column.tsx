"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type {
  TaskWithCourse,
  ActionBoardColumn as ColumnId,
} from "@/types/task";
import { SortableTaskCard } from "@/components/sortable-task-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ListCheck,
  ListTodo,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const columnIcons: Record<ColumnId, LucideIcon> = {
  todo: ListTodo,
  in_progress: Clock,
  done: CheckCircle2,
};

const columnAccentBg: Record<ColumnId, string> = {
  todo: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning",
  done: "bg-success/10 text-success",
};

// ---- Per-column empty state ------------------------------------------------

interface ColumnEmptyStateProps {
  id: ColumnId;
  todoWindowDays?: number;
}

function ColumnEmptyState({ id, todoWindowDays }: ColumnEmptyStateProps) {
  const config = {
    todo: {
      icon: ListTodo,
      title: "All caught up!",
      description: `No tasks due in the next ${todoWindowDays ?? 14} days.`,
    },
    in_progress: {
      icon: Clock,
      title: "Nothing in progress",
      description: "Drag tasks here or mark one as in progress.",
    },
    done: {
      icon: ListCheck,
      title: "Nothing done yet",
      description: "Drag tasks here or mark them as done.",
    },
  }[id];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-border/60 p-6 text-center">
      <div className={cn("flex size-9 items-center justify-center rounded-full", columnAccentBg[id])}>
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground/70">{config.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground/70">{config.description}</p>
      </div>
    </div>
  );
}

interface ActionBoardColumnProps {
  id: ColumnId;
  title: string;
  tasks: TaskWithCourse[];
  /** Full bucket count (may exceed `tasks.length` when the list is windowed). */
  taskTotal: number;
  accentClass: string;
  /** Show More callback — provided when more tasks exist beyond the current window. */
  onShowMore?: () => void;
  /** Show Less callback — provided when the window is larger than the minimum. */
  onShowLess?: () => void;
  /** Label for the Show More button (e.g. "Next 14d" or "Show 5 more"). */
  showMoreLabel?: string;
  /** Current To Do window in days (used for the empty state description). */
  todoWindowDays?: number;
  /** Callback to dismiss all tasks in this column (used for Done column). */
  onDismissAll?: () => void;
  /** Whether the dismiss-all mutation is currently pending. */
  isDismissAllPending?: boolean;
  onRequestEditCustomTask?: (task: TaskWithCourse) => void;
}

export function ActionBoardColumn({
  id,
  title,
  tasks,
  taskTotal,
  onShowMore,
  onShowLess,
  showMoreLabel,
  todoWindowDays,
  onDismissAll,
  isDismissAllPending,
  onRequestEditCustomTask,
}: ActionBoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const Icon = columnIcons[id];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "skeu-column flex w-70 shrink-0 flex-col rounded-2xl p-3 transition-all duration-200 lg:min-w-60 lg:flex-1",
        isOver && "skeu-column-over",
      )}
    >
      {/* Column header */}
      <div className="mb-3 flex min-h-8 items-center gap-2 px-0.5">
        <div className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", columnAccentBg[id])}>
          <Icon className="size-3.5" />
        </div>
        <span className="text-sm font-bold tracking-tight">{title}</span>
        {id === "done" && onDismissAll && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            disabled={taskTotal === 0 || isDismissAllPending}
            onClick={onDismissAll}
          >
            Dismiss all
          </Button>
        )}
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
            columnAccentBg[id],
            !(id === "done" && onDismissAll) && "ml-auto",
          )}
        >
          {taskTotal}
        </span>
      </div>

      {/* Column body */}
      <div className="flex-1 overflow-y-auto">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="min-h-25 space-y-2.5">
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onRequestEditCustomTask={onRequestEditCustomTask}
              />
            ))}
            {tasks.length === 0 && (
              <ColumnEmptyState id={id} todoWindowDays={todoWindowDays} />
            )}
          </div>
        </SortableContext>

        {(onShowLess || onShowMore) && (
          <div className="mt-3 flex gap-1.5 pb-1">
            {onShowLess && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 flex-1 justify-center rounded-lg px-3 text-xs text-muted-foreground hover:text-foreground"
                onClick={onShowLess}
              >
                <ChevronUp className="mr-1 size-3" />
                Show less
              </Button>
            )}
            {onShowMore && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 flex-1 justify-center rounded-lg px-3 text-xs text-muted-foreground hover:text-foreground"
                onClick={onShowMore}
              >
                <ChevronDown className="mr-1 size-3" />
                {showMoreLabel ?? "Show more"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
