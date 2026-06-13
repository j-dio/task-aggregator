// Unit tests for Google Classroom parser

import { parseGClassroomResponse } from "../gclassroom-parser";

describe("parseGClassroomResponse", () => {
  it("should parse valid courseWork array", () => {
    const courseWork = [
      {
        id: "cw1",
        title: "Assignment 1",
        description: "Read chapter 1",
        dueDate: { year: 2026, month: 2, day: 25 },
        dueTime: { hours: 23, minutes: 59 },
        state: "PUBLISHED",
        courseId: "c1",
      },
    ];
    const result = parseGClassroomResponse({ courseWork });
    expect(result).toEqual([
      {
        externalId: "cw1",
        title: "Assignment 1",
        description: "Read chapter 1",
        dueDate: "2026-02-25T23:59:00Z",
        type: "assignment",
        source: "gclassroom",
        courseExternalId: "c1",
        url: null,
      },
    ]);
  });

  it("should return empty array for invalid input", () => {
    const result = parseGClassroomResponse(undefined);
    expect(result).toEqual([]);
  });

  it("should handle empty courseWork array", () => {
    const result = parseGClassroomResponse({ courseWork: [] });
    expect(result).toEqual([]);
  });

  it("should handle courseWork without due date", () => {
    const courseWork = [
      {
        id: "cw2",
        title: "Assignment 2",
        state: "PUBLISHED",
        courseId: "c1",
      },
    ];
    const result = parseGClassroomResponse({ courseWork });
    expect(result).toHaveLength(1);
    expect(result[0].dueDate).toBeNull();
  });

  it("normalizes date-only (no dueTime) to end-of-day UTC+8", () => {
    const courseWork = [
      {
        id: "cw3",
        title: "All-day Assignment",
        dueDate: { year: 2026, month: 6, day: 12 },
        state: "PUBLISHED",
        courseId: "c1",
      },
    ];
    const result = parseGClassroomResponse({ courseWork });
    expect(result[0].dueDate).toBe("2026-06-12T15:59:59.000Z");
  });

  it("should map Classroom submission states to task statuses", () => {
    const courseWork = [
      { id: "draft", title: "Draft", state: "PUBLISHED", courseId: "c1" },
      {
        id: "reclaimed",
        title: "Reclaimed",
        state: "PUBLISHED",
        courseId: "c1",
      },
      {
        id: "returned",
        title: "Returned",
        state: "PUBLISHED",
        courseId: "c1",
      },
      {
        id: "turned-in",
        title: "Turned in",
        state: "PUBLISHED",
        courseId: "c1",
      },
      { id: "new", title: "New", state: "PUBLISHED", courseId: "c1" },
    ];
    const submissions = new Map([
      ["draft", "DRAFT"],
      ["reclaimed", "RECLAIMED_BY_STUDENT"],
      ["returned", "RETURNED"],
      ["turned-in", "TURNED_IN"],
      ["new", "NEW"],
    ]);

    const result = parseGClassroomResponse({ courseWork }, submissions);

    expect(result.map((task) => [task.externalId, task.status])).toEqual([
      ["draft", "in_progress"],
      ["reclaimed", "in_progress"],
      ["returned", "done"],
      ["turned-in", "done"],
      ["new", undefined],
    ]);
  });
});
