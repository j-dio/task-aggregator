"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listSharedTasks } from "@/lib/actions/tappers";
import type { SharedTaskCard } from "@/types/tappers";

async function fetchSharedTasks(): Promise<SharedTaskCard[]> {
  const result = await listSharedTasks();
  if (!result.success) {
    throw new Error(result.error ?? "Failed to load shared tasks");
  }
  return result.data;
}

export function useSharedTasks() {
  const query = useQuery({
    queryKey: ["tappers-feed"],
    queryFn: fetchSharedTasks,
    staleTime: 30_000,
  });

  const feed = query.data ?? [];
  const unseenCount = useMemo(() => {
    const list = query.data ?? [];
    return list.filter((c) => c.seenAt === null).length;
  }, [query.data]);

  return {
    feed,
    unseenCount,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
