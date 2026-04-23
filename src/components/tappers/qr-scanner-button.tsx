"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function extractInviteCode(raw: string): string | null {
  // Full URL: https://example.com/tappers/join/CODE123
  try {
    const url = new URL(raw);
    const match = url.pathname.match(/\/tappers\/join\/([A-Z0-9]{6,20})$/i);
    if (match?.[1]) return match[1].toUpperCase();
  } catch {
    // not a URL — fall through
  }
  // Bare code: 12 alphanumeric chars
  const bare = raw.trim().toUpperCase();
  if (/^[A-Z0-9]{6,20}$/.test(bare)) return bare;
  return null;
}

interface Props {
  onCode: (code: string) => void;
}

export function QrScannerButton({ onCode }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<import("qr-scanner").default | null>(null);

  const stopScanner = useCallback(() => {
    scannerRef.current?.destroy();
    scannerRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stopScanner();
      setError(null);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    (async () => {
      try {
        const QrScanner = (await import("qr-scanner")).default;

        const hasCamera = await QrScanner.hasCamera();
        if (!hasCamera) {
          if (!cancelled) setError("No camera found on this device.");
          return;
        }

        if (cancelled) return;

        const scanner = new QrScanner(
          video,
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
            msg.toLowerCase().includes("permission")
              ? "Camera permission denied. Allow camera access and try again."
              : msg,
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [open, onCode, stopScanner]);

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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-base">Scan invite QR code</DialogTitle>
          </DialogHeader>

          {error ? (
            <div className="px-5 pb-5 space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  setOpen(false);
                  setTimeout(() => setOpen(true), 50);
                }}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="relative w-full aspect-square bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              <p className="absolute bottom-3 left-0 right-0 text-center text-white/70 text-xs px-4">
                Point at a classmate&apos;s invite QR code
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
