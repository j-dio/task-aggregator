"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatWeekRange } from "@/lib/share-week/format-week-range";

interface WeekPickerProps {
  weekStart: Date;
  onChange: (weekStart: Date) => void;
}

export function WeekPicker({ weekStart, onChange }: WeekPickerProps) {
  function shift(deltaDays: number) {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + deltaDays);
    onChange(next);
  }

  return (
    <div className="bg-card flex items-center justify-between gap-2 rounded-xl border px-3 py-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => shift(-7)}
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium tabular-nums">
        {formatWeekRange(weekStart)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => shift(7)}
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
