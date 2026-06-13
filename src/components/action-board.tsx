"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { TaskWithCourse, ActionBoardColumn } from "@/types/task";
import { useTaskActions } from "@/hooks/use-task-actions";
import { ActionBoardColumn as Column } from "@/components/action-board-column";
import { TaskCardOverlay } from "@/components/task-card-overlay";

interface ActionBoardProps {
  todoTasks: TaskWithCourse[];
  inProgressTasks: TaskWithCourse[];
  doneTasks: TaskWithCourse[];
  todoTotal: number;
  inProgressTotal: number;
  doneTotal: number;
  /** All Done-column task IDs (full bucket), for dismiss-all. */
  doneTaskIds: string[];
  onShowMoreTodo?: () => void;
  onShowLessTodo?: () => void;
  onShowMoreDone?: () => void;
  onShowLessDone?: () => void;
  onShowMoreInProgress?: () => void;
  onShowLessInProgress?: () => void;
  onRequestEditCustomTask?: (task: TaskWithCourse) => void;
}

const statusMap: Record<ActionBoardColumn, "pending" | "in_progress" | "done"> =
  {
    todo: "pending",
    in_progress: "in_progress",
    done: "done",
  };

const COLUMN_IDS = new Set<ActionBoardColumn>(["todo", "in_progress", "done"]);

/**
 * Custom collision detection for the kanban board.
 *
 * Strategy:
 * 1. Use pointerWithin — checks what the *mouse pointer* is physically over,
 *    not which corners of the dragged card are geometrically nearest. This
 *    prevents a card in an adjacent column from "stealing" the collision when
 *    dragging across columns (the closestCorners bug).
 * 2. Among the detected collisions, prefer column container IDs over task card
 *    IDs so dropping onto an occupied column reliably resolves to the column.
 * 3. Fall back to rectIntersection when the pointer isn't within any droppable
 *    (e.g. dragging in a gap between columns).
 */
const kanbanCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);

  if (pointerCollisions.length > 0) {
    const columnHit = pointerCollisions.find((c) =>
      COLUMN_IDS.has(c.id as ActionBoardColumn),
    );
    return columnHit ? [columnHit] : pointerCollisions;
  }

  return rectIntersection(args);
};

export function ActionBoard({
  todoTasks,
  inProgressTasks,
  doneTasks,
  todoTotal,
  inProgressTotal,
  doneTotal,
  doneTaskIds,
  onShowMoreTodo,
  onShowLessTodo,
  onShowMoreDone,
  onShowLessDone,
  onShowMoreInProgress,
  onShowLessInProgress,
  onRequestEditCustomTask,
}: ActionBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskWithCourse | null>(null);
  const { setStatus, dismissAll } = useTaskActions();

  const handleRequestEditCustomTask = useCallback(
    (task: TaskWithCourse) => onRequestEditCustomTask?.(task),
    [onRequestEditCustomTask],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      // delay: 250ms hold required before drag activates.
      // tolerance: 20px — how much the finger can move during the hold before
      // the drag is cancelled. 8px was too tight for typical mobile finger
      // jitter and caused drag to cancel before activation.
      activationConstraint: { delay: 250, tolerance: 20 },
    }),
    // Keyboard drag is disabled (keyboardCodes.start is empty) because the
    // activatorNode guard in dnd-kit's KeyboardSensor only fires when
    // activatorNode.current is non-null. SortableTaskCard does not set
    // setActivatorNodeRef, so the guard is bypassed and any Enter/Space keydown
    // reaching the wrapper — including events bubbled from inner buttons and
    // Radix Dialog focus-return — incorrectly activates drag. Pointer and touch
    // drag continue to work. Keyboard navigation within the board is not
    // implemented, so no functionality is lost.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: [], cancel: [], end: [] },
    }),
  );

  const allTasks = useMemo(
    () => [...todoTasks, ...inProgressTasks, ...doneTasks],
    [todoTasks, inProgressTasks, doneTasks],
  );

  const findTask = useCallback(
    (id: string): TaskWithCourse | undefined => {
      return allTasks.find((t) => t.id === id);
    },
    [allTasks],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = findTask(event.active.id as string);
      if (task) setActiveTask(task);
    },
    [findTask],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null);
      const { active, over } = event;

      if (!over) return;

      const taskId = active.id as string;
      const task = findTask(taskId);
      if (!task) return;

      // over.id can be either a column id or a task id (when dropped on top of
      // a card inside a column). Resolve to the column in both cases.
      let targetColumn: ActionBoardColumn;
      if (COLUMN_IDS.has(over.id as ActionBoardColumn)) {
        targetColumn = over.id as ActionBoardColumn;
      } else {
        const overTask = findTask(over.id as string);
        if (!overTask) return;
        if (overTask.status === "done") targetColumn = "done";
        else if (overTask.status === "in_progress")
          targetColumn = "in_progress";
        else targetColumn = "todo";
      }

      const newStatus = statusMap[targetColumn];
      if (!newStatus) return;

      // Skip if status unchanged
      if (task.status === newStatus) return;
      if (
        task.status === "pending" &&
        newStatus === "pending" &&
        task.displayStatus === "overdue"
      )
        return;

      setStatus.mutate({ taskId, status: newStatus });
    },
    [findTask, setStatus],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      measuring={{ droppable: { strategy: MeasuringStrategy.WhileDragging } }}
      autoScroll={{ layoutShiftCompensation: false, threshold: { x: 0.2, y: 0.2 } }}
    >
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 lg:mx-0 lg:gap-5 lg:px-0">
        <Column
          id="todo"
          title="To Do"
          tasks={todoTasks}
          taskTotal={todoTotal}
          accentClass="text-info"
          onShowMore={onShowMoreTodo}
          onShowLess={onShowLessTodo}
          onRequestEditCustomTask={handleRequestEditCustomTask}
        />
        <Column
          id="in_progress"
          title="In Progress"
          tasks={inProgressTasks}
          taskTotal={inProgressTotal}
          accentClass="text-warning"
          onShowMore={onShowMoreInProgress}
          onShowLess={onShowLessInProgress}
          onRequestEditCustomTask={handleRequestEditCustomTask}
        />
        <Column
          id="done"
          title="Done"
          tasks={doneTasks}
          taskTotal={doneTotal}
          accentClass="text-success"
          onShowMore={onShowMoreDone}
          onShowLess={onShowLessDone}
          onDismissAll={() => dismissAll.mutate(doneTaskIds)}
          isDismissAllPending={dismissAll.isPending}
          onRequestEditCustomTask={handleRequestEditCustomTask}
        />
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        }}
      >
        {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
