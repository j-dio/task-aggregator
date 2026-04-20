"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acceptInviteSchema } from "@/lib/validations/tappers";
import { useTapperActions } from "@/hooks/use-tapper-actions";
import { Loader2 } from "lucide-react";

export function AcceptInviteForm({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const { acceptInvite } = useTapperActions();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    acceptInvite.reset();

    const trimmed = code.trim();
    const parsed = acceptInviteSchema.safeParse({ code: trimmed });
    if (!parsed.success) {
      setLocalError(parsed.error.issues[0]?.message ?? "Invalid code");
      return;
    }

    acceptInvite.mutate(parsed.data.code, {
      onSuccess: () => {
        toast.success("Linked!");
        onSuccess();
        setCode("");
      },
      onError: (err) => {
        setLocalError(err.message);
      },
    });
  }

  const displayError = localError ?? acceptInvite.error?.message;

  return (
    <div className="skeu-card space-y-4 rounded-[14px] p-5">
      <h2 className="text-lg font-semibold tracking-tight">
        Link with a classmate
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Input
            placeholder="Enter invite code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setLocalError(null);
              acceptInvite.reset();
            }}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!displayError}
          />
          {displayError ? (
            <p className="text-destructive text-sm">{displayError}</p>
          ) : null}
        </div>
        <Button type="submit" disabled={acceptInvite.isPending}>
          {acceptInvite.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          Link up
        </Button>
      </form>
    </div>
  );
}
