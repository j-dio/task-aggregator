import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { AppLogo } from "@/components/app-logo";
import { HowItWorksTimeline } from "@/components/landing/how-it-works-timeline";
import { LandingHero } from "@/components/landing/landing-hero";
import { WhatYouGetCarousel } from "@/components/landing/what-you-get-carousel";
import { landingFeatures } from "@/lib/landing/features";

const steps = [
  {
    title: "Sign in with Google",
    desc: "Use your UP Cebu Google account — no separate password needed.",
  },
  {
    title: "Connect UVEC Moodle",
    desc: "Paste your iCal URL once; tasks sync automatically after that.",
  },
  {
    title: "Sync Google Classroom",
    desc: "Grant Classroom access and keep assignment updates in one board.",
  },
];

const faq = [
  {
    q: "Does TapO(1) work offline?",
    a: "Not yet. TapO(1) depends on online sync to stay accurate across Moodle and Classroom.",
  },
  {
    q: "Can I track personal tasks?",
    a: "Yes. Add custom tasks for study blocks, personal deadlines, or anything outside class platforms.",
  },
  {
    q: "How quickly do tasks appear after setup?",
    a: "Most users see synced tasks within seconds of connecting UVEC and Google Classroom.",
  },
];

const tickerItems = [
  "One board for everything",
  "UVEC + Google Classroom",
  "Drag-and-drop Kanban",
  "24h push reminders",
  "Tappers — share with blockmates",
  "Remind them — weekly snapshots",
  "Custom tasks",
  "No context switching",
  "Free for UP Cebu",
  "O(1) access time",
];

export const metadata = { title: "TapO(1) — Academic Task Aggregator" };

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <style>{`
        /* ── Keyframes ─────────────────────────────────────────────── */
        @keyframes lp-up {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes lp-ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes lp-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-14px); }
        }
        @keyframes lp-pulse-glow {
          0%, 100% {
            filter:
              drop-shadow(0 0 18px oklch(0.178 0.022 265 / 55%))
              drop-shadow(0 0 44px oklch(0.178 0.022 265 / 38%))
              drop-shadow(0 0 80px oklch(0.178 0.022 265 / 22%));
          }
          50% {
            filter:
              drop-shadow(0 0 24px oklch(0.178 0.022 265 / 72%))
              drop-shadow(0 0 60px oklch(0.178 0.022 265 / 52%))
              drop-shadow(0 0 110px oklch(0.178 0.022 265 / 32%));
          }
        }
        @keyframes lp-pulse-glow-dark {
          0%, 100% {
            filter:
              drop-shadow(0 0 18px oklch(0.68 0.18 25 / 60%))
              drop-shadow(0 0 44px oklch(0.68 0.18 25 / 44%))
              drop-shadow(0 0 80px oklch(0.68 0.18 25 / 26%));
          }
          50% {
            filter:
              drop-shadow(0 0 26px oklch(0.68 0.18 25 / 80%))
              drop-shadow(0 0 64px oklch(0.68 0.18 25 / 58%))
              drop-shadow(0 0 120px oklch(0.68 0.18 25 / 36%));
          }
        }
        .lp-logo-glow img {
          animation: lp-pulse-glow 3s ease-in-out infinite;
          will-change: filter;
        }
        .dark .lp-logo-glow img {
          animation-name: lp-pulse-glow-dark;
        }

        /* ── Animation classes ─────────────────────────────────────── */
        .lp-up   { animation: lp-up   0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .lp-fade { animation: lp-fade 0.65s ease-out both; }
        .lp-logo-float {
          animation:
            lp-up   0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both,
            lp-float 5s   ease-in-out 1.3s infinite;
          will-change: transform;
        }

        /* ── Stagger delays ────────────────────────────────────────── */
        .lp-d0 { animation-delay:   0ms; }
        .lp-d1 { animation-delay: 110ms; }
        .lp-d2 { animation-delay: 220ms; }
        .lp-d3 { animation-delay: 330ms; }
        .lp-d4 { animation-delay: 440ms; }
        .lp-d5 { animation-delay: 550ms; }
        .lp-d6 { animation-delay: 660ms; }

        /* ── Ticker ────────────────────────────────────────────────── */
        .lp-ticker-wrap { overflow: hidden; }
        .lp-ticker-track {
          display: flex;
          width: max-content;
          animation: lp-ticker 32s linear infinite;
          will-change: transform;
        }
        .lp-ticker-wrap:hover .lp-ticker-track { animation-play-state: paused; }

        /* ── Reduced motion ────────────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .lp-up, .lp-fade, .lp-logo-float {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .lp-ticker-track { animation: none !important; }
          .lp-logo-glow img { animation: none !important; }
        }
      `}</style>

      {/* ── Sticky nav ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 h-14 shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6 md:px-10">
          <div className="flex items-center gap-2.5">
            <AppLogo className="size-6 rounded-full" />
            <span className="text-sm font-bold tracking-tight">TapO(1)</span>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-sm">
            <Link href="/login">
              Sign in
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-background">

        <LandingHero />

        {/* ── Ticker strip (pinned to hero bottom) ─────────────────── */}
        <div className="lp-fade lp-d5 lp-ticker-wrap shrink-0 border-y border-border py-3.5 select-none">
          <div className="lp-ticker-track">
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span
                key={i}
                className="flex items-center gap-8 whitespace-nowrap px-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
              >
                {item}
                <span className="opacity-30">×</span>
              </span>
            ))}
          </div>
        </div>

      </div>

      <div className="overflow-visible bg-background">

        {/* ── How it works ──────────────────────────────────────────── */}
        <HowItWorksTimeline steps={steps} />

        {/* ── Features — inverted ───────────────────────────────────── */}
        <section
          id="what-you-get"
          style={{ backgroundColor: "oklch(0.11 0.018 265)", color: "oklch(0.97 0 0)" }}
        >
          <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">

            <div className="lp-up mb-10 flex items-baseline justify-between">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: "oklch(1 0 0 / 38%)" }}
              >
                What you get
              </p>
              <span className="text-[10px]" style={{ color: "oklch(1 0 0 / 28%)" }}>
                {landingFeatures.length} features
              </span>
            </div>

            <div className="lp-up lp-d1 border-t pt-10 md:pt-14" style={{ borderColor: "oklch(1 0 0 / 10%)" }}>
              <WhatYouGetCarousel features={landingFeatures} />
            </div>
            <div className="mt-10 border-t md:mt-14" style={{ borderColor: "oklch(1 0 0 / 10%)" }} />
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28">

          <div className="lp-up mb-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Questions
            </p>
          </div>

          {faq.map(({ q, a }, i) => (
            <div
              key={q}
              className={`lp-up lp-d${i} grid gap-4 border-t border-border py-7 md:py-9 md:grid-cols-2 md:gap-12`}
            >
              <p className="text-base font-bold tracking-tight leading-snug">{q}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{a}</p>
            </div>
          ))}
          <div className="border-t border-border" />
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 pb-28 md:px-10">
          <div className="lp-up border-t border-border pt-14 md:pt-20">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Ready to start
            </p>
            <h2
              className="mb-10 font-black tracking-tighter text-foreground"
              style={{ fontSize: "clamp(2.8rem, 8vw, 7rem)", lineHeight: 0.92 }}
            >
              One board.<br />No excuses.
            </h2>
            <Button asChild size="lg" className="h-11 px-7 text-sm font-semibold gap-2">
              <Link href="/login">
                Sign in with Google
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-10">
            <div className="flex items-center gap-2">
              <AppLogo className="size-5 rounded-full" />
              <span className="text-xs font-medium text-muted-foreground">TapO(1)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Dio
            </p>
          </div>
        </footer>

      </div>
    </>
  );
}
