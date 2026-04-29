import type { ParsedTask, TaskSource, TaskStatus } from "@/types/task";

export interface TaskUpsertRow {
  user_id: string;
  external_id: string;
  source: TaskSource;
  title: string;
  description: string | null;
  due_date: string | null;
  type: ParsedTask["type"];
  course_id: string | null;
  url?: string;
  status?: TaskStatus;
}

export function taskStatusKey(externalId: string, source: TaskSource): string {
  return `${externalId}:${source}`;
}

export function buildTaskUpsertRows({
  tasks,
  userId,
  courseMap,
  existingStatuses,
}: {
  tasks: ParsedTask[];
  userId: string;
  courseMap: Map<string, string>;
  existingStatuses: Map<string, TaskStatus>;
}): TaskUpsertRow[] {
  return tasks.map((t) => {
    const courseKey = t.courseExternalId
      ? `${t.courseExternalId}:${t.source}`
      : null;
    const row: TaskUpsertRow = {
      user_id: userId,
      external_id: t.externalId,
      source: t.source,
      title: t.title,
      description: t.description,
      due_date: t.dueDate,
      type: t.type,
      course_id: courseKey ? (courseMap.get(courseKey) ?? null) : null,
    };

    if (t.url) {
      row.url = t.url;
    }

    const existingStatus = existingStatuses.get(
      taskStatusKey(t.externalId, t.source),
    );
    // Parser status wins; otherwise carry forward the DB status so UVEC/no-status syncs do not reset it.
    const status = t.status ?? existingStatus;
    if (status) {
      row.status = status;
    }

    return row;
  });
}
