import { bucketByDay } from "@/lib/share-week/bucket-by-day";
import { WEEK_DAY_SHORT } from "@/lib/share-week/format-week-range";
import { formatTaskDetail, type WeekLayoutProps } from "./types";

/**
 * 2-column bento (Group 5 inspiration). Day cards flow into a 2-col grid
 * with their natural heights — no per-day cap, every task on every day
 * is shown. Empty days render as compact "Free" cards.
 */
export function BentoLayout({ weekStart, tasks, detailMode }: WeekLayoutProps) {
  const buckets = bucketByDay(tasks, weekStart);

  return (
    <div className="grid h-full auto-rows-min grid-cols-2 content-start gap-5">
      {buckets.map((items, dayIdx) => {
        const dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + dayIdx);
        const dayNum = dayDate.getDate();
        const isEmpty = items.length === 0;

        return (
          <div
            key={dayIdx}
            className={`flex flex-col gap-3 rounded-2xl px-5 py-4 ring-1 ring-white/10 backdrop-blur-sm ${
              isEmpty ? "bg-white/4" : "bg-white/8"
            }`}
          >
            {/* Day pill header */}
            <div className="inline-flex items-baseline gap-2 self-start rounded-full bg-[oklch(0.55_0.18_25)] px-4 py-1.5">
              <span className="text-base tracking-[0.25em] text-white/85">
                {WEEK_DAY_SHORT[dayIdx]}
              </span>
              <span className="text-2xl leading-none font-semibold">
                {dayNum}
              </span>
            </div>

            {isEmpty ? (
              <span className="text-2xl text-white/45 italic">Free</span>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((t) => {
                  const detail = formatTaskDetail(t, detailMode);
                  return (
                    <li
                      key={t.id}
                      className="flex items-baseline gap-2 leading-snug"
                    >
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-white/55" />
                      <span className="text-xl text-white/70">
                        {detail.course}
                      </span>
                      {detail.body && (
                        <span className="truncate text-2xl font-medium text-white">
                          {detail.body}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
