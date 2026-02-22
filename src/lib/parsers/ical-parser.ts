// src/lib/parsers/ical-parser.ts
// UVEC iCal parser: .ics text → Task[]
// Uses ical.js for parsing
// Conventions: Immutability, Zod validation, no console.log

import { z } from "zod";
// @ts-expect-error: ical.js is a JS library, import as default
import ical from "ical.js";

const TaskSchema = z.object({
  external_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  due_date: z.string(),
  type: z.enum(["assignment", "quiz", "exam", "event"]),
  source: z.literal("UVEC"),
});

export type Task = z.infer<typeof TaskSchema>;

function normalizeType(category: string | undefined): Task["type"] {
  if (!category) return "event";
  if (["assignment", "quiz", "exam", "event"].includes(category)) {
    return category as Task["type"];
  }
  return "event";
}

export function parseICal(ics: string): Task[] {
  try {
    const jcal = ical.parse(ics);
    const comp = new ical.Component(jcal);
    const events = comp.getAllSubcomponents("vevent");
    return events
      .map((ev) => {
        const uid = ev.getFirstPropertyValue("uid");
        const summary = ev.getFirstPropertyValue("summary");
        const description = ev.getFirstPropertyValue("description");
        const dtstart = ev.getFirstPropertyValue("dtstart");
        const category = ev.getFirstPropertyValue("categories");
        if (!uid || !summary || !dtstart) return null;
        return TaskSchema.safeParse({
          external_id: String(uid),
          title: String(summary),
          description: description ? String(description) : undefined,
          due_date: typeof dtstart === "string" ? dtstart : dtstart.toString(),
          type: normalizeType(
            category ? String(category).toLowerCase() : undefined,
          ),
          source: "UVEC",
        }).success
          ? {
              external_id: String(uid),
              title: String(summary),
              description: description ? String(description) : undefined,
              due_date:
                typeof dtstart === "string" ? dtstart : dtstart.toString(),
              type: normalizeType(
                category ? String(category).toLowerCase() : undefined,
              ),
              source: "UVEC",
            }
          : null;
      })
      .filter((t): t is Task => !!t);
  } catch {
    return [];
  }
}
