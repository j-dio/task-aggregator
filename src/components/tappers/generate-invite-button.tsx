"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createInvite } from "@/lib/actions/tappers";
import { Loader2 } from "lucide-react";

export function GenerateInviteButton({
  onGenerated,
}: {
  onGenerated: (invite: { code: string; expiresAt: string }) => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await createInvite();
      if (result.success) {
        onGenerated({ code: result.code, expiresAt: result.expiresAt });
      } else {
        toast.error("Could not create invite", {
          description: result.error,
        });
      }
    });
  }

  return (
    <Button type="button" onClick={handleClick} disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Generate invite code
    </Button>
  );
}
