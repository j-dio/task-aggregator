"use client";

import type { TaskWithCourse } from "@/types/task";
import { formatRelativeDate, getTaskUrgency } from "@/lib/utils";
import { CourseBadge } from "@/components/course-badge";
import { SourceIcon } from "@/components/source-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Clock } from "lucide-react";

interface TaskDetailModalProps {
  task: TaskWithCourse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const urgencyLabel: Record<string, string> = {
  overdue: "Overdue",
  urgent: "Due today",
  soon: "Due soon",
  upcoming: "Upcoming",
  later: "Later",
  none: "No due date",
};

export function TaskDetailModal({
  task,
  open,
  onOpenChange,
}: TaskDetailModalProps) {
  const urgency = getTaskUrgency(task.dueDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <SourceIcon source={task.source} />
            <span className="text-xs capitalize">
              {task.source === "gclassroom" ? "Google Classroom" : "UVEC"}
            </span>
          </div>
          <DialogTitle className="text-base">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <CourseBadge course={task.course} />
          <Badge variant="secondary" className="text-xs">
            {task.type}
          </Badge>
          <Badge
            variant={task.status === "pending" ? "outline" : "secondary"}
            className="text-xs"
          >
            {task.status}
          </Badge>
        </div>

        {task.dueDate && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-muted-foreground" />
            <span>
              {new Date(task.dueDate).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <span
              className={
                urgency === "overdue"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }
            >
              ({urgencyLabel[urgency]} &middot;{" "}
              {formatRelativeDate(new Date(task.dueDate))})
            </span>
          </div>
        )}

        {task.description && (
          <>
            <Separator />
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {task.description}
            </p>
          </>
        )}

        {task.url && (
          <>
            <Separator />
            <Button variant="outline" size="sm" asChild>
              <a href={task.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                Open in{" "}
                {task.source === "gclassroom" ? "Classroom" : "UVEC"}
              </a>
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
