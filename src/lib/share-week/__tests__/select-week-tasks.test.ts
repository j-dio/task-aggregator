import { describe, it, expect } from "vitest";
import { selectWeekTasks } from "../select-week-tasks";
import type {
  TaskWithCourse,
  TaskDisplayStatus,
  TaskStatus,
} from "@/types/task";

const NOW = "2026-05-03T12:00:00.000Z";

function makeTask(
  overrides: Partial<TaskWithCourse> & {
    id: string;
    dueDate?: string | null;
    displayStatus?: TaskDisplayStatus;
    status?: TaskStatus;
  },
): TaskWithCourse {
  return {
    id: overrides.id,
    userId: "u",
    courseId: null,
    source: "uvec",
    externalId: overrides.id,
    title: overrides.title ?? "Task",
    description: null,
    type: "assignment",
    status: overrides.status ?? "pending",
    dueDate: overrides.dueDate ?? null,
    url: null,
    metadata: {},
    isCustom: false,
    fetchedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    course: null,
    priority: null,
    notes: null,
    displayStatus: overrides.displayStatus ?? overrides.status ?? "pending",
    ...overrides,
  };
}

const MON = new Date("2026-05-04T00:00:00.000");

describe("selectWeekTasks", () => {
  it("returns [] for empty input", () => {
    expect(selectWeekTasks([], MON)).toEqual([]);
  });

  it("drops tasks with no dueDate", () => {
    const tasks = [makeTask({ id: "a", dueDate: null })];
    expect(selectWeekTasks(tasks, MON)).toEqual([]);
  });

  it("includes tasks of every state — done, dismissed, overdue, in_progress", () => {
    const tasks: TaskWithCourse[] = [
      makeTask({
        id: "done",
        dueDate: "2026-05-04T10:00:00.000",
        displayStatus: "done",
      }),
      makeTask({
        id: "dismissed",
        dueDate: "2026-05-05T10:00:00.000",
        displayStatus: "dismissed",
      }),
      makeTask({
        id: "overdue",
        dueDate: "2026-05-06T10:00:00.000",
        displayStatus: "overdue",
      }),
      makeTask({
        id: "in_progress",
        dueDate: "2026-05-07T10:00:00.000",
        displayStatus: "in_progress",
      }),
      makeTask({
        id: "pending",
        dueDate: "2026-05-08T10:00:00.000",
        displayStatus: "pending",
      }),
    ];
    expect(selectWeekTasks(tasks, MON).map((t) => t.id)).toEqual([
      "done",
      "dismissed",
      "overdue",
      "in_progress",
      "pending",
    ]);
  });

  it("includes a task at exactly Mon 00:00 local", () => {
    const tasks = [makeTask({ id: "a", dueDate: "2026-05-04T00:00:00.000" })];
    expect(selectWeekTasks(tasks, MON).map((t) => t.id)).toEqual(["a"]);
  });

  it("includes a task at Sun 23:59:59.999 local", () => {
    const tasks = [makeTask({ id: "a", dueDate: "2026-05-10T23:59:59.999" })];
    expect(selectWeekTasks(tasks, MON).map((t) => t.id)).toEqual(["a"]);
  });

  it("excludes a task at the next Mon 00:00 local", () => {
    const tasks = [makeTask({ id: "a", dueDate: "2026-05-11T00:00:00.000" })];
    expect(selectWeekTasks(tasks, MON).map((t) => t.id)).toEqual([]);
  });

  it("excludes tasks before the week", () => {
    const tasks = [makeTask({ id: "a", dueDate: "2026-05-03T23:59:59.999" })];
    expect(selectWeekTasks(tasks, MON).map((t) => t.id)).toEqual([]);
  });

  it("sorts ascending by dueDate", () => {
    const tasks = [
      makeTask({ id: "late", dueDate: "2026-05-08T10:00:00.000" }),
      makeTask({ id: "early", dueDate: "2026-05-04T10:00:00.000" }),
      makeTask({ id: "mid", dueDate: "2026-05-06T10:00:00.000" }),
    ];
    const out = selectWeekTasks(tasks, MON);
    expect(out.map((t) => t.id)).toEqual(["early", "mid", "late"]);
  });
});
