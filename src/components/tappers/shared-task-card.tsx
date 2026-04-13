"use client";

import type { SharedTaskCard as SharedTaskCardData } from "@/types/tappers";
import { formatRelativeDate, getCourseColor, cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

function displayNameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

interface SharedTaskCardProps {
  card: SharedTaskCardData;
  onTap: () => void;
}

export function SharedTaskCard({ card, onTap }: SharedTaskCardProps) {
  const created = new Date(card.createdAt);
  const courseColor = card.courseName
    ? getCourseColor(`shared-${card.sharedTaskId}`, card.courseColor)
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTap();
        }
      }}
      className="skeu-card relative cursor-pointer rounded-[14px] border p-3 transition-colors hover:bg-muted/40"
    >
      {card.seenAt === null && (
        <span
          className="bg-primary ring-background absolute top-3 right-3 size-2 rounded-full ring-2"
          aria-hidden
        />
      )}
      <div className="flex gap-2.5">
        <Avatar size="sm" className="shrink-0">
          <AvatarFallback className="text-[10px] font-medium">
            {displayNameInitials(card.ownerDisplayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="truncate text-xs font-semibold">
              {card.ownerDisplayName}
            </span>
            <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
              {formatRelativeDate(created)}
            </span>
          </div>
          <div className="bg-muted/25 mt-2 space-y-2 rounded-[10px] border border-border/60 p-2.5">
            <p className="line-clamp-2 text-sm leading-snug font-medium">
              {card.title}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {card.courseName && (
                <span
                  className={cn(
                    "inline-flex max-w-full items-center gap-1 rounded-md border border-border/80 px-1.5 py-0.5 text-[10px] font-medium",
                  )}
                >
                  {courseColor && (
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: courseColor }}
                    />
                  )}
                  <span className="truncate">{card.courseName}</span>
                </span>
              )}
              {card.dueDate && (
                <span className="text-muted-foreground rounded-md border border-border/60 px-1.5 py-0.5 text-[10px]">
                  {new Date(card.dueDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
          {card.addedTaskId != null && (
            <Badge
              variant="outline"
              className="mt-2 border-emerald-500/40 bg-emerald-500/10 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
            >
              Added ✓
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
