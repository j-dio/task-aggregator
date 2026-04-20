import { describe, expect, it } from "vitest";
import {
  dueDateAndTimeToIso,
  isoToLocalDueParts,
} from "@/lib/due-date-input";

describe("dueDateAndTimeToIso", () => {
  it("returns undefined for empty date", () => {
    expect(dueDateAndTimeToIso("", "")).toBeUndefined();
    expect(dueDateAndTimeToIso("  ", "")).toBeUndefined();
  });

  it("uses end of local day when time is empty", () => {
    const iso = dueDateAndTimeToIso("2026-08-08", "");
    expect(iso).toBeDefined();
    const d = new Date(iso!);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(8);
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
    expect(d.getSeconds()).toBe(59);
  });

  it("uses explicit local time when provided", () => {
    const iso = dueDateAndTimeToIso("2026-08-08", "09:30");
    expect(iso).toBeDefined();
    const d = new Date(iso!);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(30);
  });

  it("accepts HH:mm:ss from native time input", () => {
    const iso = dueDateAndTimeToIso("2026-08-08", "14:05:00");
    expect(iso).toBeDefined();
    const d = new Date(iso!);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(5);
  });

  it("returns undefined for malformed date", () => {
    expect(dueDateAndTimeToIso("08/08/2026", "")).toBeUndefined();
  });
});

describe("isoToLocalDueParts", () => {
  it("round-trips with dueDateAndTimeToIso for date-only", () => {
    const iso = dueDateAndTimeToIso("2026-08-08", "");
    const parts = isoToLocalDueParts(iso ?? null);
    expect(parts.date).toBe("2026-08-08");
    expect(parts.time).toMatch(/^\d{2}:\d{2}$/);
  });
});
