"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskWithCourse } from "@/types/task";

interface CustomTaskPickerProps {
  /** Custom tasks visible in the currently selected week. */
  customTasks: TaskWithCourse[];
  /** IDs the user has explicitly excluded from the share image. */
  excludedIds: Set<string>;
  onChange: (next: Set<string>) => void;
}

/**
 * Lets the user opt specific custom tasks out of the share image.
 * Default behavior: every custom task is included (excludedIds empty).
 * Clicking a row toggles that task; the "Include / Exclude all" links
 * scope to the current week's custom tasks only.
 *
 * Renders nothing when there are no custom tasks this week — keeps the
 * sidebar clean for users who don't use custom tasks.
 */
export function CustomTaskPicker({
  customTasks,
  excludedIds,
  onChange,
}: CustomTaskPickerProps) {
  if (customTasks.length === 0) return null;

  const allIncluded = customTasks.every((t) => !excludedIds.has(t.id));
  const allExcluded = customTasks.every((t) => excludedIds.has(t.id));
  const includedCount = customTasks.filter((t) => !excludedIds.has(t.id))
    .length;

  function toggle(id: string) {
    const next = new Set(excludedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function includeAll() {
    if (allIncluded) return;
    const next = new Set(excludedIds);
    customTasks.forEach((t) => next.delete(t.id));
    onChange(next);
  }

  function excludeAll() {
    if (allExcluded) return;
    const next = new Set(excludedIds);
    customTasks.forEach((t) => next.add(t.id));
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Custom tasks
          <span className="text-muted-foreground/70 ml-2 normal-case tracking-normal">
            {includedCount}/{customTasks.length}
          </span>
        </label>
        <div className="text-xs">
          <button
            type="button"
            onClick={includeAll}
            disabled={allIncluded}
            className="text-primary hover:underline disabled:cursor-default disabled:opacity-40 disabled:no-underline"
          >
            Include all
          </button>
          <span className="text-muted-foreground/60 mx-1">·</span>
          <button
            type="button"
            onClick={excludeAll}
            disabled={allExcluded}
            className="text-muted-foreground hover:text-foreground hover:underline disabled:cursor-default disabled:opacity-40 disabled:no-underline"
          >
            Exclude all
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {customTasks.map((task) => {
          const included = !excludedIds.has(task.id);
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => toggle(task.id)}
              aria-pressed={included}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition",
                included
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
                  included
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
              >
                {included && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm",
                  included ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {task.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
