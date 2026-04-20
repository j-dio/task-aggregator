"use client";

import { useState, useCallback } from "react";
import type { TaskWithCourse } from "@/types/task";
import { formatRelativeDate, getTaskUrgency, cn } from "@/lib/utils";
import { CourseBadge } from "@/components/course-badge";
import { SourceIcon } from "@/components/source-icon";
import { TaskActions } from "@/components/task-actions";
import { useTaskActions } from "@/hooks/use-task-actions";
import {
  SHARED_TASK_ADOPT_PENDING,
  useTapperActions,
} from "@/hooks/use-tapper-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Clock } from "lucide-react";
import { toast } from "sonner";

export type TaskDetailModalMode = "edit" | "preview";

interface TaskDetailModalProps {
  task: TaskWithCourse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens the custom task editor modal; pass the same `task` the user is viewing. */
  onRequestEditCustomTask?: (task: TaskWithCourse) => void;
  /**
   * `edit` — full detail with status, priority, notes (default).
   * `preview` — read-only shared task; use `sharedTaskId` + tapper actions.
   */
  mode?: TaskDetailModalMode;
  /** Required in preview mode for adopt / dismiss. */
  sharedTaskId?: string;
  /** Shown in preview header when set (e.g. sharer display name). */
  senderName?: string;
  /** From shared feed row; non-null means already on the recipient's board. */
  addedTaskId?: string | null;
}

const urgencyLabel: Record<string, string> = {
  overdue: "Overdue",
  urgent: "Due today",
  soon: "Due soon",
  upcoming: "Upcoming",
  later: "Later",
  none: "No due date",
};

export function TaskDetailModal({
  task,
  open,
  onOpenChange,
  onRequestEditCustomTask,
  mode = "edit",
  sharedTaskId,
  senderName,
  addedTaskId = null,
}: TaskDetailModalProps) {
  const isPreview = mode === "preview";
  const urgency = getTaskUrgency(task.dueDate);
  const { setNotes } = useTaskActions();
  const { adoptSharedTask, dismissSharedTask } = useTapperActions();

  const [adoptSuccess, setAdoptSuccess] = useState(false);

  // Notes draft is owned here so the modal can detect pending changes and
  // handle Enter: save if notes changed, close otherwise.
  const [notesDraft, setNotesDraft] = useState(task.notes ?? "");

  // Reset draft when the modal opens with a (possibly updated) task.
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setNotesDraft(task.notes ?? "");
      }
      onOpenChange(nextOpen);
    },
    [task.notes, onOpenChange],
  );

  const hasPendingNotes = notesDraft.trim() !== (task.notes ?? "").trim();

  const handleSaveNotes = useCallback(() => {
    const trimmedNotes = notesDraft.trim();
    setNotes.mutate(
      { taskId: task.id, notes: trimmedNotes || null },
      { onSuccess: () => onOpenChange(false) },
    );
  }, [notesDraft, setNotes, task.id, onOpenChange]);

  // Enter inside the modal: save notes if changed, otherwise close.
  const handleKeyDownEdit = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter") return;
      const target = event.target as HTMLElement;

      if (target instanceof HTMLTextAreaElement) {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          handleSaveNotes();
        }
        return;
      }

      if (
        target instanceof HTMLButtonElement ||
        target instanceof HTMLAnchorElement
      ) {
        return;
      }

      if (target instanceof HTMLSelectElement) {
        event.preventDefault();
        target.blur();
        onOpenChange(false);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (hasPendingNotes) {
        handleSaveNotes();
      } else {
        onOpenChange(false);
      }
    },
    [hasPendingNotes, handleSaveNotes, onOpenChange],
  );

  const handleKeyDownPreview = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter") return;
      const target = event.target as HTMLElement;
      if (
        target instanceof HTMLButtonElement ||
        target instanceof HTMLAnchorElement
      ) {
        return;
      }
      event.preventDefault();
      onOpenChange(false);
    },
    [onOpenChange],
  );

  const adoptedFromFeed =
    addedTaskId != null && addedTaskId !== SHARED_TASK_ADOPT_PENDING;
  const isAdoptPending =
    addedTaskId === SHARED_TASK_ADOPT_PENDING ||
    (adoptSharedTask.isPending &&
      adoptSharedTask.variables === sharedTaskId);
  const effectiveAdopted = adoptSuccess || adoptedFromFeed;

  const isDismissPending =
    dismissSharedTask.isPending &&
    dismissSharedTask.variables === sharedTaskId;

  const handleAdopt = () => {
    if (!sharedTaskId) return;
    adoptSharedTask.mutate(sharedTaskId, {
      onSuccess: () => {
        toast.success("Added to your board!");
        setAdoptSuccess(true);
      },
    });
  };

  const handleDismiss = () => {
    if (!sharedTaskId) return;
    dismissSharedTask.mutate(sharedTaskId, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90svh] max-w-md overflow-y-auto"
        onKeyDown={isPreview ? handleKeyDownPreview : handleKeyDownEdit}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="text-muted-foreground mb-1 flex flex-wrap items-center gap-2">
            <SourceIcon source={task.source} />
            <span className="text-xs capitalize">
              {task.source === "gclassroom"
                ? "Google Classroom"
                : task.source === "custom"
                  ? "Custom"
                  : "UVEC"}
            </span>
            {isPreview && senderName && (
              <Badge
                variant="outline"
                className="text-muted-foreground border-border/80 text-[10px] font-normal"
              >
                Shared by {senderName}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-base">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <CourseBadge course={task.course} />
          <Badge variant="secondary" className="text-xs">
            {task.type}
          </Badge>
          {!isPreview && (
            <Badge
              variant={
                task.displayStatus === "overdue"
                  ? "destructive"
                  : task.status === "in_progress"
                    ? "default"
                    : "secondary"
              }
              className={cn(
                "text-xs",
                task.status === "in_progress" &&
                  "bg-warning text-warning-foreground",
              )}
            >
              {task.status === "in_progress"
                ? "in progress"
                : (task.displayStatus ?? task.status)}
            </Badge>
          )}
        </div>

        {task.dueDate && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="text-muted-foreground size-4" />
            <span>
              {new Date(task.dueDate).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <span
              className={
                urgency === "overdue"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }
            >
              ({urgencyLabel[urgency]} &middot;{" "}
              {formatRelativeDate(new Date(task.dueDate))})
            </span>
          </div>
        )}

        {task.description && (
          <>
            <Separator />
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">
              {task.description}
            </p>
          </>
        )}

        <Separator />

        {isPreview ? (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-[#6e1d2a] text-white hover:bg-[#5b1722]"
              disabled={
                !sharedTaskId ||
                effectiveAdopted ||
                isAdoptPending ||
                isDismissPending
              }
              onClick={handleAdopt}
            >
              {isAdoptPending
                ? "Adding…"
                : effectiveAdopted
                  ? "Added ✓"
                  : "Add to my tasks"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground h-8"
              disabled={!sharedTaskId || isAdoptPending || isDismissPending}
              onClick={handleDismiss}
            >
              Dismiss
            </Button>
          </div>
        ) : (
          <TaskActions
            task={task}
            notesDraft={notesDraft}
            onNotesDraftChange={setNotesDraft}
            onSaveNotes={handleSaveNotes}
            onEditCustomTask={
              task.isCustom && onRequestEditCustomTask
                ? () => {
                    onRequestEditCustomTask(task);
                    onOpenChange(false);
                  }
                : undefined
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
