"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTasks } from "@/hooks/use-tasks";
import { useAutoSync } from "@/hooks/use-auto-sync";
import {
  SHARE_CANVAS_HEIGHT,
  SHARE_CANVAS_WIDTH,
} from "./_overlay/overlay-shell";
import { ShareCanvas } from "./_overlay/share-canvas";
import { DayStackLayout } from "./_overlay/layouts/day-stack";
import { BentoLayout } from "./_overlay/layouts/bento";
import { CalendarStripLayout } from "./_overlay/layouts/calendar-strip";
import { PolaroidStackLayout } from "./_overlay/layouts/polaroid-stack";
import { selectWeekTasks } from "@/lib/share-week/select-week-tasks";
import {
  formatLocalDateISO,
  mondayOf,
  parseLocalDateISO,
} from "@/lib/share-week/week-utils";
import type { DetailMode } from "@/lib/share-week/format-task-detail";
import {
  DEFAULT_GRADIENT_KEY,
  getGradientCss,
  type GradientKey,
} from "@/lib/share-week/gradients";
import { Skeleton } from "@/components/ui/skeleton";
import { WeekPicker } from "./_components/week-picker";
import { LayoutPicker, type LayoutKey } from "./_components/layout-picker";
import { DetailToggle } from "./_components/detail-toggle";
import { PhotoPicker } from "./_components/photo-picker";
import { GradientPicker } from "./_components/gradient-picker";
import { ShareActions } from "./_components/share-actions";
import { CustomTaskPicker } from "./_components/custom-task-picker";

const PREVIEW_WIDTH = 360;
const PREVIEW_HEIGHT =
  PREVIEW_WIDTH * (SHARE_CANVAS_HEIGHT / SHARE_CANVAS_WIDTH);

export default function ShareWeekPage() {
  return (
    <Suspense fallback={<ShareWeekSkeleton />}>
      <ShareWeekEditor />
    </Suspense>
  );
}

function ShareWeekSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Skeleton className="mb-4 h-10 w-64" />
      <div className="grid gap-6 md:grid-cols-[340px_1fr] md:gap-x-12">
        <Skeleton className="order-2 h-96 w-full md:order-1" />
        <Skeleton
          style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
          className="order-1 mx-auto rounded-2xl md:order-2 md:mx-0"
        />
      </div>
    </div>
  );
}

function ShareWeekEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useAutoSync();

  const initialWeek = useMemo(() => {
    const fromUrl = parseLocalDateISO(searchParams.get("week"));
    return mondayOf(fromUrl ?? new Date());
  }, [searchParams]);

  const [weekStart, setWeekStart] = useState<Date>(initialWeek);
  const [layoutKey, setLayoutKey] = useState<LayoutKey>("day-stack");
  const [detailMode, setDetailMode] = useState<DetailMode>("course-title");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [gradientKey, setGradientKey] =
    useState<GradientKey>(DEFAULT_GRADIENT_KEY);
  const [excludedTaskIds, setExcludedTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const captureRef = useRef<HTMLDivElement | null>(null);

  const { data: tasks, isLoading } = useTasks({});

  const weekTasks = useMemo(() => {
    if (!tasks) return [];
    return selectWeekTasks(tasks, weekStart);
  }, [tasks, weekStart]);

  const customTasksThisWeek = useMemo(
    () => weekTasks.filter((t) => t.source === "custom" || t.isCustom),
    [weekTasks],
  );

  const visibleTasks = useMemo(() => {
    if (excludedTaskIds.size === 0) return weekTasks;
    return weekTasks.filter((t) => !excludedTaskIds.has(t.id));
  }, [weekTasks, excludedTaskIds]);

  function handleWeekChange(next: Date) {
    const monday = mondayOf(next);
    setWeekStart(monday);
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", formatLocalDateISO(monday));
    router.replace(`/dashboard/share-week?${params.toString()}`, {
      scroll: false,
    });
  }

  const layoutBody = (() => {
    const props = { weekStart, tasks: visibleTasks, detailMode };
    switch (layoutKey) {
      case "day-stack":
        return <DayStackLayout {...props} />;
      case "bento":
        return <BentoLayout {...props} />;
      case "calendar-strip":
        return <CalendarStripLayout {...props} />;
      case "polaroid":
        return <PolaroidStackLayout {...props} />;
    }
  })();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Remind them</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Share your week so classmates don&apos;t miss anything. The image
          stays on your device until you share it.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[340px_1fr] md:gap-x-12">
        <div className="order-2 flex flex-col gap-4 md:order-1">
          <WeekPicker weekStart={weekStart} onChange={handleWeekChange} />
          <PhotoPicker photoDataUrl={photoDataUrl} onChange={setPhotoDataUrl} />
          <GradientPicker
            value={gradientKey}
            onChange={setGradientKey}
            photoActive={photoDataUrl !== null}
          />
          <LayoutPicker value={layoutKey} onChange={setLayoutKey} />
          <DetailToggle value={detailMode} onChange={setDetailMode} />
          <CustomTaskPicker
            customTasks={customTasksThisWeek}
            excludedIds={excludedTaskIds}
            onChange={setExcludedTaskIds}
          />
          {isLoading && (
            <p className="text-muted-foreground text-xs">Loading tasks…</p>
          )}
          {!isLoading && weekTasks.length === 0 && (
            <p className="text-muted-foreground text-xs">
              No tasks due this week. Try a different week.
            </p>
          )}
        </div>

        <div className="order-1 flex flex-col items-center gap-4 md:order-2 md:items-start">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Preview
          </span>
          <ShareCanvas
            weekStart={weekStart}
            photoDataUrl={photoDataUrl}
            gradientCss={getGradientCss(gradientKey)}
            body={layoutBody}
            previewWidth={PREVIEW_WIDTH}
            captureRef={captureRef}
          />
          <div style={{ width: PREVIEW_WIDTH }}>
            <ShareActions captureRef={captureRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
