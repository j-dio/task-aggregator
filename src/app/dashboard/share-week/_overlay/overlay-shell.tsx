import { type ReactNode } from "react";
import { formatWeekRange } from "@/lib/share-week/format-week-range";
import { GRADIENT_PRESETS } from "@/lib/share-week/gradients";

export const SHARE_CANVAS_WIDTH = 1080;
export const SHARE_CANVAS_HEIGHT = 1920;

const DEFAULT_GRADIENT_CSS = GRADIENT_PRESETS[0].css;

interface OverlayShellProps {
  weekStart: Date;
  /** Optional photo data URL behind the scrim. Photo takes precedence over gradient. */
  photoDataUrl?: string | null;
  /** Background gradient CSS string. Falls back to the maroon preset. */
  gradientCss?: string;
  children: ReactNode;
}

/**
 * Fixed-size 1080×1920 frame shared by every layout. Provides:
 *   - photo or maroon-gradient background
 *   - translucent dark scrim for legibility
 *   - header band (week range + small TapO(1) corner mark)
 *   - footer band (large TapO(1) watermark + ?ref=share URL)
 *
 * The schedule body (children) renders between header and footer.
 *
 * Render at native size — callers wrap with a CSS scale transform when
 * they want a smaller preview. The DOM dimensions stay 1080×1920 so the
 * eventual html-to-image capture produces a pixel-correct PNG.
 */
export function OverlayShell({
  weekStart,
  photoDataUrl,
  gradientCss,
  children,
}: OverlayShellProps) {
  const weekRange = formatWeekRange(weekStart);

  return (
    <div
      className="relative overflow-hidden font-sans text-white"
      style={{
        width: SHARE_CANVAS_WIDTH,
        height: SHARE_CANVAS_HEIGHT,
      }}
    >
      {/* Background: photo (highest precedence) or selected gradient preset. */}
      {photoDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoDataUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: gradientCss ?? DEFAULT_GRADIENT_CSS }}
        />
      )}

      {/* Scrim — keeps text legible against busy photos */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Top vignette so the header band reads against bright photos */}
      <div
        className="absolute inset-x-0 top-0 h-64"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0))",
        }}
      />
      {/* Bottom vignette so the watermark reads */}
      <div
        className="absolute inset-x-0 bottom-0 h-72"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0))",
        }}
      />

      {/* Header band */}
      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-16 pt-16">
        <div className="flex flex-col">
          <span className="text-2xl tracking-[0.4em] text-white/70 uppercase">
            This week
          </span>
          <span className="text-6xl leading-tight font-semibold tracking-tight">
            {weekRange}
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15 backdrop-blur-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Logo_png_ver.png"
            alt=""
            className="h-12 w-12 shrink-0"
            draggable={false}
          />
          <span className="pr-1 text-xl font-medium tracking-wide">
            TapO(1)
          </span>
        </div>
      </header>

      {/* Body slot for the layout */}
      <div className="absolute inset-x-0 top-[260px] bottom-[280px] px-16">
        {children}
      </div>

      {/* Footer watermark */}
      <footer className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-20">
        <div className="text-2xl tracking-[0.45em] text-white/65 uppercase">
          Don&apos;t forget
        </div>
        <div className="mt-3 text-7xl font-semibold tracking-tight">
          TapO(1)
        </div>
        <div className="mt-3 text-xl tracking-wide text-white/55">
          tap-o1.vercel.app/?ref=share
        </div>
      </footer>
    </div>
  );
}
