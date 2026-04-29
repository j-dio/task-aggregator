// TDD: iCal parser tests for UVEC ingestion

import { parseICal } from "../ical-parser";

// --- test helpers ---

function makeVEvent({
  uid,
  summary,
  dtstart = "20260225T090000Z",
  description,
  categories,
}: {
  uid: string;
  summary: string;
  dtstart?: string;
  description?: string;
  categories?: string;
}): string {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `SUMMARY:${summary}`,
    `DTSTART:${dtstart}`,
  ];
  if (description) lines.push(`DESCRIPTION:${description}`);
  if (categories) lines.push(`CATEGORIES:${categories}`);
  lines.push("END:VEVENT");
  return lines.join("\n");
}

function makeVCalendar(...events: string[]): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", ...events, "END:VCALENDAR"].join(
    "\n",
  );
}

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

describe("extractCourseId — via parseICal", () => {
  it("uses CATEGORIES as course ID when it is not a task-type keyword", () => {
    const ics = makeVCalendar(
      makeVEvent({ uid: "c1", summary: "Task", categories: "CS 101" }),
    );
    const { tasks } = parseICal(ics);
    expect(tasks[0].courseExternalId).toBe("CS 101");
  });

  it("ignores CATEGORIES bare task-type keyword and falls through to DESCRIPTION", () => {
    const ics = makeVCalendar(
      makeVEvent({
        uid: "c2",
        summary: "Task",
        categories: "assignment",
        description: "Course: MATH 101",
      }),
    );
    const { tasks } = parseICal(ics);
    expect(tasks[0].courseExternalId).toBe("MATH 101");
  });

  it("ignores CATEGORIES 'quiz' and falls through to SUMMARY bracket", () => {
    const ics = makeVCalendar(
      makeVEvent({
        uid: "c3",
        summary: "[IT201] Lab Quiz",
        categories: "quiz",
      }),
    );
    const { tasks } = parseICal(ics);
    expect(tasks[0].courseExternalId).toBe("IT201");
  });

  it("extracts course from DESCRIPTION 'Course: <name>'", () => {
    const ics = makeVCalendar(
      makeVEvent({
        uid: "c4",
        summary: "Task",
        description: "Course: Introduction to CS",
      }),
    );
    const { tasks } = parseICal(ics);
    expect(tasks[0].courseExternalId).toBe("Introduction to CS");
  });

  it("extracts course from DESCRIPTION 'Course Name: <name>'", () => {
    const ics = makeVCalendar(
      makeVEvent({
        uid: "c5",
        summary: "Task",
        description: "Course Name: Data Structures",
      }),
    );
    const { tasks } = parseICal(ics);
    expect(tasks[0].courseExternalId).toBe("Data Structures");
  });

  it("extracts course from SUMMARY bracket at start", () => {
    const ics = makeVCalendar(
      makeVEvent({ uid: "c6", summary: "[CS101] Assignment 1" }),
    );
    const { tasks } = parseICal(ics);
    expect(tasks[0].courseExternalId).toBe("CS101");
  });

  it("extracts uppercase course code from SUMMARY bracket mid-string", () => {
    const ics = makeVCalendar(
      makeVEvent({ uid: "c7", summary: "Midterm Exam [MATH201]" }),
    );
    const { tasks } = parseICal(ics);
    expect(tasks[0].courseExternalId).toBe("MATH201");
  });

  it("does not treat lowercase freeform brackets mid-string as course code", () => {
    const ics = makeVCalendar(
      makeVEvent({ uid: "c8", summary: "Essay [note: see rubric]" }),
    );
    const { tasks } = parseICal(ics);
    expect(tasks[0].courseExternalId).toBeNull();
  });

  it("returns null when no course info is present", () => {
    const ics = makeVCalendar(
      makeVEvent({ uid: "c9", summary: "Generic Event", categories: "event" }),
    );
    const { tasks } = parseICal(ics);
    expect(tasks[0].courseExternalId).toBeNull();
  });

  it("populates courseNames map for resolved course IDs", () => {
    const ics = makeVCalendar(
      makeVEvent({ uid: "c10", summary: "[IT201] Lab Exercise" }),
    );
    const { courseNames } = parseICal(ics);
    expect(courseNames.has("IT201")).toBe(true);
  });

  it("does not populate courseNames when course ID is null", () => {
    const ics = makeVCalendar(
      makeVEvent({ uid: "c11", summary: "Standalone event", categories: "exam" }),
    );
    const { courseNames } = parseICal(ics);
    expect(courseNames.size).toBe(0);
  });
});

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
