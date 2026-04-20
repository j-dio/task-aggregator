import { describe, it, expect } from "vitest";
import {
  computeActionBoardBuckets,
  isTaskOnActionBoardActiveColumns,
} from "../use-action-board";
import type { TaskWithCourse } from "@/types/task";

// Fixed reference time: 2026-03-05 12:00:00 UTC
const NOW = new Date("2026-03-05T12:00:00Z").getTime();
const DAY = 24 * 60 * 60 * 1000;

function makeTask(overrides: Partial<TaskWithCourse>): TaskWithCourse {
  return {
    id: "t1",
    userId: "u1",
    courseId: null,
    source: "uvec",
    externalId: "e1",
    title: "Test Task",
    description: null,
    type: "assignment",
    status: "pending",
    dueDate: null,
    url: null,
    metadata: {},
    isCustom: false,
    fetchedAt: new Date(NOW).toISOString(),
    createdAt: new Date(NOW).toISOString(),
    updatedAt: new Date(NOW).toISOString(),
    course: null,
    ...overrides,
  };
}

describe("computeActionBoardBuckets", () => {
  // ---- Filtering -------------------------------------------------------

  it("skips dismissed tasks", () => {
    const task = makeTask({ status: "dismissed" });
    const result = computeActionBoardBuckets([task], NOW, 7);
    expect(result.todo).toHaveLength(0);
    expect(result.inProgress).toHaveLength(0);
    expect(result.done).toHaveLength(0);
  });

  it("places in_progress tasks in inProgress bucket", () => {
    const task = makeTask({ status: "in_progress" });
    const result = computeActionBoardBuckets([task], NOW, 7);
    expect(result.inProgress).toHaveLength(1);
    expect(result.todo).toHaveLength(0);
  });

  it("places done tasks completed within 7 days in done bucket", () => {
    const task = makeTask({
      id: "recent-done",
      status: "done",
      updatedAt: new Date(NOW - 2 * DAY).toISOString(),
    });
    const result = computeActionBoardBuckets([task], NOW, 7);
    expect(result.done).toHaveLength(1);
  });

  it("excludes done tasks completed more than 7 days ago", () => {
    const task = makeTask({
      status: "done",
      updatedAt: new Date(NOW - 8 * DAY).toISOString(),
    });
    const result = computeActionBoardBuckets([task], NOW, 7);
    expect(result.done).toHaveLength(0);
  });

  // ---- Todo window -----------------------------------------------------

  it("places pending task with no dueDate in todo", () => {
    const task = makeTask({ status: "pending", dueDate: null });
    const result = computeActionBoardBuckets([task], NOW, 7);
    expect(result.todo).toHaveLength(1);
    expect(result.todoHasMore).toBe(false);
  });

  it("places pending task due within window in todo", () => {
    const task = makeTask({
      status: "pending",
      dueDate: new Date(NOW + 3 * DAY).toISOString(),
    });
    const result = computeActionBoardBuckets([task], NOW, 7);
    expect(result.todo).toHaveLength(1);
    expect(result.todoHasMore).toBe(false);
  });

  it("excludes pending task due beyond window and keeps todoHasMore false", () => {
    const task = makeTask({
      status: "pending",
      dueDate: new Date(NOW + 10 * DAY).toISOString(),
    });
    const result = computeActionBoardBuckets([task], NOW, 7);
    expect(result.todo).toHaveLength(0);
    expect(result.todoHasMore).toBe(false);
  });

  it("includes task beyond 7-day window when todoWindowDays is 14", () => {
    const task = makeTask({
      status: "pending",
      dueDate: new Date(NOW + 10 * DAY).toISOString(),
    });
    const result = computeActionBoardBuckets([task], NOW, 14);
    expect(result.todo).toHaveLength(1);
    expect(result.todoHasMore).toBe(false);
  });

  it("includes overdue (past due) pending tasks regardless of window", () => {
    const task = makeTask({
      status: "pending",
      dueDate: new Date(NOW - 2 * DAY).toISOString(),
    });
    const result = computeActionBoardBuckets([task], NOW, 7);
    expect(result.todo).toHaveLength(1);
  });

  it("sets todoHasMore true when todo tasks in window exceed todoDisplayLimit", () => {
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    const tasks = Array.from({ length: 8 }, (_, i) =>
      makeTask({
        id: `todo${i}`,
        status: "pending",
        dueDate: new Date(NOW + (i + 1) * TWELVE_HOURS).toISOString(),
      }),
    );
    const result = computeActionBoardBuckets(tasks, NOW, 7);
    expect(result.todo).toHaveLength(7);
    expect(result.todoTotal).toBe(8);
    expect(result.todoHasMore).toBe(true);
  });

  it("keeps todoHasMore false when in-window tasks are exactly at limit and only out-of-window tasks remain", () => {
    const inWindowTasks = Array.from({ length: 7 }, (_, i) =>
      makeTask({
        id: `todo-in-window-${i}`,
        status: "pending",
        dueDate: new Date(NOW + (i + 1) * DAY).toISOString(),
      }),
    );
    const outOfWindowTask = makeTask({
      id: "todo-out-window",
      status: "pending",
      dueDate: new Date(NOW + 10 * DAY).toISOString(),
    });

    const result = computeActionBoardBuckets(
      [...inWindowTasks, outOfWindowTask],
      NOW,
      7,
    );

    expect(result.todo).toHaveLength(7);
    expect(result.todoTotal).toBe(7);
    expect(result.todoHasMore).toBe(false);
  });

  // ---- Sorting ---------------------------------------------------------

  it("sorts todo tasks by dueDate ascending (most urgent first)", () => {
    const soon = makeTask({
      id: "soon",
      status: "pending",
      dueDate: new Date(NOW + 1 * DAY).toISOString(),
    });
    const later = makeTask({
      id: "later",
      status: "pending",
      dueDate: new Date(NOW + 5 * DAY).toISOString(),
    });
    const result = computeActionBoardBuckets([later, soon], NOW, 7);
    expect(result.todo[0].id).toBe("soon");
    expect(result.todo[1].id).toBe("later");
  });

  it("places tasks with no dueDate after dated tasks in todo", () => {
    const undated = makeTask({
      id: "undated",
      status: "pending",
      dueDate: null,
    });
    const dated = makeTask({
      id: "dated",
      status: "pending",
      dueDate: new Date(NOW + 1 * DAY).toISOString(),
    });
    const result = computeActionBoardBuckets([undated, dated], NOW, 7);
    expect(result.todo[0].id).toBe("dated");
    expect(result.todo[1].id).toBe("undated");
  });

  it("sorts done tasks by updatedAt descending (most recently done first)", () => {
    const older = makeTask({
      id: "older",
      status: "done",
      updatedAt: new Date(NOW - 3 * DAY).toISOString(),
    });
    const newer = makeTask({
      id: "newer",
      status: "done",
      updatedAt: new Date(NOW - 1 * DAY).toISOString(),
    });
    const result = computeActionBoardBuckets([older, newer], NOW, 7);
    expect(result.done[0].id).toBe("newer");
    expect(result.done[1].id).toBe("older");
  });

  // ---- Mixed buckets ---------------------------------------------------

  it("correctly distributes a mixed task list into all three buckets", () => {
    const tasks = [
      makeTask({
        id: "todo",
        status: "pending",
        dueDate: new Date(NOW + 1 * DAY).toISOString(),
      }),
      makeTask({ id: "wip", status: "in_progress" }),
      makeTask({
        id: "done",
        status: "done",
        updatedAt: new Date(NOW - 1 * DAY).toISOString(),
      }),
      makeTask({ id: "dismissed", status: "dismissed" }),
      makeTask({
        id: "far",
        status: "pending",
        dueDate: new Date(NOW + 20 * DAY).toISOString(),
      }),
    ];
    const result = computeActionBoardBuckets(tasks, NOW, 7);
    expect(result.todo).toHaveLength(1);
    expect(result.inProgress).toHaveLength(1);
    expect(result.done).toHaveLength(1);
    expect(result.todoTotal).toBe(1);
    expect(result.inProgressTotal).toBe(1);
    expect(result.doneTotal).toBe(1);
    expect(result.doneTaskIds).toEqual(["done"]);
    expect(result.todoHasMore).toBe(false);
  });

  // ---- Custom tasks ----------------------------------------------------

  it("routes a custom source task to todo bucket like any other pending task", () => {
    const task = makeTask({
      id: "custom-1",
      source: "custom",
      isCustom: true,
      status: "pending",
      dueDate: new Date(NOW + 2 * DAY).toISOString(),
    });
    const result = computeActionBoardBuckets([task], NOW, 7);
    expect(result.todo).toHaveLength(1);
    expect(result.todo[0].source).toBe("custom");
  });

  it("routes a custom task marked done into the done bucket", () => {
    const task = makeTask({
      id: "custom-done",
      source: "custom",
      isCustom: true,
      status: "done",
      updatedAt: new Date(NOW - 1 * DAY).toISOString(),
    });
    const result = computeActionBoardBuckets([task], NOW, 7);
    expect(result.done).toHaveLength(1);
  });

  it("dismiss-all: tasks with status dismissed are excluded from all buckets", () => {
    const tasks = [
      makeTask({
        id: "d1",
        status: "dismissed",
      }),
      makeTask({
        id: "d2",
        status: "dismissed",
      }),
    ];
    const result = computeActionBoardBuckets(tasks, NOW, 7);
    expect(result.todo).toHaveLength(0);
    expect(result.inProgress).toHaveLength(0);
    expect(result.done).toHaveLength(0);
    expect(result.todoTotal).toBe(0);
    expect(result.inProgressTotal).toBe(0);
    expect(result.doneTotal).toBe(0);
    expect(result.doneTaskIds).toEqual([]);
  });

  // ---- Done bucket (hardcoded 7-day window + count-based display limit) ----

  it("includes done task within 7-day window and sets doneHasMore false", () => {
    const task = makeTask({
      id: "done-recent",
      status: "done",
      updatedAt: new Date(NOW - 3 * DAY).toISOString(),
    });
    const result = computeActionBoardBuckets([task], NOW, 7);
    expect(result.done).toHaveLength(1);
    expect(result.doneHasMore).toBe(false);
  });

  it("silently drops done task beyond 7-day window; doneHasMore stays false (count-based only)", () => {
    const task = makeTask({
      id: "done-old",
      status: "done",
      updatedAt: new Date(NOW - 10 * DAY).toISOString(),
    });
    const result = computeActionBoardBuckets([task], NOW, 7);
    expect(result.done).toHaveLength(0);
    expect(result.doneHasMore).toBe(false);
  });

  it("sets doneHasMore true when done bucket exceeds doneDisplayLimit", () => {
    // 8 tasks spread 20 hours apart — all within the 7-day window
    const TWENTY_HOURS = 20 * 60 * 60 * 1000;
    const tasks = Array.from({ length: 8 }, (_, i) =>
      makeTask({
        id: `done${i}`,
        status: "done",
        updatedAt: new Date(NOW - i * TWENTY_HOURS).toISOString(),
      }),
    );
    const result = computeActionBoardBuckets(tasks, NOW, 7);
    expect(result.done).toHaveLength(7);
    expect(result.doneTotal).toBe(8);
    expect(result.doneTaskIds).toHaveLength(8);
    expect(result.doneTaskIds).toEqual(
      tasks.map((t) => t.id),
    );
    expect(result.doneHasMore).toBe(true);
  });

  // ---- In Progress display limit ---------------------------------------

  it("shows all tasks when in-progress count is within inProgressDisplayLimit", () => {
    const tasks = [
      makeTask({ id: "ip1", status: "in_progress" }),
      makeTask({ id: "ip2", status: "in_progress" }),
      makeTask({ id: "ip3", status: "in_progress" }),
    ];
    const result = computeActionBoardBuckets(tasks, NOW, 7, 7, 7, 5);
    expect(result.inProgress).toHaveLength(3);
    expect(result.inProgressHasMore).toBe(false);
  });

  it("limits in-progress to inProgressDisplayLimit and sets inProgressHasMore true", () => {
    const tasks = Array.from({ length: 7 }, (_, i) =>
      makeTask({ id: `ip${i}`, status: "in_progress" }),
    );
    const result = computeActionBoardBuckets(tasks, NOW, 7, 7, 7, 5);
    expect(result.inProgress).toHaveLength(5);
    expect(result.inProgressTotal).toBe(7);
    expect(result.inProgressHasMore).toBe(true);
  });

  it("shows all 8 tasks when inProgressDisplayLimit is 10", () => {
    const tasks = Array.from({ length: 8 }, (_, i) =>
      makeTask({ id: `ip${i}`, status: "in_progress" }),
    );
    const result = computeActionBoardBuckets(tasks, NOW, 7, 7, 7, 10);
    expect(result.inProgress).toHaveLength(8);
    expect(result.inProgressHasMore).toBe(false);
  });
});

describe("isTaskOnActionBoardActiveColumns", () => {
  it("returns false for done and dismissed", () => {
    expect(
      isTaskOnActionBoardActiveColumns(makeTask({ status: "done" }), NOW, 14),
    ).toBe(false);
    expect(
      isTaskOnActionBoardActiveColumns(
        makeTask({ status: "dismissed" }),
        NOW,
        14,
      ),
    ).toBe(false);
  });

  it("returns true for in_progress regardless of far due date", () => {
    expect(
      isTaskOnActionBoardActiveColumns(
        makeTask({
          status: "in_progress",
          dueDate: new Date(NOW + 40 * DAY).toISOString(),
        }),
        NOW,
        14,
      ),
    ).toBe(true);
  });

  it("returns false for pending beyond todo window", () => {
    expect(
      isTaskOnActionBoardActiveColumns(
        makeTask({
          status: "pending",
          dueDate: new Date(NOW + 20 * DAY).toISOString(),
        }),
        NOW,
        14,
      ),
    ).toBe(false);
  });

  it("returns true for pending within todo window", () => {
    expect(
      isTaskOnActionBoardActiveColumns(
        makeTask({
          status: "pending",
          dueDate: new Date(NOW + 10 * DAY).toISOString(),
        }),
        NOW,
        14,
      ),
    ).toBe(true);
  });
});
