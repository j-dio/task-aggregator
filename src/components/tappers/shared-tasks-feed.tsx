"use client";

import { useEffect, useMemo, useState } from "react";
import { useSharedTasks } from "@/hooks/use-shared-tasks";
import { useTapperActions } from "@/hooks/use-tapper-actions";
import { mapSharedTaskCardToPreviewTask } from "@/lib/tappers/map-shared-task-to-preview-task";
import { TaskDetailModal } from "@/components/task-detail-modal";
import { SharedTaskCard } from "@/components/tappers/shared-task-card";
import { Skeleton } from "@/components/ui/skeleton";

export function SharedTasksFeed() {
  const { feed, isLoading, error } = useSharedTasks();
  const { markSeen } = useTapperActions();
  const [previewId, setPreviewId] = useState<string | null>(null);

  const sortedFeed = useMemo(
    () =>
      [...feed].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [feed],
  );

  useEffect(() => {
    if (isLoading) return;
    const unseenIds = feed
      .filter((c) => c.seenAt === null)
      .map((c) => c.sharedTaskId);
    if (unseenIds.length === 0) return;
    markSeen.mutate(unseenIds);
  }, [isLoading, feed, markSeen]);

  const preview =
    previewId === null
      ? null
      : (feed.find((c) => c.sharedTaskId === previewId) ?? null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[120px] w-full rounded-[14px]" />
        <Skeleton className="h-[120px] w-full rounded-[14px]" />
        <Skeleton className="h-[120px] w-full rounded-[14px]" />
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
        No shared tasks yet. When a tapper shares a task, it&apos;ll appear here.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {sortedFeed.map((card) => (
          <li key={card.sharedTaskId}>
            <SharedTaskCard
              card={card}
              onTap={() => setPreviewId(card.sharedTaskId)}
            />
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
