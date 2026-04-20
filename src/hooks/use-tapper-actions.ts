"use client";

import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { TaskWithCourse } from "@/types/task";
import type { SharedTaskCard, TapperSummary } from "@/types/tappers";
import {
  acceptInvite,
  adoptSharedTask,
  dismissSharedTask,
  markSharedTasksSeen,
  unlinkTapper,
} from "@/lib/actions/tappers";

/** Feed cache marks adoption in-flight before the server responds. */
export const SHARED_TASK_ADOPT_PENDING = "optimistic-pending" as const;

function restoreQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  entries: [QueryKey, unknown][] | undefined,
) {
  if (!entries) return;
  for (const [key, data] of entries) {
    queryClient.setQueryData(key, data);
  }
}

export function useTapperActions() {
  const queryClient = useQueryClient();

  const acceptInviteMutation = useMutation<
    void,
    Error,
    string,
    { previousTappers: [QueryKey, TapperSummary[] | undefined][] }
  >({
    mutationFn: async (code) => {
      const result = await acceptInvite(code);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to accept invite");
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["tappers"] });
      const previousTappers = queryClient.getQueriesData<TapperSummary[]>({
        queryKey: ["tappers"],
      });
      return { previousTappers };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tappers"] });
    },
    onError: (_err, _code, context) => {
      restoreQueries(queryClient, context?.previousTappers);
    },
  });

  const unlinkTapperMutation = useMutation<
    void,
    Error,
    string,
    { previousTappers: [QueryKey, TapperSummary[] | undefined][] }
  >({
    mutationFn: async (userId) => {
      const result = await unlinkTapper(userId);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to unlink tapper");
      }
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ["tappers"] });
      const previousTappers = queryClient.getQueriesData<TapperSummary[]>({
        queryKey: ["tappers"],
      });
      queryClient.setQueriesData<TapperSummary[]>(
        { queryKey: ["tappers"] },
        (old) => {
          if (!old) return old;
          return old.filter((t) => t.userId !== userId);
        },
      );
      return { previousTappers };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tappers"] });
    },
    onError: (err, _userId, context) => {
      restoreQueries(queryClient, context?.previousTappers);
      toast.error("Failed to unlink tapper", { description: err.message });
    },
  });

  const adoptSharedTaskMutation = useMutation<
    void,
    Error,
    string,
    {
      previousFeed: [QueryKey, SharedTaskCard[] | undefined][];
      previousTasks: [QueryKey, TaskWithCourse[] | undefined][];
    }
  >({
    mutationFn: async (sharedTaskId) => {
      const result = await adoptSharedTask(sharedTaskId);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to adopt task");
      }
    },
    onMutate: async (sharedTaskId) => {
      await queryClient.cancelQueries({ queryKey: ["tappers-feed"] });
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previousFeed = queryClient.getQueriesData<SharedTaskCard[]>({
        queryKey: ["tappers-feed"],
      });
      const previousTasks = queryClient.getQueriesData<TaskWithCourse[]>({
        queryKey: ["tasks"],
      });
      queryClient.setQueriesData<SharedTaskCard[]>(
        { queryKey: ["tappers-feed"] },
        (old) => {
          if (!old) return old;
          return old.map((card) =>
            card.sharedTaskId === sharedTaskId
              ? { ...card, addedTaskId: SHARED_TASK_ADOPT_PENDING }
              : card,
          );
        },
      );
      return { previousFeed, previousTasks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tappers-feed"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err, _sharedTaskId, context) => {
      restoreQueries(queryClient, context?.previousFeed);
      restoreQueries(queryClient, context?.previousTasks);
      toast.error("Failed to adopt task", { description: err.message });
    },
  });

  const dismissSharedTaskMutation = useMutation<
    void,
    Error,
    string,
    { previousFeed: [QueryKey, SharedTaskCard[] | undefined][] }
  >({
    mutationFn: async (sharedTaskId) => {
      const result = await dismissSharedTask(sharedTaskId);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to dismiss shared task");
      }
    },
    onMutate: async (sharedTaskId) => {
      await queryClient.cancelQueries({ queryKey: ["tappers-feed"] });
      const previousFeed = queryClient.getQueriesData<SharedTaskCard[]>({
        queryKey: ["tappers-feed"],
      });
      queryClient.setQueriesData<SharedTaskCard[]>(
        { queryKey: ["tappers-feed"] },
        (old) => {
          if (!old) return old;
          return old.filter((c) => c.sharedTaskId !== sharedTaskId);
        },
      );
      return { previousFeed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tappers-feed"] });
    },
    onError: (err, _sharedTaskId, context) => {
      restoreQueries(queryClient, context?.previousFeed);
      toast.error("Failed to dismiss shared task", {
        description: err.message,
      });
    },
  });

  const markSeenMutation = useMutation<
    void,
    Error,
    string[],
    { previousFeed: [QueryKey, SharedTaskCard[] | undefined][] }
  >({
    mutationFn: async (sharedTaskIds) => {
      const result = await markSharedTasksSeen(sharedTaskIds);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to mark as seen");
      }
    },
    onMutate: async (sharedTaskIds) => {
      await queryClient.cancelQueries({ queryKey: ["tappers-feed"] });
      const previousFeed = queryClient.getQueriesData<SharedTaskCard[]>({
        queryKey: ["tappers-feed"],
      });
      const idSet = new Set(sharedTaskIds);
      const now = new Date().toISOString();
      queryClient.setQueriesData<SharedTaskCard[]>(
        { queryKey: ["tappers-feed"] },
        (old) => {
          if (!old) return old;
          return old.map((card) =>
            idSet.has(card.sharedTaskId) ? { ...card, seenAt: now } : card,
          );
        },
      );
      return { previousFeed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tappers-feed"] });
    },
    onError: (err, _ids, context) => {
      restoreQueries(queryClient, context?.previousFeed);
      toast.error("Failed to mark as seen", { description: err.message });
    },
  });

  return {
    acceptInvite: acceptInviteMutation,
    unlinkTapper: unlinkTapperMutation,
    adoptSharedTask: adoptSharedTaskMutation,
    dismissSharedTask: dismissSharedTaskMutation,
    markSeen: markSeenMutation,
  };
}
