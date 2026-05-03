import type { TaskWithCourse } from "@/types/task";
import type { DetailMode } from "@/lib/share-week/format-task-detail";

export type { DetailMode };

export interface WeekLayoutProps {
  weekStart: Date;
  tasks: TaskWithCourse[];
  detailMode: DetailMode;
}

// Re-exported from format-task-detail so existing imports don't break.
export {
  formatTaskDetail,
  truncateTitle,
} from "@/lib/share-week/format-task-detail";

export function courseLabel(task: TaskWithCourse): string {
  return task.course?.shortName ?? task.course?.name ?? "—";
}
