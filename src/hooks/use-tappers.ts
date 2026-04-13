"use client";

import { useQuery } from "@tanstack/react-query";
import { listTappers } from "@/lib/actions/tappers";
import type { TapperSummary } from "@/types/tappers";

async function fetchTappers(): Promise<TapperSummary[]> {
  const result = await listTappers();
  if (!result.success) {
    throw new Error(result.error ?? "Failed to load tappers");
  }
  return result.data;
}

export function useTappers() {
  const query = useQuery({
    queryKey: ["tappers"],
    queryFn: fetchTappers,
    staleTime: 60_000,
  });

  return {
    tappers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
