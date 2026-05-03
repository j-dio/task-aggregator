"use client";

import { cn } from "@/lib/utils";
import {
  GRADIENT_PRESETS,
  type GradientKey,
} from "@/lib/share-week/gradients";

interface GradientPickerProps {
  value: GradientKey;
  onChange: (key: GradientKey) => void;
  /** When true, the gradient is currently overridden by a photo and the
   * picker shows a muted state with an explanatory hint. The buttons stay
   * interactive so users can pre-pick a gradient that takes effect once
   * they remove the photo. */
  photoActive?: boolean;
}

/**
 * Visual swatch grid for picking the share-image background gradient.
 * Each swatch renders the actual gradient so the user gets a true preview.
 * Default is "Maroon" (the original red→black). Photo selection takes
 * visual precedence — see `photoActive`.
 */
export function GradientPicker({
  value,
  onChange,
  photoActive = false,
}: GradientPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Gradient
      </label>
      <div
        className={cn(
          "grid grid-cols-3 gap-2 transition-opacity",
          photoActive && "opacity-50",
        )}
      >
        {GRADIENT_PRESETS.map((preset) => {
          const selected = preset.key === value;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => onChange(preset.key)}
              title={preset.label}
              aria-label={preset.label}
              aria-pressed={selected}
              className={cn(
                "ring-offset-background relative h-12 rounded-lg border-2 transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                selected
                  ? "border-primary ring-primary/40 ring-2"
                  : "border-border hover:border-foreground/40",
              )}
              style={{ background: preset.css }}
            />
          );
        })}
      </div>
      {photoActive && (
        <p className="text-muted-foreground text-xs">
          A photo is in use. Remove it to see this gradient.
        </p>
      )}
    </div>
  );
}
