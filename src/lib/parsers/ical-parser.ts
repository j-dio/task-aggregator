// UVEC iCal parser: .ics text -> ParsedTask[]
// Uses ical.js for parsing

import { z } from "zod";
import type { ParsedTask, TaskType } from "../../types/task";
import ical from "ical.js";

const MAX_ICAL_SIZE = 5 * 1024 * 1024; // 5MB

const ICalEventSchema = z.object({
  external_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  due_date: z.string(),
  type: z.enum(["assignment", "quiz", "exam", "event"]),
});

function normalizeType(category: string | undefined): TaskType {
  if (!category) return "event";
  const lower = category.toLowerCase();
  if (
    lower === "assignment" ||
    lower === "quiz" ||
    lower === "exam" ||
    lower === "event"
  ) {
    return lower as TaskType;
  }
  return "event";
}

export interface ICalParseResult {
  tasks: ParsedTask[];
  errors: string[];
}

export function parseICal(ics: string): ICalParseResult {
  const errors: string[] = [];

  if (ics.length > MAX_ICAL_SIZE) {
    return { tasks: [], errors: ["iCal file exceeds 5MB size limit"] };
  }

  if (!ics.trim()) {
    return { tasks: [], errors: [] };
  }

  try {
    const jcal = ical.parse(ics);
    const comp = new ical.Component(jcal);
    const events = comp.getAllSubcomponents("vevent");
    const tasks: ParsedTask[] = [];

    for (const ev of events) {
      const uid = ev.getFirstPropertyValue("uid");
      const summary = ev.getFirstPropertyValue("summary");
      const description = ev.getFirstPropertyValue("description");
      const dtstart = ev.getFirstPropertyValue("dtstart");
      const category = ev.getFirstPropertyValue("categories");

      if (!uid || !summary || !dtstart) {
        errors.push("Skipped event: missing uid/summary/dtstart");
        continue;
      }

      const parsed = ICalEventSchema.safeParse({
        external_id: String(uid),
        title: String(summary),
        description: description ? String(description) : undefined,
        due_date: typeof dtstart === "string" ? dtstart : dtstart.toString(),
        type: normalizeType(
          category ? String(category).toLowerCase() : undefined,
        ),
      });

      if (parsed.success) {
        tasks.push({
          externalId: parsed.data.external_id,
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          dueDate: parsed.data.due_date,
          type: parsed.data.type,
          source: "uvec",
          courseExternalId: null,
          url: null,
        });
      } else {
        errors.push(`Skipped event ${uid}: validation failed`);
      }
    }

    return { tasks, errors };
  } catch (err) {
    return {
      tasks: [],
      errors: [
        `iCal parse error: ${err instanceof Error ? err.message : "Unknown error"}`,
      ],
    };
  }
}
