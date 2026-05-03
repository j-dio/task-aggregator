import { bucketByDay } from "@/lib/share-week/bucket-by-day";
import { WEEK_DAY_SHORT } from "@/lib/share-week/format-week-range";
import { formatTaskDetail, type WeekLayoutProps } from "./types";

const MAX_PER_DAY = 6;

/**
 * Vertical day-stack: one row per day, Mon → Sun.
 * Empty days collapse to a thin "Free" line. Non-empty days flex to share
 * available height proportional to their item count, then space items
 * evenly inside their row so the page doesn't leave dead vertical space.
 */
export function DayStackLayout({
  weekStart,
  tasks,
  detailMode,
}: WeekLayoutProps) {
  const buckets = bucketByDay(tasks, weekStart);

  return (
    <div className="flex h-full flex-col gap-4">
      {buckets.map((items, dayIdx) => {
        const dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + dayIdx);
        const dayNum = dayDate.getDate();
        const isEmpty = items.length === 0;
        const visible = items.slice(0, MAX_PER_DAY);
        const overflow = items.length - visible.length;

        // Dampened proportional growth — single-item rows stay 1.0, multi-item
        // rows grow at half-pace so a 3-item row isn't 3× taller than a 1-item row.
        const flexBasis = isEmpty
          ? "0 0 auto"
          : `${1 + (items.length - 1) * 0.5} 1 0%`;

        return (
          <div
            key={dayIdx}
            className={`flex gap-7 rounded-2xl bg-white/8 px-7 py-5 ring-1 ring-white/10 backdrop-blur-sm ${
              isEmpty ? "items-center" : "items-stretch"
            }`}
            style={{ flex: flexBasis }}
          >
            {/* Day chip */}
            <div className="flex w-36 shrink-0 flex-col items-center justify-center rounded-xl bg-[oklch(0.55_0.18_25)] px-2 py-4">
              <span className="text-base tracking-[0.3em] text-white/85">
                {WEEK_DAY_SHORT[dayIdx]}
              </span>
              <span className="text-5xl leading-none font-semibold">
                {dayNum}
              </span>
            </div>

            {/* Items — always centered as a tight group, regardless of count.
                Avoids the awkward top/bottom split that justify-between created. */}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
              {isEmpty ? (
                <span className="text-3xl text-white/45 italic">Free</span>
              ) : (
                <>
                  {visible.map((t) => {
                    const detail = formatTaskDetail(t, detailMode);
                    return (
                      <div
                        key={t.id}
                        className="flex min-w-0 items-baseline gap-4"
                      >
                        <span className="shrink-0 rounded-md bg-white/15 px-2.5 py-1 text-xl font-medium text-white/85">
                          {detail.course}
                        </span>
                        {detail.body && (
                          <span className="truncate text-4xl font-medium text-white">
                            {detail.body}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div className="text-xl text-white/55">
                      +{overflow} more
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
