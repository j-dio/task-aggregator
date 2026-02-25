"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncAllTasks, type SyncResponse } from "@/lib/actions/sync";

export function useSync() {
  const queryClient = useQueryClient();

  return useMutation<SyncResponse, Error>({
    mutationFn: syncAllTasks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}
