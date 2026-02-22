// Unit tests for Google Classroom parser
// Phase 3: Scaffolding only

import { parseGClassroomResponse } from "../gclassroom-parser";
import { Task } from "../../../types/task";

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
    // Should return Task[] with mapped fields
    const result = parseGClassroomResponse({ courseWork });
    expect(result).toEqual([
      {
        id: "cw1",
        title: "Assignment 1",
        description: "Read chapter 1",
        dueDate: "2026-02-25T23:59:00",
        source: "google-classroom",
        courseId: "c1",
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
});
