"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { syncAllTasks, type SyncResponse } from "@/lib/actions/sync";
import {
  GOOGLE_RECONNECT_USER_MESSAGE,
  syncErrorRequiresGoogleReconnect,
  warningsNeedGoogleReconnect,
} from "@/lib/google-sync-errors";
import { toast } from "sonner";

/** Minimum interval between syncs (5 minutes) */
const SYNC_COOLDOWN_MS = 5 * 60 * 1000;
/** Auto-sync threshold (1 hour since last sync) */
export const AUTO_SYNC_STALE_MS = 60 * 60 * 1000;

const STORAGE_KEY = "task-agg:lastSyncAtMs";

function readLastSyncAt(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? Number(stored) : 0;
}

function writeLastSyncAt(ms: number): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, String(ms));
  }
}

let lastSyncAtMs = 0;

export function getLastSyncAt(): number {
  if (lastSyncAtMs === 0) lastSyncAtMs = readLastSyncAt();
  return lastSyncAtMs;
}

export function timeSinceLastSync(): number {
  const ts = getLastSyncAt();
  if (ts === 0) return Infinity;
  return Date.now() - ts;
}

export function isSyncOnCooldown(): boolean {
  return timeSinceLastSync() < SYNC_COOLDOWN_MS;
}

export function cooldownRemainingMs(): number {
  if (!isSyncOnCooldown()) return 0;
  return SYNC_COOLDOWN_MS - timeSinceLastSync();
}

function recordSyncAttempt(): void {
  lastSyncAtMs = Date.now();
  writeLastSyncAt(lastSyncAtMs);
}

export function useSync({ silent = false }: { silent?: boolean } = {}) {
  const queryClient = useQueryClient();

  return useMutation<SyncResponse, Error>({
    mutationFn: async () => {
      const result = await syncAllTasks();
      // Only throw if there are errors AND zero tasks were synced
      // (i.e. complete failure, not partial success)
      if (result.synced === 0 && result.errors.length > 0) {
        const msg =
          result.errors.length === 1
            ? result.errors[0] || "Sync failed"
            : `${result.errors[0] || "Unknown error"} (+${result.errors.length - 1} more)`;
        throw new Error(msg);
      }
      return result;
    },
    onSettled: (_data, error) => {
      // Always record the attempt so cooldown is enforced on both success and failure
      recordSyncAttempt();

      // Always invalidate caches — even on failure, the DB state may have changed
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });

      // Surface toast notifications (suppressed for auto-sync)
      if (!silent) {
        if (error) {
          const msg = error.message;
          if (syncErrorRequiresGoogleReconnect(msg)) {
            toast.error("Reconnect Google", {
              id: "sync",
              description: GOOGLE_RECONNECT_USER_MESSAGE,
              duration: 12_000,
            });
          } else {
            toast.error("Sync failed", { id: "sync", description: msg });
          }
        } else if (_data) {
          const { errors: warnings } = _data;
          if (warnings.length === 0) {
            toast.success("Synced successfully", { id: "sync" });
          } else if (warningsNeedGoogleReconnect(warnings)) {
            const desc =
              warnings.find((w) =>
                w.includes("Google Classroom disconnected"),
              ) ?? GOOGLE_RECONNECT_USER_MESSAGE;
            toast.error("Reconnect Google to update Classroom", {
              id: "sync",
              description: desc,
              duration: 12_000,
            });
          } else {
            toast.warning("Synced with warnings", {
              id: "sync",
              description: warnings[0],
            });
          }
        }
      }
    },
  });
}
