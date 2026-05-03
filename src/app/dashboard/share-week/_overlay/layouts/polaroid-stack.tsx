import { bucketByDay } from "@/lib/share-week/bucket-by-day";
import { WEEK_DAY_SHORT } from "@/lib/share-week/format-week-range";
import { formatTaskDetail, type WeekLayoutProps } from "./types";

/**
 * Polaroid-style stack: each non-empty day is an off-white card stacked
 * vertically. No tilt — clean alignment, photo-frame feel from the
 * off-white background + drop shadow alone. All tasks for each day are
 * shown (no cap).
 */
export function PolaroidStackLayout({
  weekStart,
  tasks,
  detailMode,
}: WeekLayoutProps) {
  const buckets = bucketByDay(tasks, weekStart);

  return (
    <div className="flex h-full flex-col items-center justify-start gap-5 pt-2">
      {buckets.map((items, dayIdx) => {
        if (items.length === 0) return null;
        const dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + dayIdx);

        return (
          <div
            key={dayIdx}
            className="w-[860px] rounded-md bg-[oklch(0.96_0.01_85)] px-8 pt-6 pb-7 text-[oklch(0.18_0.01_50)] shadow-2xl"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold tracking-[0.3em] text-[oklch(0.45_0.18_25)]">
                {WEEK_DAY_SHORT[dayIdx]} {dayDate.getDate()}
              </span>
              <span className="text-lg text-[oklch(0.45_0.05_50)]">
                {items.length} due
              </span>
            </div>
            <ul className="mt-4 flex flex-col gap-2.5">
              {items.map((t) => {
                const detail = formatTaskDetail(t, detailMode);
                return (
                  <li key={t.id} className="flex items-baseline gap-3">
                    <span className="shrink-0 rounded-md bg-[oklch(0.55_0.18_25)] px-2.5 py-1 text-base font-medium text-white">
                      {detail.course}
                    </span>
                    {detail.body && (
                      <span className="truncate text-2xl font-medium">
                        {detail.body}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
