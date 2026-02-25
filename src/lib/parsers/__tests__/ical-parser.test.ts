// TDD: iCal parser tests for UVEC ingestion

import { parseICal } from "../ical-parser";

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

describe("parseICal", () => {
  it("parses .ics text into ParsedTask[]", () => {
    const { tasks, errors } = parseICal(sampleICS);
    expect(tasks).toHaveLength(2);
    expect(errors).toHaveLength(0);

    expect(tasks[0]).toMatchObject({
      externalId: "12345",
      title: "Assignment 1",
      description: "Complete the worksheet",
      type: "assignment",
      source: "uvec",
    });
    expect(tasks[1]).toMatchObject({
      externalId: "67890",
      title: "Quiz 1",
      description: "Online quiz",
      type: "quiz",
      source: "uvec",
    });
  });

  it("returns errors for invalid .ics", () => {
    const { tasks, errors } = parseICal("INVALID DATA");
    expect(tasks).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns empty tasks for empty string", () => {
    const { tasks, errors } = parseICal("");
    expect(tasks).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it("rejects oversized input", () => {
    const huge = "X".repeat(6 * 1024 * 1024);
    const { tasks, errors } = parseICal(huge);
    expect(tasks).toHaveLength(0);
    expect(errors[0]).toContain("5MB");
  });
});
