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

/** CATEGORIES values that identify task type, not course — must not become courseExternalId. */
const TASK_TYPE_CATEGORIES = new Set(["assignment", "quiz", "exam", "event"]);

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

/**
 * Extract a course identifier from iCal event properties.
 * Rules applied in order — first non-null match wins:
 *
 * 1. CATEGORIES — if present and not a bare task-type keyword
 *    (assignment / quiz / exam / event). Moodle may set this to the course
 *    shortname (e.g. "CS 101").
 * 2. DESCRIPTION — line matching "Course: <name>" or "Course Name: <name>".
 * 3. SUMMARY — bracketed prefix at the very start: "[CODE] Title".
 *    Accepts any bracket content (most specific location signal).
 * 4. SUMMARY — bracketed uppercase course-code pattern anywhere in the string
 *    (e.g. "Midterm [MATH201]"). Must be uppercase letters/digits/spaces/
 *    hyphens, 3–20 chars, to reduce false positives from freeform brackets.
 */
function extractCourseId(
  category: string | null,
  description: string | null,
  summary: string | null,
): string | null {
  // 1. CATEGORIES — skip bare task-type values
  if (category) {
    const trimmed = category.trim();
    if (trimmed.length > 0 && !TASK_TYPE_CATEGORIES.has(trimmed.toLowerCase())) {
      return trimmed;
    }
  }

  // 2. DESCRIPTION — "Course: <name>" or "Course Name: <name>"
  if (description) {
    const courseMatch = description.match(/^Course(?:\s+Name)?:\s*(.+)/im);
    if (courseMatch?.[1]) return courseMatch[1].trim();
  }

  // 3. SUMMARY — bracketed prefix at start (permissive — any bracket content)
  if (summary) {
    const prefixMatch = summary.match(/^\[([^\]]+)\]/);
    if (prefixMatch?.[1]) return prefixMatch[1].trim();
  }

  // 4. SUMMARY — uppercase course-code bracket anywhere (e.g. "Exam [MATH201]")
  if (summary) {
    const codeMatch = summary.match(/\[([A-Z][A-Z0-9 \-]{2,19})\]/);
    if (codeMatch?.[1]) return codeMatch[1].trim();
  }

  return null;
}

export interface ICalParseResult {
  tasks: ParsedTask[];
  errors: string[];
  /** Map of courseExternalId -> display name extracted from iCal */
  courseNames: Map<string, string>;
}

export function parseICal(ics: string): ICalParseResult {
  const errors: string[] = [];
  const courseNames = new Map<string, string>();

  if (ics.length > MAX_ICAL_SIZE) {
    return {
      tasks: [],
      errors: ["iCal file exceeds 5MB size limit"],
      courseNames,
    };
  }

  if (!ics.trim()) {
    return { tasks: [], errors: [], courseNames };
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
      const urlProp = ev.getFirstPropertyValue("url");

      if (!uid || !summary || !dtstart) {
        errors.push("Skipped event: missing uid/summary/dtstart");
        continue;
      }

      const categoryStr = category ? String(category) : null;
      const descStr = description ? String(description) : null;
      const summaryStr = String(summary);
      const courseId = extractCourseId(categoryStr, descStr, summaryStr);

      // Track course names for later upsert
      if (courseId) {
        courseNames.set(courseId, courseId);
      }

      const parsed = ICalEventSchema.safeParse({
        external_id: String(uid),
        title: summaryStr,
        description: descStr ?? undefined,
        due_date: typeof dtstart === "string" ? dtstart : dtstart.toString(),
        type: normalizeType(categoryStr?.toLowerCase() ?? undefined),
      });

      if (parsed.success) {
        tasks.push({
          externalId: parsed.data.external_id,
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          dueDate: parsed.data.due_date,
          type: parsed.data.type,
          source: "uvec",
          courseExternalId: courseId,
          url: urlProp ? String(urlProp) : null,
        });
      } else {
        errors.push(`Skipped event ${uid}: validation failed`);
      }
    }

    return { tasks, errors, courseNames };
  } catch (err) {
    return {
      tasks: [],
      errors: [
        `iCal parse error: ${err instanceof Error ? err.message : "Unknown error"}`,
      ],
      courseNames,
    };
  }
}
