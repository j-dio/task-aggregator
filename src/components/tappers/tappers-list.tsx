"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { TapperSummary } from "@/types/tappers";
import { useTapperActions } from "@/hooks/use-tapper-actions";

function linkedLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Linked";
  return `Linked ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function initials(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return t.charAt(0).toUpperCase();
}

export function TappersList({ tappers }: { tappers: TapperSummary[] }) {
  const { unlinkTapper } = useTapperActions();

  if (tappers.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No tappers yet. Share your invite code with a classmate.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {tappers.map((tapper) => (
        <li
          key={tapper.userId}
          className="skeu-card flex flex-wrap items-center gap-3 rounded-[14px] p-4"
        >
          <Avatar size="sm">
            <AvatarFallback className="text-xs font-semibold">
              {initials(tapper.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{tapper.displayName}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {linkedLabel(tapper.linkedAt)}
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="shrink-0"
            disabled={
              unlinkTapper.isPending && unlinkTapper.variables === tapper.userId
            }
            onClick={() => unlinkTapper.mutate(tapper.userId)}
          >
            Unlink
          </Button>
        </li>
      ))}
    </ul>
  );
}
