import type { Course } from "@/types/task";
import { getCourseColor, cn } from "@/lib/utils";

interface CourseBadgeProps {
  course: Course | null;
  className?: string;
}

export function CourseBadge({ course, className }: CourseBadgeProps) {
  if (!course) return null;

  const color = getCourseColor(course.id, course.color);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="truncate max-w-[120px]">{course.name}</span>
    </span>
  );
}
