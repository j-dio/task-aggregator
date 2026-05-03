"use client";

import { useState, type RefObject } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { toBlob } from "html-to-image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  SHARE_CANVAS_HEIGHT,
  SHARE_CANVAS_WIDTH,
} from "../_overlay/overlay-shell";

interface ShareActionsProps {
  captureRef: RefObject<HTMLDivElement | null>;
}

const FILENAME = "tapo1-week.png";

async function captureBlob(node: HTMLDivElement): Promise<Blob> {
  // Wait for any custom fonts to be ready, then yield a frame so the
  // browser has finished any pending paint of the capture target. Both
  // are common fixes for html-to-image producing a blank PNG.
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => resolve()),
  );

  // First pass. Some browsers serialize fonts/images on the second
  // attempt only — call twice and use the result of the second one.
  await toBlob(node, {
    width: SHARE_CANVAS_WIDTH,
    height: SHARE_CANVAS_HEIGHT,
    pixelRatio: 1,
  });
  const blob = await toBlob(node, {
    width: SHARE_CANVAS_WIDTH,
    height: SHARE_CANVAS_HEIGHT,
    pixelRatio: 1,
  });
  if (!blob) throw new Error("html-to-image returned no blob");
  return blob;
}

export function ShareActions({ captureRef }: ShareActionsProps) {
  const [busy, setBusy] = useState<"share" | "download" | null>(null);

  async function handleShare() {
    if (!captureRef.current || busy) return;
    setBusy("share");
    try {
      const blob = await captureBlob(captureRef.current);
      const file = new File([blob], FILENAME, { type: "image/png" });

      const canShare =
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] }) &&
        typeof navigator.share === "function";

      if (canShare) {
        try {
          await navigator.share({ files: [file] });
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            throw err;
          }
        }
        return;
      }

      // Fallback to download when Web Share with files isn't available.
      triggerDownload(blob);
      toast.success("Saved to your device");
    } catch {
      toast.error("Couldn't generate the image. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload() {
    if (!captureRef.current || busy) return;
    setBusy("download");
    try {
      const blob = await captureBlob(captureRef.current);
      triggerDownload(blob);
      toast.success("Saved to your device");
    } catch {
      toast.error("Couldn't generate the image. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={handleShare}
          disabled={busy !== null}
          className="flex-1"
        >
          {busy === "share" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="mr-2 h-4 w-4" />
          )}
          Share
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownload}
          disabled={busy !== null}
          className="flex-1"
        >
          {busy === "download" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download
        </Button>
      </div>
      <p className="text-muted-foreground text-center text-xs">
        🔒 Stays on your device until you share it.
      </p>
    </div>
  );
}

function triggerDownload(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = FILENAME;
  a.click();
  URL.revokeObjectURL(url);
}
