"use client";

import { type ReactNode, type RefObject } from "react";
import {
  OverlayShell,
  SHARE_CANVAS_HEIGHT,
  SHARE_CANVAS_WIDTH,
} from "./overlay-shell";

interface ShareCanvasProps {
  weekStart: Date;
  photoDataUrl: string | null;
  /** Gradient CSS used when no photo is set. Forwarded to both shells. */
  gradientCss: string;
  /** The chosen layout's body content. Rendered twice — once for the visible
   * scaled preview, once for the off-screen capture target. Keep it pure. */
  body: ReactNode;
  /** Visible preview tile width in CSS pixels. Height is derived from 9:16. */
  previewWidth: number;
  /** Ref attached to the off-screen native-size capture target. */
  captureRef: RefObject<HTMLDivElement | null>;
}

/**
 * Visible 9:16 preview tile + hidden 1080×1920 capture target. Both render
 * the same OverlayShell + layout so html-to-image can grab a pixel-correct
 * PNG without juggling CSS transforms during capture.
 *
 * The capture target is hidden via a 0×0 absolutely-positioned wrapper with
 * `overflow: hidden`. The captured node itself keeps its native 1080×1920
 * dimensions and computed styles intact (no transform, no opacity, no
 * visibility:hidden) — html-to-image's SVG roundtrip needs that. The wrapper
 * just clips it from view. Earlier versions used `position:fixed; left:-100000px`
 * which produced blank PNGs in some browser/library combinations.
 */
export function ShareCanvas({
  weekStart,
  photoDataUrl,
  gradientCss,
  body,
  previewWidth,
  captureRef,
}: ShareCanvasProps) {
  const previewHeight =
    previewWidth * (SHARE_CANVAS_HEIGHT / SHARE_CANVAS_WIDTH);
  const previewScale = previewWidth / SHARE_CANVAS_WIDTH;

  return (
    <>
      <div
        className="ring-border overflow-hidden rounded-2xl shadow-lg ring-1"
        style={{ width: previewWidth, height: previewHeight }}
      >
        <div
          style={{
            width: SHARE_CANVAS_WIDTH,
            height: SHARE_CANVAS_HEIGHT,
            transform: `scale(${previewScale})`,
            transformOrigin: "top left",
          }}
        >
          <OverlayShell
            weekStart={weekStart}
            photoDataUrl={photoDataUrl}
            gradientCss={gradientCss}
          >
            {body}
          </OverlayShell>
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div
          ref={captureRef}
          style={{
            position: "relative",
            width: SHARE_CANVAS_WIDTH,
            height: SHARE_CANVAS_HEIGHT,
          }}
        >
          <OverlayShell
            weekStart={weekStart}
            photoDataUrl={photoDataUrl}
            gradientCss={gradientCss}
          >
            {body}
          </OverlayShell>
        </div>
      </div>
    </>
  );
}
