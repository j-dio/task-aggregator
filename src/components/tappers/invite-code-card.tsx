"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";

function formatExpiryChip(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Expires soon";
  return `Expires ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

async function copyText(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("Could not copy to clipboard");
  }
}

export function InviteCodeCard({
  code,
  expiresAt,
}: {
  code: string;
  expiresAt: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setQrReady(false);

    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        if (cancelled || !canvasRef.current) return;
        const url = `${window.location.origin}/tappers/join/${code}`;
        await QRCode.toCanvas(canvasRef.current, url, {
          width: 200,
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setQrReady(true);
      } catch {
        if (!cancelled) setQrReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="skeu-card space-y-4 rounded-[14px] p-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-mono text-2xl font-semibold tracking-wider">{code}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void copyText(code, "Code copied")}
        >
          <Copy className="size-4" />
          Copy
        </Button>
      </div>
      <p className="text-muted-foreground inline-flex rounded-md border bg-muted/40 px-2 py-0.5 text-xs">
        {formatExpiryChip(expiresAt)}
      </p>
      <div className="relative mx-auto flex h-[200px] w-[200px] items-center justify-center">
        {!qrReady ? (
          <Skeleton className="absolute inset-0 size-full rounded-md" aria-hidden />
        ) : null}
        <canvas
          ref={canvasRef}
          className={
            qrReady
              ? "rounded-md"
              : "pointer-events-none invisible absolute inset-0"
          }
          width={200}
          height={200}
          aria-label="QR code for invite link"
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full sm:w-auto"
        onClick={() =>
          void copyText(
            `${window.location.origin}/tappers/join/${code}`,
            "Invite link copied",
          )
        }
      >
        <Link2 className="size-4" />
        Share link
      </Button>
    </div>
  );
}
