import { buildTaskUpsertRows } from "../sync-task-rows";
import type { ParsedTask } from "@/types/task";

const baseTask: ParsedTask = {
  externalId: "task-1",
  title: "Assignment",
  description: null,
  dueDate: null,
  type: "assignment",
  source: "gclassroom",
  courseExternalId: "course-1",
  url: null,
};

describe("buildTaskUpsertRows", () => {
  it("should preserve existing status when parser leaves status undefined", () => {
    const rows = buildTaskUpsertRows({
      tasks: [baseTask],
      userId: "user-1",
      courseMap: new Map([["course-1:gclassroom", "course-db-1"]]),
      existingStatuses: new Map([["task-1:gclassroom", "in_progress"]]),
    });

    expect(rows[0]).toMatchObject({
      external_id: "task-1",
      status: "in_progress",
    });
  });

  it("should prefer explicit parser status over existing status", () => {
    const rows = buildTaskUpsertRows({
      tasks: [{ ...baseTask, status: "done" }],
      userId: "user-1",
      courseMap: new Map([["course-1:gclassroom", "course-db-1"]]),
      existingStatuses: new Map([["task-1:gclassroom", "in_progress"]]),
    });

    expect(rows[0]).toMatchObject({
      external_id: "task-1",
      status: "done",
    });
  });
});
