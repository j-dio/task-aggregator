import { formatRelativeDate, getTaskUrgency, cn } from "@/lib/utils";

interface CountdownBadgeProps {
  dueDate: string | null;
  className?: string;
}

export function CountdownBadge({ dueDate, className }: CountdownBadgeProps) {
  if (!dueDate) return null;

  const urgency = getTaskUrgency(dueDate);
  const label = formatRelativeDate(new Date(dueDate));

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-xs",
        urgency === "overdue" && "text-destructive",
        urgency === "urgent" && "text-warning",
        (urgency === "soon" || urgency === "upcoming") &&
          "text-muted-foreground",
        urgency === "later" && "text-muted-foreground/70",
        className,
      )}
    >
      {label}
    </span>
  );
}
