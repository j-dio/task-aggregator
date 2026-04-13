"use client";

import { useEffect, useState } from "react";
import { useSortable, defaultAnimateLayoutChanges } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { TaskWithCourse } from "@/types/task";
import { TaskCard } from "@/components/task-card";

interface SortableTaskCardProps {
  task: TaskWithCourse;
  onRequestEditCustomTask?: (task: TaskWithCourse) => void;
}

export function SortableTaskCard({
  task,
  onRequestEditCustomTask,
}: SortableTaskCardProps) {
  // Track whether the task detail modal is open so we can suspend drag
  // listeners while it is — otherwise touch events inside the modal bleed
  // through to the dnd-kit sensor and trigger unwanted drags.
  const [modalOpen, setModalOpen] = useState(false);

  // Detect mobile so we can route listeners to the grip handle only.
  // Lazy init reads matchMedia on first client render (SSR-safe).
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    animateLayoutChanges: defaultAnimateLayoutChanges,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // On desktop: spread listeners on the whole wrapper so the full card is
  // pointer-draggable (existing behaviour).
  // On mobile: listeners go only on the grip handle inside TaskCard so that
  // touching the card body never starts the drag timer.
  const activeListeners = modalOpen ? undefined : listeners;
  const wrapperListeners: SyntheticListenerMap | undefined = isMobile ? undefined : activeListeners;
  const handleListeners: SyntheticListenerMap | undefined = isMobile ? activeListeners : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        modalOpen || isMobile
          ? "transition-transform duration-200"
          : "cursor-grab transition-transform duration-200 active:cursor-grabbing"
      }
      {...attributes}
      // Override dnd-kit's default tabIndex={0} so the drag wrapper is not
      // reachable via keyboard Tab. Pointer and touch drag continue to work
      // normally via listeners on wrapper (desktop) or grip handle (mobile).
      tabIndex={-1}
      {...(wrapperListeners ?? {})}
    >
      <TaskCard
        task={task}
        isDragging={isDragging}
        onModalOpenChange={setModalOpen}
        dragHandleListeners={handleListeners}
        onRequestEditCustomTask={onRequestEditCustomTask}
      />
    </div>
  );
}
