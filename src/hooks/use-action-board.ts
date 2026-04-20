"use client";

import { useMemo, useState } from "react";
import type { TaskWithCourse, ActionBoardBuckets } from "@/types/task";

const DONE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Days ahead for the To Do column — keep in sync with `useActionBoard` and `useUpNext`. */
export const ACTION_BOARD_TODO_WINDOW_DAYS = 14;

/**
 * True if the task would appear in the To Do or In Progress column (not Done,
 * not dismissed, and pending tasks respect the same due-date window as the board).
 */
export function isTaskOnActionBoardActiveColumns(
  task: TaskWithCourse,
  now: number,
  todoWindowDays: number,
): boolean {
  if (task.status === "dismissed" || task.status === "done") return false;
  if (task.status === "in_progress") return true;
  const dueMs = task.dueDate ? new Date(task.dueDate).getTime() : null;
  const todoWindowMs = todoWindowDays * 24 * 60 * 60 * 1000;
  return dueMs === null || dueMs <= now + todoWindowMs;
}

/**
 * Pure bucketing logic extracted from the hook so it can be unit-tested
 * without a React renderer.
 *
 * @param tasks                  All tasks from useTasks.
 * @param now                    Epoch ms timestamp to compare against (pass Date.now()).
 * @param todoWindowDays         How many days ahead to include in the To Do bucket.
 * @param todoDisplayLimit       Max number of to-do tasks to show (default 7).
 * @param doneDisplayLimit       Max number of done tasks to show (default 7).
 * @param inProgressDisplayLimit Max number of in-progress tasks to show (default 7).
 */
export function computeActionBoardBuckets(
  tasks: TaskWithCourse[],
  now: number,
  todoWindowDays: number,
  todoDisplayLimit = 7,
  doneDisplayLimit = 7,
  inProgressDisplayLimit = 7,
): ActionBoardBuckets {
  const todoWindowMs = todoWindowDays * 24 * 60 * 60 * 1000;
  const buckets: ActionBoardBuckets = {
    todo: [],
    inProgress: [],
    done: [],
    todoTotal: 0,
    inProgressTotal: 0,
    doneTotal: 0,
    doneTaskIds: [],
    todoHasMore: false,
    inProgressHasMore: false,
    doneHasMore: false,
  };

  for (const task of tasks) {
    if (task.status === "dismissed") continue;

    if (task.status === "done") {
      const completedAt = new Date(task.updatedAt).getTime();
      if (now - completedAt <= DONE_WINDOW_MS) {
        buckets.done.push(task);
      }
      // tasks beyond the 7-day window are silently dropped
    } else if (task.status === "in_progress") {
      buckets.inProgress.push(task);
    } else {
      const dueMs = task.dueDate ? new Date(task.dueDate).getTime() : null;
      if (dueMs === null || dueMs <= now + todoWindowMs) {
        buckets.todo.push(task);
      }
    }
  }

  // To Do: most urgent (earliest due date) at top, then apply display limit
  buckets.todo.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
  buckets.todoTotal = buckets.todo.length;
  if (buckets.todo.length > todoDisplayLimit) {
    buckets.todoHasMore = true;
    buckets.todo = buckets.todo.slice(0, todoDisplayLimit);
  }

  // In Progress: most urgent at top, then apply display limit
  buckets.inProgress.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
  buckets.inProgressTotal = buckets.inProgress.length;
  if (buckets.inProgress.length > inProgressDisplayLimit) {
    buckets.inProgressHasMore = true;
    buckets.inProgress = buckets.inProgress.slice(0, inProgressDisplayLimit);
  }

  // Done: most recently completed first, then apply display limit
  buckets.done.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  buckets.doneTotal = buckets.done.length;
  buckets.doneTaskIds = buckets.done.map((t) => t.id);
  if (buckets.done.length > doneDisplayLimit) {
    buckets.doneHasMore = true;
    buckets.done = buckets.done.slice(0, doneDisplayLimit);
  }

  return buckets;
}

/**
 * @param tasks                  All tasks returned by useTasks.
 * @param todoDisplayLimit       Max to-do tasks to show (default 7).
 * @param doneDisplayLimit       Max done tasks to show (default 7).
 * @param inProgressDisplayLimit Max in-progress tasks to show (default 7).
 *
 * Time windows are hardcoded: todo looks 7 days ahead, done looks 7 days back.
 */
export function useActionBoard(
  tasks: TaskWithCourse[],
  todoDisplayLimit = 7,
  doneDisplayLimit = 7,
  inProgressDisplayLimit = 7,
): ActionBoardBuckets {
  // Snapshot the current time once at mount via useState's lazy initialiser.
  // Passing `Date.now` as a function *reference* means React calls it
  // internally — the React Compiler never sees a direct impure call.
  const [snapNow] = useState(Date.now);

  return useMemo(
    () =>
      computeActionBoardBuckets(
        tasks,
        snapNow,
        ACTION_BOARD_TODO_WINDOW_DAYS,
        todoDisplayLimit,
        doneDisplayLimit,
        inProgressDisplayLimit,
      ),
    [
      tasks,
      snapNow,
      todoDisplayLimit,
      doneDisplayLimit,
      inProgressDisplayLimit,
    ],
  );
}
