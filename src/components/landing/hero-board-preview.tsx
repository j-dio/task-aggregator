"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";

type ColId = "todo" | "inprogress" | "done";

interface Task {
  id: number;
  title: string;
  source: "UVEC" | "GClass";
  due: string;
  hi: boolean;
}

const ALL_TASKS: Task[] = [
  { id: 1, title: "Math 54 – Problem Set 7", source: "UVEC", due: "Due Sat", hi: true },
  { id: 2, title: "Eng 1 – Reaction Paper", source: "GClass", due: "Due Mon", hi: false },
  { id: 3, title: "CS 165 – Lab Activity 4", source: "UVEC", due: "Due Fri", hi: true },
  { id: 4, title: "CMSC 124 – Exercise 3", source: "UVEC", due: "Due Wed", hi: false },
  { id: 5, title: "Soc Sci 2 – Essay Draft", source: "GClass", due: "Due Thu", hi: false },
  { id: 6, title: "Math 54 – Quiz 3", source: "UVEC", due: "Submitted", hi: false },
  { id: 7, title: "Physics 71 – Pre-lab", source: "GClass", due: "Submitted", hi: false },
];

const INIT: Record<ColId, number[]> = {
  todo: [1, 2, 3],
  inprogress: [4, 5],
  done: [6, 7],
};

const COL_LABELS: Record<ColId, string> = {
  todo: "To do",
  inprogress: "In progress",
  done: "Done",
};

const COL_ORDER: ColId[] = ["todo", "inprogress", "done"];
const COL_IDS = new Set<string>(COL_ORDER);

const detect: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length) {
    const col = hits.find((c) => COL_IDS.has(c.id as string));
    return col ? [col] : hits;
  }
  return rectIntersection(args);
};

function CardContent({
  task,
  isDone,
  isOverlay,
}: {
  task: Task;
  isDone: boolean;
  isOverlay?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[2px] border border-border bg-card px-2.5 py-2 select-none",
        isDone && !isOverlay && "opacity-45",
        isOverlay && "shadow-xl ring-1 ring-border/50 rotate-[1.5deg]",
      )}
    >
      <div className="flex items-start gap-1.5">
        <span
          className="mt-[3px] size-1.5 shrink-0 rounded-full"
          style={{
            backgroundColor: task.hi ? "oklch(0.68 0.18 25)" : "transparent",
            border: task.hi ? "none" : "1.5px solid var(--border)",
          }}
        />
        <p
          className={cn(
            "flex-1 truncate text-[10px] font-medium leading-tight",
            isDone && !isOverlay && "line-through decoration-muted-foreground/40",
          )}
        >
          {task.title}
        </p>
      </div>
      <div className="ml-3 mt-0.5 flex items-center gap-1">
        <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground/60">
          {task.source}
        </span>
        <span className="text-[8px] text-muted-foreground/40">·</span>
        <span className="text-[8px] text-muted-foreground/60">{task.due}</span>
      </div>
    </div>
  );
}

function DraggableCard({ task, isDone }: { task: Task; isDone: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "cursor-grab touch-none active:cursor-grabbing",
        isDragging && "opacity-0",
      )}
      {...attributes}
      {...listeners}
      tabIndex={-1}
    >
      <CardContent task={task} isDone={isDone} />
    </div>
  );
}

function DroppableColumn({
  colId,
  taskIds,
  taskMap,
}: {
  colId: ColId;
  taskIds: number[];
  taskMap: Map<number, Task>;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: colId });
  const isDone = colId === "done";

  return (
    <div className={cn("flex flex-col", colId === "done" && "hidden sm:flex")}>
      <div
        className={cn(
          "flex items-center justify-between border-b border-border bg-muted/30 px-3 py-[7px] transition-colors duration-150",
          isOver && "bg-primary/10",
        )}
      >
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {COL_LABELS[colId]}
        </span>
        <span className="text-[9px] text-muted-foreground/50">{taskIds.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-14 flex-col gap-1.5 p-2 transition-colors duration-150",
          isOver && "bg-primary/5",
        )}
      >
        {taskIds.map((id) => {
          const task = taskMap.get(id);
          return task ? <DraggableCard key={id} task={task} isDone={isDone} /> : null;
        })}
      </div>
    </div>
  );
}

export function HeroBoardPreview() {
  const [cols, setCols] = useState<Record<ColId, number[]>>(INIT);
  const [activeId, setActiveId] = useState<number | null>(null);

  const taskMap = useMemo(() => new Map(ALL_TASKS.map((t) => [t.id, t])), []);

  const activeTask = activeId !== null ? (taskMap.get(activeId) ?? null) : null;
  const activeIsDone = activeId !== null ? cols.done.includes(activeId) : false;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 20 } }),
  );

  const onDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as number);
  }, []);

  const onDragEnd = useCallback((e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || !COL_IDS.has(over.id as string)) return;

    const cardId = active.id as number;
    const target = over.id as ColId;

    setCols((prev) => {
      const src = COL_ORDER.find((c) => prev[c].includes(cardId));
      if (!src || src === target) return prev;
      return {
        ...prev,
        [src]: prev[src].filter((id) => id !== cardId),
        [target]: [...prev[target], cardId],
      };
    });
  }, []);

  return (
    <DndContext
      id="hero-board"
      sensors={sensors}
      collisionDetection={detect}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="w-full overflow-hidden rounded-sm border border-border">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-[7px]">
          <span className="size-[7px] rounded-full bg-border" />
          <span className="size-[7px] rounded-full bg-border" />
          <span className="size-[7px] rounded-full bg-border" />
          <span className="ml-2 max-w-[200px] truncate rounded-[2px] border border-border bg-background px-2 py-[2px] text-[9px] text-muted-foreground/50">
            tapo1.app/dashboard
          </span>
        </div>

        {/* Kanban board */}
        <div className="relative overflow-hidden bg-muted/10">
          <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-3">
            {COL_ORDER.map((colId) => (
              <DroppableColumn
                key={colId}
                colId={colId}
                taskIds={cols[colId]}
                taskMap={taskMap}
              />
            ))}
          </div>

          {/* Bottom fade */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14"
            style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }}
          />
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.25, 0.1, 0.25, 1)" }}>
        {activeTask ? <CardContent task={activeTask} isDone={activeIsDone} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
