"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function extractInviteCode(raw: string): string | null {
  try {
    const url = new URL(raw);
    const match = url.pathname.match(/\/tappers\/join\/([A-Z0-9]{6,20})$/i);
    if (match?.[1]) return match[1].toUpperCase();
  } catch {
    // not a URL
  }
  const bare = raw.trim().toUpperCase();
  if (/^[A-Z0-9]{6,20}$/.test(bare)) return bare;
  return null;
}

interface Props {
  onCode: (code: string) => void;
}

export function QrScannerButton({ onCode }: Props) {
  const [isTouch, setIsTouch] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Callback ref: fires when the <video> element mounts inside the Dialog portal
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const scannerRef = useRef<import("qr-scanner").default | null>(null);

  useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const stopScanner = useCallback(() => {
    scannerRef.current?.destroy();
    scannerRef.current = null;
  }, []);

  // Start/stop scanner whenever the dialog is open AND the video element is mounted
  useEffect(() => {
    if (!open || !videoEl) {
      if (!open) stopScanner();
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const QrScanner = (await import("qr-scanner")).default;
        if (cancelled) return;

        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) {
          if (!cancelled) setError("No camera found on this device.");
          return;
        }
        if (cancelled) return;

        const scanner = new QrScanner(
          videoEl,
          (result) => {
            const code = extractInviteCode(result.data);
            if (!code) return;
            stopScanner();
            setOpen(false);
            onCode(code);
          },
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
            returnDetailedScanResult: true,
          },
        );

        scannerRef.current = scanner;
        await scanner.start();
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : "Camera access failed.";
          setError(
            msg.toLowerCase().includes("permission") ||
              msg.toLowerCase().includes("denied") ||
              msg.toLowerCase().includes("notallowed")
              ? "Camera permission denied. Allow camera access and try again."
              : "Could not start camera. Try again.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, videoEl, onCode, stopScanner]);

  // Clear state when dialog closes
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        stopScanner();
        setError(null);
        setVideoEl(null);
      }
      setOpen(next);
    },
    [stopScanner],
  );

  if (!isTouch) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Scan QR code"
        onClick={() => setOpen(true)}
      >
        <Camera className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm overflow-hidden p-0">
          <DialogHeader className="px-5 pb-3 pt-5">
            <DialogTitle className="text-base">Scan invite QR code</DialogTitle>
          </DialogHeader>

          {error ? (
            <div className="space-y-3 px-5 pb-5">
              <p className="text-destructive text-sm">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  setVideoEl(null);
                }}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="relative aspect-square w-full bg-black">
              {/* callback ref — fires when the element enters the DOM */}
              <video
                ref={setVideoEl}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
              <p className="absolute bottom-3 left-0 right-0 px-4 text-center text-xs text-white/70">
                Point at a classmate&apos;s invite QR code
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
