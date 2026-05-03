/**
 * Format a Mon-anchored ISO week start into a "May 4 — May 10" range.
 * Output is en-US, abbreviated month, no year (the share is ephemeral —
 * the year just adds noise on the image).
 */
export function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${fmt.format(weekStart)} – ${fmt.format(end)}`;
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export const WEEK_DAY_SHORT = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
