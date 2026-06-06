"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type HowItWorksStep = {
  title: string;
  desc: string;
};

const LINE_LEFT = "0.3125rem"; /* 5px — center of 10px timeline column */

export function HowItWorksTimeline({ steps }: { steps: HowItWorksStep[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>(() => steps.map(() => false));

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setRevealed(steps.map(() => true));
      return;
    }

    const observers: IntersectionObserver[] = [];

    stepRefs.current.forEach((el, index) => {
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;

          if (entry.isIntersecting) {
            setRevealed((prev) => {
              if (prev[index]) return prev;
              const next = [...prev];
              next[index] = true;
              return next;
            });
          }
        },
        { threshold: 0.45, rootMargin: "0px 0px -12% 0px" }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [steps.length]);

  const lastRevealed = revealed.lastIndexOf(true);
  const lineProgress =
    steps.length <= 1 ? (lastRevealed >= 0 ? 1 : 0) : Math.max(0, lastRevealed) / (steps.length - 1);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28"
    >
      <style>{`
        @keyframes hiw-content-in {
          from {
            opacity: 0;
            transform: translateX(14px);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
            filter: blur(0);
          }
        }
        .hiw-content-in {
          animation: hiw-content-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .hiw-content-in { animation: none !important; }
        }
      `}</style>

      <div className="lp-up mb-10 flex items-baseline justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          How it works
        </p>
        <span className="text-[10px] text-muted-foreground/50">3 steps</span>
      </div>

      <div className="relative border-t border-border pt-2">
        {/* Timeline track — runs through dot centers */}
        <div
          className="pointer-events-none absolute top-8 bottom-8 w-px bg-border"
          style={{ left: LINE_LEFT }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-8 w-px origin-top bg-primary transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            left: LINE_LEFT,
            height: "calc(100% - 4rem)",
            transform: `scaleY(${lineProgress})`,
          }}
          aria-hidden
        />

        <ol className="relative list-none">
          {steps.map((step, index) => {
            const isRevealed = revealed[index];
            const isActive = isRevealed && index === lastRevealed;

            return (
              <li
                key={step.title}
                ref={(el) => {
                  stepRefs.current[index] = el;
                }}
                className="grid grid-cols-[0.625rem_1fr] gap-5 border-b border-border py-7 md:gap-10 md:py-9"
              >
                <div className="relative flex justify-center pt-2">
                  <span
                    className={cn(
                      "relative z-10 block size-2.5 shrink-0 rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      isRevealed
                        ? isActive
                          ? "scale-[1.35] bg-primary ring-4 ring-primary/15"
                          : "bg-primary"
                        : "scale-75 bg-border"
                    )}
                    aria-current={isActive ? "step" : undefined}
                  />
                </div>

                <div
                  className={cn(
                    "grid min-w-0 gap-1.5 transition-opacity duration-500 md:grid-cols-2 md:gap-12",
                    isRevealed ? "opacity-100" : "opacity-0",
                    isRevealed && "hiw-content-in"
                  )}
                >
                  <h3 className="text-base font-bold tracking-tight md:text-lg">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
