"use client";

import { cn } from "@/lib/utils";

export type LayoutKey = "day-stack" | "bento" | "calendar-strip" | "polaroid";

interface LayoutOption {
  key: LayoutKey;
  label: string;
}

const OPTIONS: LayoutOption[] = [
  { key: "day-stack", label: "Day stack" },
  { key: "bento", label: "Bento" },
  { key: "calendar-strip", label: "Strip + list" },
  { key: "polaroid", label: "Polaroid" },
];

interface LayoutPickerProps {
  value: LayoutKey;
  onChange: (key: LayoutKey) => void;
}

export function LayoutPicker({ value, onChange }: LayoutPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Layout
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
                "rounded-lg border px-3 py-2 text-sm font-medium transition",
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-accent",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
