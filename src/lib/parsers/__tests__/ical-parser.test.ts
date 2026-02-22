// TDD: iCal parser tests for UVEC ingestion
// src/lib/parsers/__tests__/ical-parser.test.ts

import { parseICal } from "../ical-parser";
import { z } from "zod";

const sampleICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:12345
SUMMARY:Assignment 1
DESCRIPTION:Complete the worksheet
DTSTART;TZID=Europe/Paris:20260225T090000
DTEND;TZID=Europe/Paris:20260225T100000
CATEGORIES:assignment
END:VEVENT
BEGIN:VEVENT
UID:67890
SUMMARY:Quiz 1
DESCRIPTION:Online quiz
DTSTART;TZID=Europe/Paris:20260226T120000
DTEND;TZID=Europe/Paris:20260226T123000
CATEGORIES:quiz
END:VEVENT
END:VCALENDAR`;

const TaskSchema = z.object({
  external_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  due_date: z.string(),
  type: z.enum(["assignment", "quiz", "exam", "event"]),
  source: z.literal("UVEC"),
});

describe("parseICal", () => {
  it("parses .ics text into Task[]", () => {
    const tasks = parseICal(sampleICS);
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBe(2);
    tasks.forEach((task) => {
      TaskSchema.parse(task);
      expect(task.source).toBe("UVEC");
    });
    expect(tasks[0]).toMatchObject({
      external_id: "12345",
      title: "Assignment 1",
      description: "Complete the worksheet",
      type: "assignment",
    });
    expect(tasks[1]).toMatchObject({
      external_id: "67890",
      title: "Quiz 1",
      description: "Online quiz",
      type: "quiz",
    });
  });

  it("returns empty array for invalid .ics", () => {
    const tasks = parseICal("INVALID DATA");
    expect(tasks).toEqual([]);
  });
});
