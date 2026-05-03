/**
 * Background gradient presets used by the share-week overlay.
 * Each entry holds the CSS gradient string applied behind the dark scrim.
 * All gradients are tuned dark-ish so the white text stays legible.
 */

export interface GradientPreset {
  key: GradientKey;
  label: string;
  /** CSS background string passed straight through to `style={{ background }}`. */
  css: string;
}

export type GradientKey =
  | "maroon"
  | "ocean"
  | "forest"
  | "sunset"
  | "twilight"
  | "mono";

export const GRADIENT_PRESETS: readonly GradientPreset[] = [
  {
    key: "maroon",
    label: "Maroon",
    css: "linear-gradient(135deg, oklch(0.45 0.18 25) 0%, oklch(0.32 0.16 22) 55%, oklch(0.16 0.08 20) 100%)",
  },
  {
    key: "ocean",
    label: "Ocean",
    css: "linear-gradient(135deg, oklch(0.45 0.16 220) 0%, oklch(0.32 0.13 215) 55%, oklch(0.15 0.07 220) 100%)",
  },
  {
    key: "forest",
    label: "Forest",
    css: "linear-gradient(135deg, oklch(0.45 0.14 145) 0%, oklch(0.32 0.12 140) 55%, oklch(0.15 0.06 140) 100%)",
  },
  {
    key: "sunset",
    label: "Sunset",
    css: "linear-gradient(135deg, oklch(0.55 0.18 50) 0%, oklch(0.40 0.18 25) 55%, oklch(0.20 0.10 340) 100%)",
  },
  {
    key: "twilight",
    label: "Twilight",
    css: "linear-gradient(135deg, oklch(0.45 0.18 290) 0%, oklch(0.32 0.16 280) 55%, oklch(0.15 0.08 270) 100%)",
  },
  {
    key: "mono",
    label: "Mono",
    css: "linear-gradient(135deg, oklch(0.40 0.01 60) 0%, oklch(0.25 0.01 60) 55%, oklch(0.08 0.005 60) 100%)",
  },
] as const;

export const DEFAULT_GRADIENT_KEY: GradientKey = "maroon";

export function getGradientCss(key: GradientKey): string {
  const preset = GRADIENT_PRESETS.find((g) => g.key === key);
  return preset?.css ?? GRADIENT_PRESETS[0].css;
}
