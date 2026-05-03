import { describe, it, expect } from "vitest";
import {
  formatTaskDetail,
  truncateTitle,
  type DetailMode,
} from "../format-task-detail";
import type { TaskWithCourse, Course, TaskType } from "@/types/task";

const NOW = "2026-05-03T12:00:00.000Z";

function makeCourse(short: string | null, name = "Long Course Name"): Course {
  return {
    id: "c1",
    userId: "u",
    source: "uvec",
    externalId: "c1",
    name,
    shortName: short,
    instructor: null,
    color: null,
    isArchived: false,
    createdAt: NOW,
  };
}

function makeTask(
  title: string,
  type: TaskType = "assignment",
  course: Course | null = makeCourse("Math 31"),
): TaskWithCourse {
  return {
    id: "t1",
    userId: "u",
    courseId: course?.id ?? null,
    source: "uvec",
    externalId: "t1",
    title,
    description: null,
    type,
    status: "pending",
    dueDate: null,
    url: null,
    metadata: {},
    isCustom: false,
    fetchedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    course,
    priority: null,
    notes: null,
    displayStatus: "pending",
  };
}

describe("truncateTitle", () => {
  it("returns input when shorter than max", () => {
    expect(truncateTitle("hello", 10)).toBe("hello");
  });

  it("returns input when exactly max", () => {
    expect(truncateTitle("hello", 5)).toBe("hello");
  });

  it("cuts at word boundary inside the cap", () => {
    expect(truncateTitle("hello world there friend", 12)).toBe("hello world…");
  });

  it("falls back to hard cut when no usable word boundary", () => {
    expect(truncateTitle("verylongsinglewordwithnobreaks", 8)).toBe("verylon…");
  });

  it("handles empty string", () => {
    expect(truncateTitle("", 10)).toBe("");
  });
});

describe("formatTaskDetail", () => {
  const modes: DetailMode[] = [
    "course",
    "course-title",
    "full",
    "emoji-course",
  ];

  it.each(modes)(
    "never returns null/undefined for any field (mode=%s)",
    (mode) => {
      const out = formatTaskDetail(makeTask("Task"), mode);
      expect(out.course).toBeTypeOf("string");
      expect(out.body).toBeTypeOf("string");
    },
  );

  it("'course' returns course chip only, no body", () => {
    const out = formatTaskDetail(makeTask("Quiz Ch.4 — Limits"), "course");
    expect(out).toEqual({ course: "Math 31", body: "" });
  });

  it("'course-title' truncates long titles at word boundary", () => {
    const long =
      "Final Exam — Calculus II Comprehensive over chapters one through eight inclusive";
    const out = formatTaskDetail(makeTask(long), "course-title");
    expect(out.course).toBe("Math 31");
    expect(out.body.length).toBeLessThanOrEqual(32);
    expect(out.body.endsWith("…")).toBe(true);
  });

  it("'course-title' keeps short titles intact", () => {
    const out = formatTaskDetail(makeTask("Quiz Ch.4"), "course-title");
    expect(out.body).toBe("Quiz Ch.4");
  });

  it("'full' returns raw title, no truncation", () => {
    const long = "x".repeat(120);
    const out = formatTaskDetail(makeTask(long), "full");
    expect(out.body).toBe(long);
  });

  it("'emoji-course' prefixes emoji to course chip, no body", () => {
    const out = formatTaskDetail(makeTask("X", "assignment"), "emoji-course");
    expect(out.course.startsWith("📝")).toBe(true);
    expect(out.course).toContain("Math 31");
    expect(out.body).toBe("");
  });

  it("emoji map covers every TaskType", () => {
    const types: TaskType[] = [
      "assignment",
      "quiz",
      "exam",
      "event",
      "announcement",
    ];
    for (const type of types) {
      const out = formatTaskDetail(makeTask("X", type), "emoji-course");
      expect(out.course).not.toBe("Math 31"); // emoji prepended
      expect(out.course.length).toBeGreaterThan("Math 31".length);
    }
  });

  it("falls back to course name when shortName is missing", () => {
    const out = formatTaskDetail(
      makeTask("X", "assignment", makeCourse(null, "Calculus II")),
      "course",
    );
    expect(out.course).toBe("Calculus II");
  });

  it("falls back to em-dash when course is null", () => {
    const out = formatTaskDetail(makeTask("X", "assignment", null), "course");
    expect(out.course).toBe("—");
  });

  it("handles empty title", () => {
    const out = formatTaskDetail(makeTask(""), "course-title");
    expect(out.body).toBe("");
  });
});
