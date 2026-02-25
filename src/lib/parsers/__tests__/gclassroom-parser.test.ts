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
        dueDate: "2026-02-25T23:59:00",
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
});
