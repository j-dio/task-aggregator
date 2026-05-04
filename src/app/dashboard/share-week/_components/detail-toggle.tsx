"use client";

import { cn } from "@/lib/utils";
import type { DetailMode } from "@/lib/share-week/format-task-detail";

interface DetailOption {
  key: DetailMode;
  label: string;
  hint: string;
}

const OPTIONS: DetailOption[] = [
  { key: "course-title", label: "Course + title", hint: "Default" },
  { key: "course", label: "Course only", hint: "Most private" },
  { key: "full", label: "Full title", hint: "Most info" },
  { key: "emoji-course", label: "Emoji + course", hint: "Aesthetic" },
];

interface DetailToggleProps {
  value: DetailMode;
  onChange: (mode: DetailMode) => void;
}

export function DetailToggle({ value, onChange }: DetailToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Task detail
      </label>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((opt) => {
          const selected = opt.key === value;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={cn(
                "flex flex-col items-start rounded-lg border px-3 py-2 text-left transition",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium",
                  selected ? "text-primary" : "text-foreground",
                )}
              >
                {opt.label}
              </span>
              <span className="text-muted-foreground text-xs">{opt.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
