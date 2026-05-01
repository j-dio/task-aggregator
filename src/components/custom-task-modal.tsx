"use client";

import { useState, useCallback } from "react";
import type { TaskWithCourse, TaskType, TaskPriority } from "@/types/task";
import { useCourses } from "@/hooks/use-courses";
import { useTappers } from "@/hooks/use-tappers";
import { useTaskActions } from "@/hooks/use-task-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { dueDateAndTimeToIso, isoToLocalDueParts } from "@/lib/due-date-input";

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
  { value: "exam", label: "Exam" },
  { value: "event", label: "Event" },
  { value: "announcement", label: "Announcement" },
];

const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export interface CustomTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, opens in edit mode for this custom task. */
  task?: TaskWithCourse;
}

interface FormState {
  title: string;
  description: string;
  dueDatePart: string;
  /** From `input type="time"`; empty = end of that local day. */
  dueTimePart: string;
  type: TaskType;
  priority: TaskPriority | "none";
  courseId: string;
  /** Create flow only: master toggle for sharing with tappers */
  shareWithTappers: boolean;
  /** Tapper user IDs selected when sharing is enabled */
  selectedShareUserIds: string[];
}

function buildInitialForm(
  task: TaskWithCourse | undefined,
  isEdit: boolean,
): FormState {
  if (isEdit && task) {
    const { date, time } = isoToLocalDueParts(task.dueDate);
    return {
      title: task.title,
      description: task.description ?? "",
      dueDatePart: date,
      dueTimePart: time,
      type: task.type,
      priority: task.priority ?? "none",
      courseId: task.courseId ?? "none",
      shareWithTappers: false,
      selectedShareUserIds: [],
    };
  }
  return {
    title: "",
    description: "",
    dueDatePart: "",
    dueTimePart: "",
    type: "assignment",
    priority: "none",
    courseId: "none",
    shareWithTappers: false,
    selectedShareUserIds: [],
  };
}

// ---------------------------------------------------------------------------
// Inner form — receives props, initialises state lazily, never needs an effect.
// The parent mounts a fresh instance via `key` whenever the dialog reopens.
// ---------------------------------------------------------------------------

interface TaskFormContentProps {
  isEdit: boolean;
  task: TaskWithCourse | undefined;
  onClose: () => void;
}

function tapperInitial(displayName: string): string {
  const t = displayName.trim();
  if (!t) return "?";
  return t[0]!.toUpperCase();
}

function TaskFormContent({ isEdit, task, onClose }: TaskFormContentProps) {
  const { data: courses } = useCourses();
  const { tappers } = useTappers();
  const { createTask, editTask } = useTaskActions();

  // Lazy initialiser runs only on mount — no useEffect required.
  const [form, setForm] = useState<FormState>(() =>
    buildInitialForm(task, isEdit),
  );

  const isPending = createTask.isPending || editTask.isPending;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.title.trim()) return;

      const {
        title,
        description,
        dueDatePart,
        dueTimePart,
        type,
        priority,
        courseId,
        shareWithTappers,
        selectedShareUserIds,
      } = form;

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDateAndTimeToIso(dueDatePart, dueTimePart),
        type,
        priority: priority === "none" ? undefined : priority,
        courseId: courseId === "none" ? undefined : courseId,
      };

      if (isEdit && task) {
        editTask.mutate(
          {
            id: task.id,
            input: {
              ...payload,
              description: payload.description ?? null,
              dueDate: payload.dueDate ?? null,
              priority: (payload.priority ?? null) as TaskPriority | null,
              courseId: (payload.courseId ?? null) as string | null,
            },
          },
          { onSuccess: onClose },
        );
      } else {
        const createPayload =
          shareWithTappers && selectedShareUserIds.length > 0
            ? { ...payload, shareWith: selectedShareUserIds }
            : payload;
        createTask.mutate(createPayload, { onSuccess: onClose });
      }
    },
    [form, isEdit, task, createTask, editTask, onClose],
  );

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <label
          htmlFor="ct-title"
          className="text-muted-foreground text-xs font-medium"
        >
          Title <span className="text-destructive">*</span>
        </label>
        <Input
          id="ct-title"
          value={form.title}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Task title"
          required
          autoFocus
        />
      </div>

      {/* Due date + optional typed time (native time input) */}
      <div className="space-y-1.5">
        <span className="text-muted-foreground text-xs font-medium">
          Due date &amp; time
        </span>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Input
            id="ct-due-date"
            type="date"
            className="min-w-0 flex-1"
            value={form.dueDatePart}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, dueDatePart: e.target.value }))
            }
          />
          <Input
            id="ct-due-time"
            type="time"
            className="w-29 shrink-0"
            value={form.dueTimePart}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, dueTimePart: e.target.value }))
            }
            aria-label="Due time (optional)"
          />
        </div>
        <p className="text-muted-foreground text-[11px] leading-snug">
          Time is optional. Leave it empty for no specific time — we use 11:59
          PM that day in your timezone.
        </p>
      </div>

      {/* Type + Priority row */}
      <div className="flex min-w-0 gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium">
            Type
          </label>
          <Select
            value={form.type}
            onValueChange={(v) =>
              setForm((prev) => ({ ...prev, type: v as TaskType }))
            }
          >
            <SelectTrigger className="h-9 w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium">
            Priority
          </label>
          <Select
            value={form.priority}
            onValueChange={(v) =>
              setForm((prev) => ({
                ...prev,
                priority: v as TaskPriority | "none",
              }))
            }
          >
            <SelectTrigger className="h-9 w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Course */}
      {courses && courses.length > 0 && (
        <div className="min-w-0 space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium">
            Course
          </label>
          <Select
            value={form.courseId}
            onValueChange={(v) => setForm((prev) => ({ ...prev, courseId: v }))}
          >
            <SelectTrigger className="h-9 w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-w-[calc(100vw-2rem)]">
              <SelectItem value="none">No course (personal)</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="block truncate">{c.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Share with tappers (create only) */}
      {!isEdit && tappers.length > 0 && (
        <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3">
          <div className="flex items-start gap-2">
            <input
              id="ct-share-master"
              type="checkbox"
              className="border-input text-[#6e1d2a] focus-visible:ring-ring mt-0.5 h-4 w-4 shrink-0 rounded border shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              checked={form.shareWithTappers}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  shareWithTappers: e.target.checked,
                  selectedShareUserIds: e.target.checked
                    ? prev.selectedShareUserIds
                    : [],
                }))
              }
            />
            <label
              htmlFor="ct-share-master"
              className="text-sm leading-snug font-medium"
            >
              Share with tappers
            </label>
          </div>

          {form.shareWithTappers && (
            <div className="space-y-2 pl-6">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">
                  Choose who can see this task
                </span>
                <button
                  type="button"
                  className="text-primary text-xs font-medium underline-offset-2 hover:underline"
                  onClick={() => {
                    const allIds = tappers.map((t) => t.userId);
                    setForm((prev) => {
                      const allSelected =
                        allIds.length > 0 &&
                        allIds.every((id) =>
                          prev.selectedShareUserIds.includes(id),
                        );
                      return {
                        ...prev,
                        selectedShareUserIds: allSelected ? [] : [...allIds],
                      };
                    });
                  }}
                >
                  {tappers.length > 0 &&
                  tappers.every((t) =>
                    form.selectedShareUserIds.includes(t.userId),
                  )
                    ? "Deselect all"
                    : "Select all"}
                </button>
              </div>
              <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
                {tappers.map((tapper) => {
                  const id = `ct-share-${tapper.userId}`;
                  const checked = form.selectedShareUserIds.includes(
                    tapper.userId,
                  );
                  return (
                    <li key={tapper.userId}>
                      <div className="flex items-center gap-2">
                        <input
                          id={id}
                          type="checkbox"
                          className="border-input text-[#6e1d2a] focus-visible:ring-ring h-4 w-4 shrink-0 rounded border shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                          checked={checked}
                          onChange={() => {
                            setForm((prev) => {
                              const has = prev.selectedShareUserIds.includes(
                                tapper.userId,
                              );
                              const next = has
                                ? prev.selectedShareUserIds.filter(
                                    (x) => x !== tapper.userId,
                                  )
                                : [...prev.selectedShareUserIds, tapper.userId];
                              return {
                                ...prev,
                                selectedShareUserIds: next,
                              };
                            });
                          }}
                        />
                        <label
                          htmlFor={id}
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm"
                        >
                          <span
                            className="bg-primary/15 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                            aria-hidden
                          >
                            {tapperInitial(tapper.displayName)}
                          </span>
                          <span className="truncate">{tapper.displayName}</span>
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <div className="space-y-1.5">
        <label
          htmlFor="ct-desc"
          className="text-muted-foreground text-xs font-medium"
        >
          Description
        </label>
        <textarea
          id="ct-desc"
          className="border-input bg-background min-h-20 w-full rounded-md border p-2 text-sm"
          value={form.description}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Optional notes or description..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="bg-[#6e1d2a] text-white hover:bg-[#5b1722]"
          disabled={isPending || !form.title.trim()}
        >
          {isPending ? "Saving..." : isEdit ? "Save changes" : "Create task"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Public modal shell
// ---------------------------------------------------------------------------

export function CustomTaskModal({
  open,
  onOpenChange,
  task,
}: CustomTaskModalProps) {
  const isEdit = !!task?.isCustom;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md min-w-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>

        {/*
         * Conditional render + `key` together ensure TaskFormContent is fully
         * unmounted when the dialog closes and remounted fresh when it reopens
         * (or when a different task is passed for editing). This means the lazy
         * useState initialiser re-runs on every open — no useEffect needed.
         */}
        {open && (
          <TaskFormContent
            key={task?.id ?? "new"}
            isEdit={isEdit}
            task={task}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
