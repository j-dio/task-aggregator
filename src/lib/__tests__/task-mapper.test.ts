import { describe, expect, it } from "vitest";
import { mapRow, resolveTaskDisplayStatus } from "@/lib/task-mapper";

describe("resolveTaskDisplayStatus", () => {
  const now = new Date("2026-04-28T00:15:00.000Z");

  it("uses the base status when there is no override", () => {
    expect(
      resolveTaskDisplayStatus({
        baseStatus: "in_progress",
        overrideStatus: null,
        dueDate: "2026-04-27T23:59:59.000Z",
        now,
      }),
    ).toEqual({ status: "in_progress", displayStatus: "in_progress" });
  });

  it("uses the override status before deriving display status", () => {
    expect(
      resolveTaskDisplayStatus({
        baseStatus: "pending",
        overrideStatus: "done",
        dueDate: "2026-04-27T23:59:59.000Z",
        now,
      }),
    ).toEqual({ status: "done", displayStatus: "done" });
  });

  it("keeps pending tasks without a due date pending", () => {
    expect(
      resolveTaskDisplayStatus({
        baseStatus: "pending",
        overrideStatus: null,
        dueDate: null,
        now,
      }),
    ).toEqual({ status: "pending", displayStatus: "pending" });
  });

  it("keeps pending tasks due on the same UTC calendar day pending", () => {
    expect(
      resolveTaskDisplayStatus({
        baseStatus: "pending",
        overrideStatus: null,
        dueDate: "2026-04-28T23:59:59.000Z",
        now,
      }),
    ).toEqual({ status: "pending", displayStatus: "pending" });
  });

  it("marks pending tasks due on an earlier UTC calendar day overdue", () => {
    expect(
      resolveTaskDisplayStatus({
        baseStatus: "pending",
        overrideStatus: null,
        dueDate: "2026-04-27T23:59:59.000Z",
        now,
      }),
    ).toEqual({ status: "pending", displayStatus: "overdue" });
  });

  it("uses UTC-day boundaries consistently around midnight", () => {
    expect(
      resolveTaskDisplayStatus({
        baseStatus: "pending",
        overrideStatus: null,
        dueDate: "2026-04-27T23:59:59.999Z",
        now: new Date("2026-04-28T00:00:00.000Z"),
      }).displayStatus,
    ).toBe("overdue");
  });
});

describe("mapRow", () => {
  it("preserves object metadata from the database row", () => {
    const task = mapRow({
      id: "task-1",
      user_id: "user-1",
      course_id: null,
      source: "uvec",
      external_id: "external-1",
      title: "Task",
      description: null,
      type: "assignment",
      status: "pending",
      due_date: null,
      url: null,
      metadata: { sourceName: "UVEC", points: 10 },
      is_custom: false,
      updated_at: "2026-04-28T00:00:00.000Z",
      created_at: "2026-04-28T00:00:00.000Z",
      courses: null,
      task_overrides: null,
    });

    expect(task.metadata).toEqual({ sourceName: "UVEC", points: 10 });
  });

  it("falls back to an object when metadata is null", () => {
    const task = mapRow({
      id: "task-1",
      user_id: "user-1",
      course_id: null,
      source: "uvec",
      external_id: "external-1",
      title: "Task",
      description: null,
      type: "assignment",
      status: "pending",
      due_date: null,
      url: null,
      metadata: null,
      is_custom: false,
      updated_at: "2026-04-28T00:00:00.000Z",
      created_at: "2026-04-28T00:00:00.000Z",
      courses: null,
      task_overrides: null,
    });

    expect(task.metadata).toEqual({});
  });
});
