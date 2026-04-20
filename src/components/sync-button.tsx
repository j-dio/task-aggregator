"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useSync,
  isSyncOnCooldown,
  cooldownRemainingMs,
  getLastSyncAt,
} from "@/hooks/use-sync";
import { syncErrorRequiresGoogleReconnect, warningsNeedGoogleReconnect } from "@/lib/google-sync-errors";
import { cn } from "@/lib/utils";

interface SyncButtonProps {
  className?: string;
  showLabel?: boolean;
}

function formatCooldown(ms: number): string {
  if (ms < 60_000) {
    const secs = Math.ceil(ms / 1_000);
    return `${secs}s`;
  }
  const mins = Math.ceil(ms / 60_000);
  return `${mins}m`;
}

export function SyncButton({ className, showLabel }: SyncButtonProps) {
  const { mutate: sync, isPending, error, data } = useSync();
  const [cooldown, setCooldown] = useState(false);
  const [remaining, setRemaining] = useState(0);

  // Poll cooldown state every second while on cooldown
  useEffect(() => {
    const check = () => {
      const onCooldown = isSyncOnCooldown();
      setCooldown(onCooldown);
      setRemaining(onCooldown ? cooldownRemainingMs() : 0);
      return onCooldown;
    };
    if (!check()) return;
    const id = setInterval(() => {
      if (!check()) clearInterval(id);
    }, 1_000);
    return () => clearInterval(id);
  }, [data, error]);

  const disabled = isPending || cooldown;

  const hasWarnings = data && data.errors.length > 0;
  const reconnect =
    (error?.message && syncErrorRequiresGoogleReconnect(error.message)) ||
    (data && warningsNeedGoogleReconnect(data.errors));

  const title = isPending
    ? "Syncing..."
    : error?.message
      ? reconnect
        ? "Reconnect Google in Settings — Classroom tasks may be out of date"
        : `Sync failed: ${error.message}`
      : hasWarnings
        ? reconnect
          ? "Reconnect Google in Settings — Classroom tasks may be out of date"
          : "Synced with warnings"
        : cooldown
          ? `Sync available in ${formatCooldown(remaining)}`
          : "Sync tasks";

  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <Button
          variant="ghost"
          size={showLabel ? "sm" : "icon-sm"}
          onClick={() => sync()}
          disabled={disabled}
          className={cn(showLabel && "gap-1.5", className)}
          aria-label={title}
          title={title}
        >
          <RefreshCw
            className={cn(
              "size-4 shrink-0",
              isPending && "animate-spin",
              (error || reconnect) && "text-destructive",
              hasWarnings && !reconnect && "text-warning",
            )}
          />
          {showLabel && (
            <span>{isPending ? "Syncing…" : "Sync"}</span>
          )}
        </Button>
        {!error && cooldown && getLastSyncAt() > 0 && (
          <span
            className="text-muted-foreground max-w-full truncate text-center text-[10px] leading-none tabular-nums"
            aria-live="polite"
          >
            {formatCooldown(remaining)}
          </span>
        )}
      </div>
      {error && (
        <span className="text-destructive min-w-0 max-w-[20rem] flex-1 text-xs line-clamp-2">
          {error.message}
        </span>
      )}
    </div>
  );
}
