"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SPRING_STIFFNESS = 200;
const SPRING_DAMPING = 11;
const HERO_PAD = 12;

type Offset = { x: number; y: number };

function springStep(
  pos: number,
  vel: number,
  target: number,
  dt: number
): [number, number] {
  const force = -SPRING_STIFFNESS * (pos - target);
  const damping = -SPRING_DAMPING * vel;
  const accel = force + damping;
  const nextVel = vel + accel * dt;
  const nextPos = pos + nextVel * dt;
  return [nextPos, nextVel];
}

function spotlightTextShadow(strength: number): string {
  if (strength <= 0.02) return "none";
  return `0 0 ${24 + strength * 56}px oklch(0.68 0.18 25 / ${0.25 + strength * 0.45}), 0 0 ${80 + strength * 100}px oklch(0.68 0.18 25 / ${0.08 + strength * 0.2})`;
}

function spotlightTaglineShadow(strength: number): string {
  if (strength <= 0.05) return "none";
  return `0 0 ${12 + strength * 28}px oklch(0.68 0.18 25 / ${0.12 + strength * 0.28})`;
}

function spotlightRuleShadow(strength: number): string {
  if (strength <= 0.04) return "none";
  return `0 -1px ${20 + strength * 40}px oklch(0.68 0.18 25 / ${0.08 + strength * 0.22})`;
}

export function LandingHero() {
  const heroRef = useRef<HTMLElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);

  const offsetRef = useRef<Offset>({ x: 0, y: 0 });
  const velocityRef = useRef<Offset>({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const lightingRafRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const pointerStartRef = useRef<Offset>({ x: 0, y: 0 });

  const [dragging, setDragging] = useState(false);
  const [springing, setSpringing] = useState(false);
  const [wiggle, setWiggle] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(true);

  const clampOffset = useCallback((x: number, y: number): Offset => {
    const hero = heroRef.current;
    const anchor = anchorRef.current;
    const drag = dragRef.current;
    if (!hero || !anchor || !drag) return { x, y };

    const heroRect = hero.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const dragWidth = drag.offsetWidth;
    const dragHeight = drag.offsetHeight;

    const minX = heroRect.left + HERO_PAD - anchorRect.left;
    const maxX = heroRect.right - HERO_PAD - dragWidth - anchorRect.left;
    const minY = heroRect.top + HERO_PAD - anchorRect.top;
    const maxY = heroRect.bottom - HERO_PAD - dragHeight - anchorRect.top;

    if (maxX < minX || maxY < minY) return { x: 0, y: 0 };

    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    };
  }, []);

  const updateLighting = useCallback(() => {
    lightingRafRef.current = null;

    const hero = heroRef.current;
    const drag = dragRef.current;
    const headline = headlineRef.current;
    if (!hero || !drag) return;

    const heroRect = hero.getBoundingClientRect();
    const dragRect = drag.getBoundingClientRect();
    const cx = dragRect.left + dragRect.width / 2 - heroRect.left;
    const cy = dragRect.top + dragRect.height / 2 - heroRect.top;

    hero.style.setProperty("--light-x", `${cx}px`);
    hero.style.setProperty("--light-y", `${cy}px`);

    let strength = 0;
    if (headline) {
      const hr = headline.getBoundingClientRect();
      const hx = hr.left + hr.width * 0.35;
      const hy = hr.top + hr.height * 0.5;
      const lx = dragRect.left + dragRect.width / 2;
      const ly = dragRect.top + dragRect.height / 2;
      const dist = Math.hypot(lx - hx, ly - hy);
      strength = Math.max(0, 1 - dist / 420);
    }

    hero.style.setProperty("--spotlight", `${strength}`);
    if (headline) headline.style.textShadow = spotlightTextShadow(strength);
    if (taglineRef.current) taglineRef.current.style.textShadow = spotlightTaglineShadow(strength);
    if (ruleRef.current) ruleRef.current.style.boxShadow = spotlightRuleShadow(strength);
  }, []);

  const scheduleLightingUpdate = useCallback(() => {
    if (lightingRafRef.current !== null) return;
    lightingRafRef.current = requestAnimationFrame(updateLighting);
  }, [updateLighting]);

  const applyOffset = useCallback(
    (next: Offset) => {
      offsetRef.current = next;
      if (dragRef.current) {
        dragRef.current.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
      }
      scheduleLightingUpdate();
    },
    [scheduleLightingUpdate]
  );

  const stopSpring = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setSpringing(false);
  }, []);

  const startSpring = useCallback(() => {
    stopSpring();
    setSpringing(true);
    velocityRef.current = { x: velocityRef.current.x * 0.35, y: velocityRef.current.y * 0.35 };

    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.032);
      last = now;

      const [nx, vx] = springStep(offsetRef.current.x, velocityRef.current.x, 0, dt);
      const [ny, vy] = springStep(offsetRef.current.y, velocityRef.current.y, 0, dt);

      velocityRef.current = { x: vx, y: vy };
      applyOffset({ x: nx, y: ny });

      const settled = Math.hypot(nx, ny) < 0.4 && Math.hypot(vx, vy) < 0.4;

      if (settled) {
        applyOffset({ x: 0, y: 0 });
        velocityRef.current = { x: 0, y: 0 };
        stopSpring();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [applyOffset, stopSpring]);

  const pointerInsideHero = useCallback((clientX: number, clientY: number) => {
    const hero = heroRef.current;
    if (!hero) return true;
    const r = hero.getBoundingClientRect();
    return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!motionEnabled) return;
    e.preventDefault();
    stopSpring();
    draggingRef.current = true;
    setDragging(true);
    setWiggle(false);
    pointerStartRef.current = {
      x: e.clientX - offsetRef.current.x,
      y: e.clientY - offsetRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;

    if (!pointerInsideHero(e.clientX, e.clientY)) {
      draggingRef.current = false;
      setDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
      startSpring();
      return;
    }

    applyOffset(
      clampOffset(
        e.clientX - pointerStartRef.current.x,
        e.clientY - pointerStartRef.current.y
      )
    );
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    startSpring();
  };

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMotionEnabled(!reduced);
    scheduleLightingUpdate();

    if (reduced) {
      return () => {
        if (lightingRafRef.current !== null) {
          cancelAnimationFrame(lightingRafRef.current);
        }
      };
    }

    const wiggleTimer = window.setTimeout(() => setWiggle(true), 2200);
    const wiggleOff = window.setTimeout(() => setWiggle(false), 3200);

    return () => {
      window.clearTimeout(wiggleTimer);
      window.clearTimeout(wiggleOff);
      stopSpring();
      if (lightingRafRef.current !== null) {
        cancelAnimationFrame(lightingRafRef.current);
      }
    };
  }, [scheduleLightingUpdate, stopSpring]);

  return (
    <section
      ref={heroRef}
      className="lp-hero-light relative mx-auto max-w-6xl overflow-visible pt-16 pb-20 md:pt-24 md:pb-28"
      style={
        {
          "--light-x": "82%",
          "--light-y": "22%",
          "--spotlight": "0",
        } as React.CSSProperties
      }
    >
      <style>{`
        .lp-hero-light::before {
          content: "";
          position: absolute;
          top: -3rem;
          bottom: -2rem;
          left: -5rem;
          right: -5rem;
          pointer-events: none;
          z-index: 0;
          background: radial-gradient(
            circle 320px at calc(var(--light-x) + 5rem) calc(var(--light-y) + 3rem),
            oklch(0.68 0.18 25 / calc(0.08 + var(--spotlight) * 0.18)),
            oklch(0.68 0.18 25 / calc(0.03 + var(--spotlight) * 0.06)) 38%,
            transparent 72%
          );
        }
        @media (min-width: 768px) {
          .lp-hero-light::before {
            left: -6rem;
            right: -6rem;
            background: radial-gradient(
              circle 320px at calc(var(--light-x) + 6rem) calc(var(--light-y) + 3rem),
              oklch(0.68 0.18 25 / calc(0.08 + var(--spotlight) * 0.18)),
              oklch(0.68 0.18 25 / calc(0.03 + var(--spotlight) * 0.06)) 38%,
              transparent 72%
            );
          }
        }
        .lp-hero-light > *:not(.lp-logo-float) {
          position: relative;
          z-index: 1;
        }
        @keyframes lp-logo-wiggle {
          0%, 100% { transform: rotate(0deg) translate3d(0, 0, 0); }
          18%      { transform: rotate(-5deg) translate3d(-4px, -3px, 0); }
          36%      { transform: rotate(5deg) translate3d(4px, 2px, 0); }
          54%      { transform: rotate(-3deg) translate3d(-2px, -2px, 0); }
          72%      { transform: rotate(3deg) translate3d(2px, 1px, 0); }
        }
        .lp-logo-wiggle-hint {
          animation: lp-logo-wiggle 0.85s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        .lp-logo-float.is-dragging .lp-logo-wiggle-hint {
          animation: none !important;
        }
        .lp-logo-float.is-dragging,
        .lp-logo-float.is-springing {
          animation:
            lp-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-hero-light::before { display: none; }
          .lp-logo-wiggle-hint { animation: none !important; }
        }
      `}</style>

      <div
        ref={anchorRef}
        className={cn(
          "lp-logo-float absolute top-20 z-20 hidden overflow-visible md:right-20 md:block",
          dragging && "is-dragging",
          springing && "is-springing"
        )}
      >
        <div className={cn("overflow-visible", wiggle && motionEnabled && !dragging && "lp-logo-wiggle-hint")}>
          <div
            ref={dragRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={cn(
              "touch-none overflow-visible select-none",
              motionEnabled && "cursor-grab active:cursor-grabbing"
            )}
            style={{
              transform: "translate3d(0, 0, 0)",
              willChange: dragging || springing ? "transform" : undefined,
            }}
            title="Drag the logo"
          >
            <AppLogo className="lp-logo-glow size-28 overflow-visible rounded-full lg:size-36" />
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10">
        <p className="lp-up lp-d0 mb-6 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Academic Task Aggregator &nbsp;·&nbsp; UP Cebu
        </p>

        <h1
          ref={headlineRef}
          className="lp-up lp-d1 font-black tracking-tighter text-foreground"
          style={{ fontSize: "clamp(5rem, 12vw, 10.5rem)", lineHeight: 0.9 }}
        >
          TapO(1)
        </h1>

        <div className="lp-up lp-d2 mt-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <p
            ref={taglineRef}
            className="font-semibold tracking-tight text-foreground"
            style={{
              fontSize: "clamp(1.4rem, 3.5vw, 2.25rem)",
              lineHeight: 1.15,
            }}
          >
            Academic tracking in constant time.
          </p>
          <p className="max-w-70 text-sm leading-relaxed text-muted-foreground">
            Pull tasks from UVEC and Google Classroom into one drag-and-drop board.
          </p>
        </div>

        <div ref={ruleRef} className="lp-fade lp-d3 my-8 border-t border-border" />

        <div className="lp-up lp-d3 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="h-11 px-7 text-sm font-semibold gap-2">
            <Link href="/login">
              Get started free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            See setup steps →
          </a>
        </div>

        <p className="lp-fade lp-d4 mt-6 text-[11px] text-muted-foreground/70">
          Free for UP Cebu students · Syncs UVEC iCal + Google Classroom · Push reminders included
        </p>
      </div>
    </section>
  );
}
