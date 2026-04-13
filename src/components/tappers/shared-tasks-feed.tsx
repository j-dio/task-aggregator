"use client";

import { useState } from "react";
import { useSharedTasks } from "@/hooks/use-shared-tasks";
import { mapSharedTaskCardToPreviewTask } from "@/lib/tappers/map-shared-task-to-preview-task";
import { TaskDetailModal } from "@/components/task-detail-modal";
import { Skeleton } from "@/components/ui/skeleton";

export function SharedTasksFeed() {
  const { feed, isLoading, error } = useSharedTasks();
  const [previewId, setPreviewId] = useState<string | null>(null);

  const preview =
    previewId === null
      ? null
      : (feed.find((c) => c.sharedTaskId === previewId) ?? null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full rounded-[14px]" />
        <Skeleton className="h-14 w-full rounded-[14px]" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">
        {error instanceof Error ? error.message : "Failed to load shared tasks"}
      </p>
    );
  }

  if (feed.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        When a tapper shares a task with you, it will show up here.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {feed.map((card) => (
          <li key={card.sharedTaskId}>
            <button
              type="button"
              onClick={() => setPreviewId(card.sharedTaskId)}
              className="skeu-card hover:bg-muted/40 w-full rounded-[14px] border px-3 py-3 text-left transition-colors"
            >
              <span className="line-clamp-2 text-sm font-medium">
                {card.title}
              </span>
              <span className="text-muted-foreground mt-1 block text-xs">
                From {card.ownerDisplayName}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {preview && (
        <TaskDetailModal
          key={preview.sharedTaskId}
          mode="preview"
          task={mapSharedTaskCardToPreviewTask(preview)}
          open
          onOpenChange={(next) => {
            if (!next) setPreviewId(null);
          }}
          sharedTaskId={preview.sharedTaskId}
          senderName={preview.ownerDisplayName}
          addedTaskId={preview.addedTaskId}
        />
      )}
    </>
  );
}
