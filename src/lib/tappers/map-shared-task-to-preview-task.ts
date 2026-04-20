import type { SharedTaskCard } from "@/types/tappers";
import type { Course, TaskType, TaskWithCourse } from "@/types/task";

const TASK_TYPES: TaskType[] = [
  "assignment",
  "quiz",
  "exam",
  "event",
  "announcement",
];

function normalizeType(raw: string): TaskType {
  return TASK_TYPES.includes(raw as TaskType) ? (raw as TaskType) : "assignment";
}

/**
 * Builds a {@link TaskWithCourse} suitable for read-only display in
 * {@link TaskDetailModal} preview mode (shared inbox).
 */
export function mapSharedTaskCardToPreviewTask(
  card: SharedTaskCard,
): TaskWithCourse {
  const now = new Date().toISOString();
  const course: Course | null = card.courseName
    ? {
        id: `shared-preview-course-${card.sharedTaskId}`,
        userId: card.ownerId,
        source: "custom",
        externalId: "",
        name: card.courseName,
        shortName: null,
        instructor: null,
        color: card.courseColor,
        isArchived: false,
        createdAt: card.createdAt,
      }
    : null;

  return {
    id: card.taskId,
    userId: card.ownerId,
    courseId: null,
    source: "custom",
    externalId: "",
    title: card.title,
    description: card.description,
    type: normalizeType(card.type),
    status: "pending",
    dueDate: card.dueDate,
    url: null,
    metadata: {},
    isCustom: true,
    fetchedAt: now,
    createdAt: card.createdAt,
    updatedAt: now,
    course,
    priority: null,
    notes: null,
    displayStatus: "pending",
  };
}
