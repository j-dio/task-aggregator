"use client";

import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { TaskPriority, TaskStatus, TaskWithCourse } from "@/types/task";
import { resolveTaskDisplayStatus } from "@/lib/task-mapper";
import {
  createCustomTask,
  updateCustomTask,
  deleteCustomTask,
} from "@/lib/actions/tasks";
import type {
  CreateCustomTaskInput,
  UpdateCustomTaskInput,
} from "@/lib/validations/tasks";

interface TaskOverridePayload {
  taskId: string;
  customStatus?: TaskStatus | null;
  priority?: TaskPriority | null;
  notes?: string | null;
}

type TaskRollbackField =
  | "status"
  | "displayStatus"
  | "updatedAt"
  | "priority"
  | "notes";

type TaskRollbackValues = Partial<Pick<TaskWithCourse, TaskRollbackField>>;
type TaskFieldValue =
  | TaskStatus
  | TaskWithCourse["displayStatus"]
  | string
  | TaskPriority
  | null
  | undefined;

interface TaskFieldRollback {
  queryKey: QueryKey;
  taskId: string;
  fields: readonly TaskRollbackField[];
  mutationId: string;
}

interface TaskDeleteRollback {
  queryKey: QueryKey;
  task: TaskWithCourse;
  index: number;
}

interface TaskFieldMutationContext {
  rollbacks: TaskFieldRollback[];
}

interface TaskDeleteMutationContext {
  rollbacks: TaskDeleteRollback[];
}

interface TaskFieldSettlement {
  didSettle: boolean;
  hasPendingLayers: boolean;
}

interface OptimisticFieldLayer {
  mutationId: string;
  value: TaskFieldValue;
}

interface OptimisticFieldState {
  baseValue: TaskFieldValue;
  layers: OptimisticFieldLayer[];
}

const optimisticFieldStates = new Map<string, OptimisticFieldState>();
let optimisticMutationCounter = 0;

function taskFieldStateKey(taskId: string, field: TaskRollbackField) {
  return `${taskId}:${field}`;
}

function getTaskFieldValue(
  task: TaskWithCourse,
  field: TaskRollbackField,
): TaskFieldValue {
  switch (field) {
    case "status":
      return task.status;
    case "displayStatus":
      return task.displayStatus;
    case "updatedAt":
      return task.updatedAt;
    case "priority":
      return task.priority;
    case "notes":
      return task.notes;
  }
}

function getRollbackFieldValue(
  values: TaskRollbackValues,
  field: TaskRollbackField,
): TaskFieldValue {
  switch (field) {
    case "status":
      return values.status;
    case "displayStatus":
      return values.displayStatus;
    case "updatedAt":
      return values.updatedAt;
    case "priority":
      return values.priority;
    case "notes":
      return values.notes;
  }
}

function applyTaskFieldValue(
  task: TaskWithCourse,
  field: TaskRollbackField,
  value: TaskFieldValue,
): TaskWithCourse {
  switch (field) {
    case "status":
      return value === undefined
        ? task
        : { ...task, status: value as TaskStatus };
    case "displayStatus":
      return { ...task, displayStatus: value as TaskWithCourse["displayStatus"] };
    case "updatedAt":
      return typeof value === "string" ? { ...task, updatedAt: value } : task;
    case "priority":
      return { ...task, priority: value as TaskWithCourse["priority"] };
    case "notes":
      return { ...task, notes: value as TaskWithCourse["notes"] };
  }
}

function applyTaskFieldValues(
  task: TaskWithCourse,
  values: TaskRollbackValues,
) {
  let nextTask = task;

  for (const field of Object.keys(values) as TaskRollbackField[]) {
    nextTask = applyTaskFieldValue(
      nextTask,
      field,
      getRollbackFieldValue(values, field),
    );
  }

  return nextTask;
}

function beginTaskFieldMutation(
  queryClient: QueryClient,
  taskIds: readonly string[],
  fields: readonly TaskRollbackField[],
  getOptimisticValues: (task: TaskWithCourse) => TaskRollbackValues,
): TaskFieldRollback[] {
  const mutationId = `task-field-${++optimisticMutationCounter}`;
  const idSet = new Set(taskIds);
  const initializedTaskIds = new Set<string>();
  const queries = queryClient.getQueriesData<TaskWithCourse[]>({
    queryKey: ["tasks"],
  });

  return queries.flatMap(([queryKey, tasks]) => {
    if (!tasks) return [];

    return tasks
      .filter((task) => idSet.has(task.id))
      .map((task) => {
        if (!initializedTaskIds.has(task.id)) {
          const optimisticValues = getOptimisticValues(task);

          for (const field of fields) {
            const key = taskFieldStateKey(task.id, field);
            const existing = optimisticFieldStates.get(key);
            const state =
              existing ??
              ({
                baseValue: getTaskFieldValue(task, field),
                layers: [],
              } satisfies OptimisticFieldState);

            state.layers.push({
              mutationId,
              value: getRollbackFieldValue(optimisticValues, field),
            });
            optimisticFieldStates.set(key, state);
          }

          initializedTaskIds.add(task.id);
        }

        return {
          queryKey,
          taskId: task.id,
          fields,
          mutationId,
        };
      });
  });
}

function settleTaskFields(
  queryClient: QueryClient,
  rollbacks: readonly TaskFieldRollback[],
  outcome: "success" | "error",
): TaskFieldSettlement {
  let didSettle = false;
  let hasPendingLayers = false;
  const nextValuesByTask = new Map<string, TaskRollbackValues>();
  const settledFields = new Set<string>();

  for (const rollback of rollbacks) {
    for (const field of rollback.fields) {
      const fieldKey = taskFieldStateKey(rollback.taskId, field);
      const settledKey = `${fieldKey}:${rollback.mutationId}`;
      if (settledFields.has(settledKey)) continue;

      const state = optimisticFieldStates.get(fieldKey);
      if (!state) continue;

      const layerIndex = state.layers.findIndex(
        (layer) => layer.mutationId === rollback.mutationId,
      );
      if (layerIndex !== -1) {
        didSettle = true;
        if (outcome === "success") {
          const layer = state.layers[layerIndex];
          state.baseValue = layer.value;
          // A successful newer mutation supersedes older pending optimistic
          // layers for the same task field, preserving latest user intent.
          state.layers = state.layers.slice(layerIndex + 1);
        } else {
          state.layers.splice(layerIndex, 1);
        }
      }

      const visibleValue =
        state.layers[state.layers.length - 1]?.value ?? state.baseValue;
      const nextValues = nextValuesByTask.get(rollback.taskId) ?? {};
      nextValuesByTask.set(rollback.taskId, {
        ...nextValues,
        [field]: visibleValue,
      });

      if (state.layers.length === 0) {
        optimisticFieldStates.delete(fieldKey);
      } else {
        hasPendingLayers = true;
      }

      settledFields.add(settledKey);
    }
  }

  for (const rollback of rollbacks) {
    queryClient.setQueryData<TaskWithCourse[]>(
      rollback.queryKey,
      (current) =>
        current?.map((task) => {
          const values = nextValuesByTask.get(task.id);
          return values ? applyTaskFieldValues(task, values) : task;
        }) ?? current,
    );
  }

  return { didSettle, hasPendingLayers };
}

function settleSuccessfulTaskFields(
  queryClient: QueryClient,
  context: TaskFieldMutationContext | undefined,
) {
  if (!context?.rollbacks || context.rollbacks.length === 0) return true;

  const settlement = settleTaskFields(queryClient, context.rollbacks, "success");
  return settlement.didSettle && !settlement.hasPendingLayers;
}

function settleFailedTaskFields(
  queryClient: QueryClient,
  context: TaskFieldMutationContext | undefined,
) {
  if (context?.rollbacks) {
    settleTaskFields(queryClient, context.rollbacks, "error");
  }
}

function captureTaskDeleteRollbacks(
  queryClient: QueryClient,
  taskId: string,
): TaskDeleteRollback[] {
  const queries = queryClient.getQueriesData<TaskWithCourse[]>({
    queryKey: ["tasks"],
  });

  return queries.flatMap(([queryKey, tasks]) => {
    if (!tasks) return [];
    const index = tasks.findIndex((task) => task.id === taskId);
    if (index === -1) return [];

    return [{ queryKey, task: tasks[index], index }];
  });
}

function restoreDeletedTasks(
  queryClient: QueryClient,
  rollbacks: readonly TaskDeleteRollback[],
) {
  for (const rollback of rollbacks) {
    queryClient.setQueryData<TaskWithCourse[]>(
      rollback.queryKey,
      (current) => {
        if (!current) return current;

        const existingIndex = current.findIndex(
          (task) => task.id === rollback.task.id,
        );
        if (existingIndex !== -1) {
          return current.map((task) =>
            task.id === rollback.task.id ? rollback.task : task,
          );
        }

        const next = [...current];
        next.splice(Math.min(rollback.index, next.length), 0, rollback.task);
        return next;
      },
    );
  }
}

async function getCurrentUserId() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Not authenticated");
  }

  return user.id;
}

/**
 * Fetch the existing override, merge with incoming changes, then upsert.
 * This prevents overwriting untouched fields to null.
 */
async function upsertTaskOverride(payload: TaskOverridePayload) {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  // Fetch existing override to preserve untouched fields
  const { data: existing } = await supabase
    .from("task_overrides")
    .select("custom_status, priority, notes")
    .eq("user_id", userId)
    .eq("task_id", payload.taskId)
    .maybeSingle();

  const merged = {
    custom_status:
      payload.customStatus !== undefined
        ? payload.customStatus
        : ((existing?.custom_status as TaskStatus | null) ?? null),
    priority:
      payload.priority !== undefined
        ? payload.priority
        : ((existing?.priority as TaskPriority | null) ?? null),
    notes:
      payload.notes !== undefined
        ? payload.notes
        : ((existing?.notes as string | null) ?? null),
  };

  const { error } = await supabase.from("task_overrides").upsert(
    {
      user_id: userId,
      task_id: payload.taskId,
      ...merged,
    },
    {
      onConflict: "user_id,task_id",
      ignoreDuplicates: false,
    },
  );

  if (error) throw error;
}

/**
 * Bulk-set `custom_status` via the browser Supabase client (same RLS/session as
 * {@link upsertTaskOverride}). Avoids Next.js server-action ID mismatches from
 * dev HMR / stale tabs while preserving priority and notes on existing rows.
 */
async function bulkSetOverrideStatusClient(
  taskIds: string[],
  status: TaskStatus,
) {
  if (taskIds.length === 0) return;
  const supabase = createClient();
  const userId = await getCurrentUserId();

  const { data: existingRows, error: fetchError } = await supabase
    .from("task_overrides")
    .select("task_id, priority, notes")
    .eq("user_id", userId)
    .in("task_id", taskIds);

  if (fetchError) throw fetchError;

  const byTask = new Map(
    (existingRows ?? []).map((r) => [
      r.task_id as string,
      r as { priority: unknown; notes: unknown },
    ]),
  );

  const rows = taskIds.map((taskId) => {
    const ex = byTask.get(taskId);
    return {
      user_id: userId,
      task_id: taskId,
      custom_status: status,
      priority: (ex?.priority as TaskPriority | null | undefined) ?? null,
      notes: (ex?.notes as string | null | undefined) ?? null,
    };
  });

  const { error } = await supabase.from("task_overrides").upsert(rows, {
    onConflict: "user_id,task_id",
    ignoreDuplicates: false,
  });

  if (error) throw error;
}

export function useTaskActions() {
  const queryClient = useQueryClient();

  const setStatus = useMutation<
    void,
    Error,
    { taskId: string; status: TaskStatus },
    TaskFieldMutationContext
  >({
    mutationFn: async ({ taskId, status }) => {
      await upsertTaskOverride({ taskId, customStatus: status });
    },
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const now = new Date().toISOString();
      const fields = [
        "status",
        "displayStatus",
        "updatedAt",
      ] as const;
      const rollbacks = beginTaskFieldMutation(
        queryClient,
        [taskId],
        fields,
        (task) => ({
          status,
          displayStatus: resolveTaskDisplayStatus({
            baseStatus: status,
            dueDate: task.dueDate,
          }).displayStatus,
          updatedAt: now,
        }),
      );
      queryClient.setQueriesData<TaskWithCourse[]>(
        { queryKey: ["tasks"] },
        (old) => {
          if (!old) return old;
          return old.map((task) => {
            if (task.id !== taskId) return task;
            const { displayStatus } = resolveTaskDisplayStatus({
              baseStatus: status,
              dueDate: task.dueDate,
            });
            return { ...task, status, displayStatus, updatedAt: now };
          });
        },
      );
      return { rollbacks };
    },
    onSuccess: (_data, { taskId, status }, context) => {
      const shouldInvalidateTasks = settleSuccessfulTaskFields(
        queryClient,
        context,
      );
      if (shouldInvalidateTasks) {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
      if (status === "dismissed" && shouldInvalidateTasks) {
        queryClient.invalidateQueries({ queryKey: ["history-tasks"] });
      }
      const label =
        status === "done"
          ? "Marked as done"
          : status === "dismissed"
            ? "Task dismissed"
            : status === "in_progress"
              ? "Marked as in progress"
              : "Status updated";
      toast.success(label, { id: `status-${taskId}` });
    },
    onError: (err, { taskId }, context) => {
      settleFailedTaskFields(queryClient, context);
      toast.error("Failed to update status", { id: `status-${taskId}`, description: err.message });
    },
  });

  const setPriority = useMutation<
    void,
    Error,
    { taskId: string; priority: TaskPriority | null },
    TaskFieldMutationContext
  >({
    mutationFn: async ({ taskId, priority }) => {
      await upsertTaskOverride({ taskId, priority });
    },
    onMutate: async ({ taskId, priority }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const fields = ["priority"] as const;
      const rollbacks = beginTaskFieldMutation(
        queryClient,
        [taskId],
        fields,
        () => ({ priority }),
      );
      queryClient.setQueriesData<TaskWithCourse[]>(
        { queryKey: ["tasks"] },
        (old) => {
          if (!old) return old;
          return old.map((task) =>
            task.id === taskId ? { ...task, priority } : task,
          );
        },
      );
      return { rollbacks };
    },
    onSuccess: (_data, { taskId, priority }, context) => {
      if (settleSuccessfulTaskFields(queryClient, context)) {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
      toast.success(
        priority ? `Priority set to ${priority}` : "Priority cleared",
        { id: `priority-${taskId}` },
      );
    },
    onError: (err, { taskId }, context) => {
      settleFailedTaskFields(queryClient, context);
      toast.error("Failed to update priority", { id: `priority-${taskId}`, description: err.message });
    },
  });

  const setNotes = useMutation<
    void,
    Error,
    { taskId: string; notes: string | null },
    TaskFieldMutationContext
  >({
    mutationFn: async ({ taskId, notes }) => {
      await upsertTaskOverride({ taskId, notes });
    },
    onMutate: async ({ taskId, notes }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const fields = ["notes"] as const;
      const rollbacks = beginTaskFieldMutation(
        queryClient,
        [taskId],
        fields,
        () => ({ notes }),
      );
      queryClient.setQueriesData<TaskWithCourse[]>(
        { queryKey: ["tasks"] },
        (old) => {
          if (!old) return old;
          return old.map((task) =>
            task.id === taskId ? { ...task, notes } : task,
          );
        },
      );
      return { rollbacks };
    },
    onSuccess: (_data, _vars, context) => {
      if (settleSuccessfulTaskFields(queryClient, context)) {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
      toast.success("Notes saved");
    },
    onError: (err, _vars, context) => {
      settleFailedTaskFields(queryClient, context);
      toast.error("Failed to save notes", { description: err.message });
    },
  });

  const createTask = useMutation<{ id?: string }, Error, CreateCustomTaskInput>(
    {
      mutationFn: async (input) => {
        const result = await createCustomTask(input);
        if (!result.success)
          throw new Error(result.error ?? "Failed to create task");
        return { id: result.id };
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        toast.success("Task created");
      },
      onError: (err) => {
        toast.error("Failed to create task", { description: err.message });
      },
    },
  );

  const editTask = useMutation<
    void,
    Error,
    { id: string; input: UpdateCustomTaskInput }
  >({
    mutationFn: async ({ id, input }) => {
      const result = await updateCustomTask(id, input);
      if (!result.success)
        throw new Error(result.error ?? "Failed to update task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated");
    },
    onError: (err) => {
      toast.error("Failed to update task", { description: err.message });
    },
  });

  const deleteTask = useMutation<
    void,
    Error,
    string,
    TaskDeleteMutationContext
  >({
    mutationFn: async (id) => {
      const result = await deleteCustomTask(id);
      if (!result.success)
        throw new Error(result.error ?? "Failed to delete task");
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const rollbacks = captureTaskDeleteRollbacks(queryClient, id);
      queryClient.setQueriesData<TaskWithCourse[]>(
        { queryKey: ["tasks"] },
        (old) => {
          if (!old) return old;
          return old.filter((task) => task.id !== id);
        },
      );
      return { rollbacks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
    onError: (err, _id, context) => {
      if (context?.rollbacks) restoreDeletedTasks(queryClient, context.rollbacks);
      toast.error("Failed to delete task", { description: err.message });
    },
  });

  const dismissAll = useMutation<
    void,
    Error,
    string[],
    TaskFieldMutationContext
  >({
    mutationFn: async (taskIds) => {
      await bulkSetOverrideStatusClient(taskIds, "dismissed");
    },
    onMutate: async (taskIds) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const fields = [
        "status",
        "displayStatus",
      ] as const;
      const rollbacks = beginTaskFieldMutation(
        queryClient,
        taskIds,
        fields,
        (task) => ({
          status: "dismissed",
          displayStatus: resolveTaskDisplayStatus({
            baseStatus: "dismissed",
            dueDate: task.dueDate,
          }).displayStatus,
        }),
      );
      const idSet = new Set(taskIds);
      queryClient.setQueriesData<TaskWithCourse[]>(
        { queryKey: ["tasks"] },
        (old) => {
          if (!old) return old;
          return old.map((task) =>
            idSet.has(task.id)
              ? {
                  ...task,
                  status: "dismissed" as const,
                  displayStatus: resolveTaskDisplayStatus({
                    baseStatus: "dismissed",
                    dueDate: task.dueDate,
                  }).displayStatus,
                }
              : task,
          );
        },
      );
      return { rollbacks };
    },
    onSuccess: (_data, _vars, context) => {
      const shouldInvalidateTasks = settleSuccessfulTaskFields(
        queryClient,
        context,
      );
      if (shouldInvalidateTasks) {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["history-tasks"] });
      }
      toast.success("All done tasks dismissed");
    },
    onError: (err, _ids, context) => {
      settleFailedTaskFields(queryClient, context);
      toast.error("Failed to dismiss tasks", { description: err.message });
    },
  });

  const archivePastDue = useMutation<
    void,
    Error,
    string[],
    TaskFieldMutationContext
  >({
    mutationFn: async (taskIds) => {
      await bulkSetOverrideStatusClient(taskIds, "done");
    },
    onMutate: async (taskIds) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const fields = [
        "status",
        "displayStatus",
      ] as const;
      const rollbacks = beginTaskFieldMutation(
        queryClient,
        taskIds,
        fields,
        (task) => ({
          status: "done",
          displayStatus: resolveTaskDisplayStatus({
            baseStatus: "done",
            dueDate: task.dueDate,
          }).displayStatus,
        }),
      );
      const idSet = new Set(taskIds);
      queryClient.setQueriesData<TaskWithCourse[]>(
        { queryKey: ["tasks"] },
        (old) => {
          if (!old) return old;
          return old.map((task) =>
            idSet.has(task.id)
              ? {
                  ...task,
                  status: "done" as const,
                  displayStatus: resolveTaskDisplayStatus({
                    baseStatus: "done",
                    dueDate: task.dueDate,
                  }).displayStatus,
                }
              : task,
          );
        },
      );
      return { rollbacks };
    },
    onSuccess: (_data, taskIds, context) => {
      if (settleSuccessfulTaskFields(queryClient, context)) {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }
      toast.success(`Archived ${taskIds.length} past tasks`);
    },
    onError: (err, _ids, context) => {
      settleFailedTaskFields(queryClient, context);
      toast.error("Failed to archive tasks", { description: err.message });
    },
  });

  return {
    setStatus,
    setPriority,
    setNotes,
    createTask,
    editTask,
    deleteTask,
    dismissAll,
    archivePastDue,
  };
}
