import { bucketByDay } from "@/lib/share-week/bucket-by-day";
import { WEEK_DAY_SHORT } from "@/lib/share-week/format-week-range";
import { formatTaskDetail, type WeekLayoutProps } from "./types";

const MAX_DOTS = 5;

/**
 * Hybrid layout: top horizontal Mon-Sun strip with task-count dots,
 * bottom flat chronological list of items. The strip is the
 * "at-a-glance" surface (and shows real per-day counts via dots),
 * the list is the "what is each thing" preview.
 */
export function CalendarStripLayout({
  weekStart,
  tasks,
  detailMode,
}: WeekLayoutProps) {
  const buckets = bucketByDay(tasks, weekStart);

  const visible = buckets.flatMap((day) => day);

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Strip */}
      <div className="grid grid-cols-7 gap-3 rounded-2xl bg-white/8 p-6 ring-1 ring-white/10 backdrop-blur-sm">
        {buckets.map((items, dayIdx) => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + dayIdx);
          const count = items.length;
          const dotCount = Math.min(count, MAX_DOTS);
          return (
            <div
              key={dayIdx}
              className="flex flex-col items-center justify-start gap-2 rounded-xl px-1 py-2"
            >
              <span className="text-base tracking-[0.2em] text-white/70">
                {WEEK_DAY_SHORT[dayIdx]}
              </span>
              <span className="text-4xl leading-none font-semibold">
                {dayDate.getDate()}
              </span>
              <div className="mt-2 flex h-3 items-center gap-1">
                {Array.from({ length: dotCount }).map((_, i) => (
                  <span
                    key={i}
                    className="h-2.5 w-2.5 rounded-full bg-[oklch(0.7_0.18_25)]"
                  />
                ))}
                {count > MAX_DOTS && (
                  <span className="ml-1 text-sm text-white/65">
                    +{count - MAX_DOTS}
                  </span>
                )}
                {count === 0 && (
                  <span className="text-sm text-white/35 italic">·</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* List */}
      <ul className="flex flex-1 flex-col gap-3 overflow-hidden rounded-2xl bg-white/6 p-6 ring-1 ring-white/10 backdrop-blur-sm">
        {visible.map((t) => {
          const due = t.dueDate ? new Date(t.dueDate) : null;
          const dayIdx = due
            ? Math.floor(
                (due.getTime() - new Date(weekStart).setHours(0, 0, 0, 0)) /
                  (24 * 60 * 60 * 1000),
              )
            : 0;
          const detail = formatTaskDetail(t, detailMode);
          return (
            <li
              key={t.id}
              className="flex items-baseline gap-5 border-b border-white/8 pb-3 last:border-b-0"
            >
              <span className="w-20 shrink-0 text-xl font-semibold tracking-[0.2em] text-white/70">
                {WEEK_DAY_SHORT[dayIdx]}
              </span>
              <span className="shrink-0 rounded-md bg-white/15 px-3 py-1 text-xl text-white/85">
                {detail.course}
              </span>
              {detail.body && (
                <span className="truncate text-3xl font-medium text-white">
                  {detail.body}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
