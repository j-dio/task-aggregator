"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LandingFeature } from "@/lib/landing/features";

const TRANSITION_MS = 560;
const GAP = 20;
const TEXT_GAP = 20;
const MAIN_H = 480;
const SEC_H = 220;
const MAIN_W_RATIO = 0.48;
const SEC_W_RATIO = 0.28;

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

type LayoutMetrics = {
  containerW: number;
  mainW: number;
  secW: number;
  peekViewW: number;
  stageW: number;
  textX: number;
  textW: number;
  textTop: number;
  secX: number;
  peekX: number;
};

function computeLayout(containerW: number): LayoutMetrics {
  const mainW = Math.round(containerW * MAIN_W_RATIO);
  const secW = Math.round(containerW * SEC_W_RATIO);
  const secX = mainW + GAP;
  const peekX = secX + secW + GAP;
  const peekViewW = Math.max(0, containerW - peekX);

  return {
    containerW,
    mainW,
    secW,
    peekViewW,
    stageW: containerW,
    textX: secX,
    textW: containerW - secX,
    textTop: SEC_H + TEXT_GAP,
    secX,
    peekX,
  };
}

type CardFrame = {
  key: string;
  featureIndex: number;
  x: number;
  clipW: number;
  innerW: number;
  h: number;
  opacity: number;
  zIndex: number;
};

function idleFrames(index: number, count: number, m: LayoutMetrics): CardFrame[] {
  return [
    {
      key: "main",
      featureIndex: index,
      x: 0,
      clipW: m.mainW,
      innerW: m.mainW,
      h: MAIN_H,
      opacity: 1,
      zIndex: 3,
    },
    {
      key: "secondary",
      featureIndex: mod(index + 1, count),
      x: m.secX,
      clipW: m.secW,
      innerW: m.secW,
      h: SEC_H,
      opacity: 1,
      zIndex: 2,
    },
    {
      key: "peek",
      featureIndex: mod(index + 2, count),
      x: m.peekX,
      clipW: m.peekViewW,
      innerW: m.secW,
      h: SEC_H,
      opacity: 1,
      zIndex: 1,
    },
  ];
}

function nextFromFrames(index: number, count: number, m: LayoutMetrics): CardFrame[] {
  const offRight = m.stageW + GAP;
  const idle = idleFrames(index, count, m);

  return [
    idle[0],
    idle[1],
    idle[2],
    {
      key: "enter-peek",
      featureIndex: mod(index + 3, count),
      x: offRight,
      clipW: m.peekViewW,
      innerW: m.secW,
      h: SEC_H,
      opacity: 1,
      zIndex: 1,
    },
  ];
}

function nextToFrames(index: number, count: number, m: LayoutMetrics): CardFrame[] {
  const offLeft = -(m.mainW + GAP);

  return [
    {
      key: "main",
      featureIndex: index,
      x: offLeft,
      clipW: m.mainW,
      innerW: m.mainW,
      h: MAIN_H,
      opacity: 0,
      zIndex: 1,
    },
    {
      key: "secondary",
      featureIndex: mod(index + 1, count),
      x: 0,
      clipW: m.mainW,
      innerW: m.mainW,
      h: MAIN_H,
      opacity: 1,
      zIndex: 4,
    },
    {
      key: "peek",
      featureIndex: mod(index + 2, count),
      x: m.secX,
      clipW: m.secW,
      innerW: m.secW,
      h: SEC_H,
      opacity: 1,
      zIndex: 2,
    },
    {
      key: "enter-peek",
      featureIndex: mod(index + 3, count),
      x: m.peekX,
      clipW: m.peekViewW,
      innerW: m.secW,
      h: SEC_H,
      opacity: 1,
      zIndex: 1,
    },
  ];
}

function prevFromFrames(index: number, count: number, m: LayoutMetrics): CardFrame[] {
  const offLeft = -(m.mainW + GAP);
  const idle = idleFrames(index, count, m);

  return [
    {
      key: "enter-main",
      featureIndex: mod(index - 1, count),
      x: offLeft,
      clipW: m.mainW,
      innerW: m.mainW,
      h: MAIN_H,
      opacity: 1,
      zIndex: 4,
    },
    idle[0],
    idle[1],
    idle[2],
  ];
}

function prevToFrames(index: number, count: number, m: LayoutMetrics): CardFrame[] {
  const offRight = m.stageW + GAP;

  return [
    {
      key: "enter-main",
      featureIndex: mod(index - 1, count),
      x: 0,
      clipW: m.mainW,
      innerW: m.mainW,
      h: MAIN_H,
      opacity: 1,
      zIndex: 4,
    },
    {
      key: "main",
      featureIndex: index,
      x: m.secX,
      clipW: m.secW,
      innerW: m.secW,
      h: SEC_H,
      opacity: 1,
      zIndex: 2,
    },
    {
      key: "secondary",
      featureIndex: mod(index + 1, count),
      x: m.peekX,
      clipW: m.peekViewW,
      innerW: m.secW,
      h: SEC_H,
      opacity: 1,
      zIndex: 1,
    },
    {
      key: "peek",
      featureIndex: mod(index + 2, count),
      x: offRight,
      clipW: m.peekViewW,
      innerW: m.secW,
      h: SEC_H,
      opacity: 0,
      zIndex: 0,
    },
  ];
}

function FeaturePlaceholder({ feature }: { feature: LandingFeature }) {
  const hue =
    feature.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className="relative flex h-full w-full items-end overflow-hidden p-4"
      style={{
        background: `linear-gradient(145deg, oklch(0.22 0.04 ${hue}) 0%, oklch(0.14 0.03 ${hue + 40}) 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-12deg, oklch(1 0 0) 0 1px, transparent 1px 14px)",
        }}
        aria-hidden
      />
      <span
        className="relative text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: "oklch(1 0 0 / 42%)" }}
      >
        Screenshot · {feature.title}
      </span>
    </div>
  );
}

function FeatureImage({ feature }: { feature: LandingFeature }) {
  if (feature.imageSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={feature.imageSrc}
        alt=""
        className="h-full w-full object-cover"
      />
    );
  }
  return <FeaturePlaceholder feature={feature} />;
}

type WhatYouGetCarouselProps = {
  features: LandingFeature[];
};

export function WhatYouGetCarousel({ features }: WhatYouGetCarouselProps) {
  const count = features.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev" | null>(null);
  const [frames, setFrames] = useState<CardFrame[]>([]);
  const [textOffset, setTextOffset] = useState(0);
  const [metrics, setMetrics] = useState<LayoutMetrics | null>(null);
  const [transitionEnabled, setTransitionEnabled] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  const syncIdle = useCallback(
    (index: number, m: LayoutMetrics) => {
      setTransitionEnabled(false);
      setFrames(idleFrames(index, count, m));
      setTextOffset(0);
    },
    [count],
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const apply = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const m = computeLayout(w);
      setMetrics(m);
      if (direction === null) {
        syncIdle(activeIndex, m);
      }
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [activeIndex, direction, syncIdle]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const finishTransition = useCallback(
    (dir: "next" | "prev", m: LayoutMetrics) => {
      const nextIndex =
        dir === "next" ? mod(activeIndex + 1, count) : mod(activeIndex - 1, count);
      setDirection(null);
      setActiveIndex(nextIndex);
      syncIdle(nextIndex, m);
    },
    [activeIndex, count, syncIdle],
  );

  const go = useCallback(
    (dir: "next" | "prev") => {
      if (direction !== null || count <= 1 || !metrics) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        setActiveIndex((i) =>
          dir === "next" ? mod(i + 1, count) : mod(i - 1, count),
        );
        return;
      }

      const from =
        dir === "next"
          ? nextFromFrames(activeIndex, count, metrics)
          : prevFromFrames(activeIndex, count, metrics);
      const to =
        dir === "next"
          ? nextToFrames(activeIndex, count, metrics)
          : prevToFrames(activeIndex, count, metrics);

      setDirection(dir);
      setTransitionEnabled(false);
      setFrames(from);
      setTextOffset(0);

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          setTransitionEnabled(true);
          setFrames(to);
          setTextOffset(dir === "next" ? -1 : 1);
        });
      });

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(
        () => finishTransition(dir, metrics),
        TRANSITION_MS,
      );
    },
    [activeIndex, count, direction, finishTransition, metrics],
  );

  const activeFeature = features[activeIndex];
  const incomingIndex =
    direction === "next"
      ? mod(activeIndex + 1, count)
      : direction === "prev"
        ? mod(activeIndex - 1, count)
        : activeIndex;
  const incomingFeature = features[incomingIndex];

  const progress = count > 0 ? (activeIndex + 1) / count : 0;
  const easing = "cubic-bezier(0.16, 1, 0.3, 1)";
  const cardTransition = transitionEnabled
    ? `left ${TRANSITION_MS}ms ${easing}, width ${TRANSITION_MS}ms ${easing}, height ${TRANSITION_MS}ms ${easing}, opacity ${TRANSITION_MS}ms ${easing}`
    : "none";

  return (
    <div className="select-none">
      <div ref={containerRef} className="w-full">
        {metrics && (
          <>
            <div
              className="relative w-full overflow-hidden"
              style={{ height: MAIN_H }}
            >
              {frames.map((frame) => (
                <div
                  key={frame.key}
                  className="absolute top-0 overflow-hidden rounded-sm"
                  style={{
                    left: frame.x,
                    width: frame.clipW,
                    height: frame.h,
                    opacity: frame.opacity,
                    zIndex: frame.zIndex,
                    transition: cardTransition,
                  }}
                >
                  <div
                    className="h-full max-w-none"
                    style={{ width: frame.innerW }}
                  >
                    <FeatureImage feature={features[frame.featureIndex]} />
                  </div>
                </div>
              ))}

              {/* Feature copy — sits in the space below sec/peek, beside main */}
              <div
                className="absolute overflow-hidden"
                style={{
                  top: metrics.textTop,
                  left: metrics.textX,
                  width: metrics.textW,
                  maxHeight: MAIN_H - metrics.textTop,
                }}
              >
                <div
                  className="grid gap-1.5"
                  style={{
                    transform:
                      textOffset === 0
                        ? "translateX(0)"
                        : textOffset < 0
                          ? "translateX(-105%)"
                          : "translateX(105%)",
                    opacity: textOffset === 0 ? 1 : 0,
                    transition: transitionEnabled
                      ? `transform ${TRANSITION_MS}ms ${easing}, opacity ${TRANSITION_MS}ms ${easing}`
                      : "none",
                  }}
                >
                  <h3
                    className="text-base font-bold tracking-tight md:text-lg"
                    style={{ color: "oklch(0.97 0 0)" }}
                  >
                    {activeFeature.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed md:text-[0.9375rem]"
                    style={{ color: "oklch(1 0 0 / 52%)" }}
                  >
                    {activeFeature.description}
                  </p>
                </div>

                {direction !== null && (
                  <div
                    className="absolute inset-0 grid gap-1.5"
                    aria-hidden
                    style={{
                      transform:
                        textOffset === 0
                          ? direction === "next"
                            ? "translateX(105%)"
                            : "translateX(-105%)"
                          : "translateX(0)",
                      opacity: textOffset === 0 ? 0 : 1,
                      transition: transitionEnabled
                        ? `transform ${TRANSITION_MS}ms ${easing}, opacity ${TRANSITION_MS}ms ${easing}`
                        : "none",
                    }}
                  >
                    <h3
                      className="text-base font-bold tracking-tight md:text-lg"
                      style={{ color: "oklch(0.97 0 0)" }}
                    >
                      {incomingFeature.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed md:text-[0.9375rem]"
                      style={{ color: "oklch(1 0 0 / 52%)" }}
                    >
                      {incomingFeature.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 flex items-center gap-6">
        <div
          className="relative h-px flex-1 overflow-hidden rounded-full"
          style={{ backgroundColor: "oklch(1 0 0 / 12%)" }}
        >
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: "oklch(1 0 0 / 55%)",
              transition: `width ${TRANSITION_MS}ms ${easing}`,
            }}
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => go("prev")}
            disabled={direction !== null}
            className="flex size-9 items-center justify-center rounded-full border transition-opacity disabled:opacity-40"
            style={{
              borderColor: "oklch(1 0 0 / 18%)",
              color: "oklch(0.97 0 0)",
            }}
            aria-label="Previous feature"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => go("next")}
            disabled={direction !== null}
            className="flex size-9 items-center justify-center rounded-full border transition-opacity disabled:opacity-40"
            style={{
              borderColor: "oklch(1 0 0 / 18%)",
              color: "oklch(0.97 0 0)",
            }}
            aria-label="Next feature"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
