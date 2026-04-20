"use client";

import { useMemo } from "react";
import type { TaskWithCourse } from "@/types/task";
import { useTaskActions } from "@/hooks/use-task-actions";
import { Button } from "@/components/ui/button";
import type { TaskPriority } from "@/types/task";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";

interface TaskActionsProps {
  task: TaskWithCourse;
  notesDraft: string;
  onNotesDraftChange: (value: string) => void;
  onSaveNotes: () => void;
  /** Opens the custom task editor (detail modal should close first). */
  onEditCustomTask?: () => void;
}

export function TaskActions({
  task,
  notesDraft,
  onNotesDraftChange,
  onSaveNotes,
  onEditCustomTask,
}: TaskActionsProps) {
  const { setStatus, setPriority, setNotes, deleteTask } = useTaskActions();

  const isSavingStatus = useMemo(
    () => setStatus.isPending && setStatus.variables?.taskId === task.id,
    [setStatus.isPending, setStatus.variables?.taskId, task.id],
  );

  const isSavingPriority = useMemo(
    () => setPriority.isPending && setPriority.variables?.taskId === task.id,
    [setPriority.isPending, setPriority.variables?.taskId, task.id],
  );

  const isSavingNotes = useMemo(
    () => setNotes.isPending && setNotes.variables?.taskId === task.id,
    [setNotes.isPending, setNotes.variables?.taskId, task.id],
  );

  const isDeletingTask = useMemo(
    () => deleteTask.isPending && deleteTask.variables === task.id,
    [deleteTask.isPending, deleteTask.variables, task.id],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={task.status === "done" ? "default" : "outline"}
          disabled={isSavingStatus}
          onClick={() => {
            setStatus.mutate({ taskId: task.id, status: "done" });
          }}
        >
          Mark done
        </Button>

        <Button
          type="button"
          size="sm"
          variant={task.status === "in_progress" ? "default" : "outline"}
          className={
            task.status === "in_progress"
              ? "bg-warning text-warning-foreground hover:bg-warning/90"
              : ""
          }
          disabled={isSavingStatus}
          onClick={() => {
            setStatus.mutate({ taskId: task.id, status: "in_progress" });
          }}
        >
          In Progress
        </Button>

        <Button
          type="button"
          size="sm"
          variant={task.status === "dismissed" ? "secondary" : "outline"}
          disabled={isSavingStatus}
          onClick={() => {
            setStatus.mutate({ taskId: task.id, status: "dismissed" });
          }}
        >
          Dismiss
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isSavingStatus}
          onClick={() => {
            setStatus.mutate({ taskId: task.id, status: "pending" });
          }}
        >
          Reset
        </Button>

        {task.url && (
          <Button type="button" size="sm" variant="outline" asChild>
            <a href={task.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Open in {task.source === "gclassroom" ? "Classroom" : "UVEC"}
            </a>
          </Button>
        )}

        {task.isCustom && onEditCustomTask && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onEditCustomTask}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
        )}

        {task.isCustom && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isDeletingTask}
            onClick={() => {
              deleteTask.mutate(task.id);
            }}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-muted-foreground text-xs font-medium">
          Priority
        </label>
        <select
          className="border-input bg-background h-8 w-full rounded-md border px-2 text-sm"
          value={task.priority ?? "none"}
          onChange={(event) => {
            const next = event.target.value;
            setPriority.mutate({
              taskId: task.id,
              priority: next === "none" ? null : (next as TaskPriority),
            });
          }}
          disabled={isSavingPriority}
        >
          <option value="none">No priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-muted-foreground text-xs font-medium">
          Personal notes
        </label>
        <textarea
          className="border-input bg-background min-h-20 w-full rounded-md border p-2 text-sm"
          value={notesDraft}
          onChange={(event) => {
            onNotesDraftChange(event.target.value);
          }}
          placeholder="Add your notes for this task..."
        />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground/60 hidden text-xs sm:inline">
            <kbd className="font-sans">Ctrl</kbd>+
            <kbd className="font-sans">Enter</kbd> to save
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isSavingNotes}
            onClick={onSaveNotes}
          >
            Save notes
          </Button>
        </div>
      </div>
    </div>
  );
}
