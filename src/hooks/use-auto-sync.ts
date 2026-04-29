"use client";

import { useEffect, useRef } from "react";
import {
  useSync,
  timeSinceLastSync,
  AUTO_SYNC_STALE_MS,
  isSyncOnCooldown,
} from "@/hooks/use-sync";

/**
 * Auto-sync on mount when the last sync is stale (> 1 hour ago).
 * Respects the 5-minute cooldown to avoid duplicate syncs.
 * Safe to call in multiple components — only fires once per threshold.
 */
export function useAutoSync() {
  const { mutate: sync, isPending } = useSync();
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current || isPending) return;

    const stale = timeSinceLastSync() >= AUTO_SYNC_STALE_MS;
    const onCooldown = isSyncOnCooldown();

    if (stale && !onCooldown) {
      triggered.current = true;
      sync(undefined, {
        onError: () => {
          triggered.current = false;
        },
      });
    }
  }, [sync, isPending]);
}
