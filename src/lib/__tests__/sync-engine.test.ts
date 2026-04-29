// Integration tests for sync engine

import { vi, describe, it, expect, beforeEach } from "vitest";

// vi.mock factories are hoisted — vi.hoisted ensures these are ready in time
const mockCaptureException = vi.hoisted(() => vi.fn());
const courseWorkError = vi.hoisted(() => new Error("Quota exceeded"));

vi.mock("@sentry/nextjs", () => ({
  captureException: mockCaptureException,
}));

vi.mock("@/services/gclassroom-service", () => ({
  GClassroomService: class MockGClassroomService {
    getCourses() {
      return Promise.resolve([
        { id: "course-ok", name: "CS 101" },
        { id: "course-fail", name: "MATH 201" },
      ]);
    }
    getCourseWork(courseId: string) {
      if (courseId === "course-fail")
        return Promise.reject(courseWorkError);
      return Promise.resolve([]);
    }
    getStudentSubmissions() {
      return Promise.resolve(new Map());
    }
  },
  refreshGoogleAccessToken: () =>
    Promise.reject(new Error("not used in these tests")),
}));

vi.mock("@/lib/parsers/gclassroom-parser", () => ({
  parseGClassroomResponse: vi.fn().mockReturnValue([]),
}));

import { syncTasks } from "../sync-engine";

const BASE_CONFIG = { supabaseAccessToken: "test-token" };

describe("syncTasks", () => {
  it("should return empty tasks with helpful error when no sources configured", async () => {
    const result = await syncTasks(BASE_CONFIG);
    expect(result.tasks).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("No data sources configured");
  });

  it("should return SyncResult shape", async () => {
    const result = await syncTasks(BASE_CONFIG);
    expect(result).toHaveProperty("tasks");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.tasks)).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

describe("syncTasks — Sentry course-level failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures exception with course context when a GClassroom course fetch fails", async () => {
    await syncTasks({ gclassroomToken: "test-token" });

    expect(mockCaptureException).toHaveBeenCalledOnce();

    const [capturedErr, capturedContext] =
      mockCaptureException.mock.calls[0] as [unknown, unknown];
    expect(capturedErr).toBeInstanceOf(Error);
    expect((capturedErr as Error).message).toBe("Quota exceeded");
    expect(capturedContext).toMatchObject({
      tags: { source: "gclassroom" },
      extra: { courseExternalId: "course-fail" },
    });
  });

  it("still pushes a human-readable error to errors[]", async () => {
    const result = await syncTasks({ gclassroomToken: "test-token" });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Failed to fetch courseWork");
    expect(result.errors[0]).toContain("Quota exceeded");
  });

  it("includes course names from the successful course despite the failure", async () => {
    const result = await syncTasks({ gclassroomToken: "test-token" });
    expect(result.courseNames.get("course-ok")).toBe("CS 101");
  });
});
