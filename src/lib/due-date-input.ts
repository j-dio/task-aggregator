/**
 * Converts custom-task due fields to an ISO string for the API.
 * Empty date → undefined (no due date).
 * Empty time → end of local calendar day (23:59:59.999).
 * `timePart` is typically from `input type="time"` (`HH:mm` or `HH:mm:ss`).
 */
export function dueDateAndTimeToIso(
  datePart: string,
  timePart: string,
): string | undefined {
  const d = datePart.trim();
  if (!d) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const t = timePart.trim();
  if (!t) {
    return new Date(y, mo - 1, day, 23, 59, 59, 999).toISOString();
  }
  const tm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(t);
  if (tm) {
    const hh = Number(tm[1]);
    const min = Number(tm[2]);
    if (hh >= 0 && hh <= 23 && min >= 0 && min <= 59) {
      return new Date(y, mo - 1, day, hh, min, 0, 0).toISOString();
    }
  }
  return new Date(y, mo - 1, day, 23, 59, 59, 999).toISOString();
}

/** Splits a stored ISO due into local date + time string for `type="date"` / `type="time"`. */
export function isoToLocalDueParts(iso: string | null): {
  date: string;
  time: string;
} {
  if (!iso) return { date: "", time: "" };
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
  };
}
