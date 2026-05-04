import type { TaskWithCourse, TaskType } from "@/types/task";

export type DetailMode = "course" | "course-title" | "full" | "emoji-course";

export interface TaskDetail {
  /** Chip text — always non-empty. */
  course: string;
  /** Title body to render alongside the chip. Empty for course-only modes. */
  body: string;
}

const TYPE_EMOJI: Record<TaskType, string> = {
  assignment: "📝",
  quiz: "❓",
  exam: "📚",
  event: "📅",
  announcement: "📣",
};

const COURSE_TITLE_MAX = 32;

/**
 * Truncate at a word boundary inside `max`, falling back to a hard cut
 * when no usable space is available. Always appends an ellipsis when
 * truncating, never when the input fits as-is.
 */
export function truncateTitle(title: string, max: number): string {
  if (title.length <= max) return title;
  const slice = title.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut}…`;
}

function courseLabel(task: TaskWithCourse): string {
  return task.course?.shortName ?? task.course?.name ?? "—";
}

export function formatTaskDetail(
  task: TaskWithCourse,
  mode: DetailMode,
): TaskDetail {
  const course = courseLabel(task);

  switch (mode) {
    case "course":
      return { course, body: "" };
    case "course-title":
      return { course, body: truncateTitle(task.title, COURSE_TITLE_MAX) };
    case "full":
      return { course, body: task.title };
    case "emoji-course": {
      const emoji = TYPE_EMOJI[task.type] ?? "•";
      return { course: `${emoji} ${course}`, body: "" };
    }
  }
}
