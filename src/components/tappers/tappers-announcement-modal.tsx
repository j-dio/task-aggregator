"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { ArrowRight, ArrowLeft, Users2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markTappersAnnouncementSeen } from "@/lib/actions/tappers";

const ANNOUNCE_KEY = "feature-announce-tappers-v2";
const ANNOUNCE_STORE_EVENT = "tappers-announce-store";

// The onboarding tour must be finished before the announcement can show.
const TOUR_COMPLETED_KEY = "onboarding-tour-completed";
const TOUR_STORE_EVENT = "onboarding-tour-store";

// How long to wait after the tour closes before showing the announcement.
const POST_TOUR_DELAY_MS = 600;

function subscribeToAnnounceStore(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const run = () => onStoreChange();
  window.addEventListener(ANNOUNCE_STORE_EVENT, run);
  window.addEventListener("storage", run);
  return () => {
    window.removeEventListener(ANNOUNCE_STORE_EVENT, run);
    window.removeEventListener("storage", run);
  };
}

function getAnnounceShouldShowSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ANNOUNCE_KEY) === null;
}

function getServerAnnounceShouldShowSnapshot(): boolean {
  return false;
}

interface Props {
  seenAnnouncement: boolean;
}

const SLIDE_COUNT = 2;

export function TappersAnnouncementModal({ seenAnnouncement }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // True once the onboarding tour has been completed or dismissed.
  // Initialised synchronously so returning users (tour already done) see no delay.
  const [tourDone, setTourDone] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(TOUR_COMPLETED_KEY) !== null;
  });

  // Listen for the tour finishing during this page session and apply the
  // short delay so the tappers modal doesn't open while the tour is mid-fade.
  useEffect(() => {
    if (tourDone) return;
    function handleTourDone() {
      if (localStorage.getItem(TOUR_COMPLETED_KEY) !== null) {
        setTimeout(() => setTourDone(true), POST_TOUR_DELAY_MS);
      }
    }
    window.addEventListener(TOUR_STORE_EVENT, handleTourDone);
    window.addEventListener("storage", handleTourDone);
    return () => {
      window.removeEventListener(TOUR_STORE_EVENT, handleTourDone);
      window.removeEventListener("storage", handleTourDone);
    };
  }, [tourDone]);

  const localShouldShow = useSyncExternalStore(
    subscribeToAnnounceStore,
    getAnnounceShouldShowSnapshot,
    getServerAnnounceShouldShowSnapshot,
  );

  if (!tourDone || seenAnnouncement || !localShouldShow) return null;

  function dismiss() {
    localStorage.setItem(ANNOUNCE_KEY, "true");
    window.dispatchEvent(new Event(ANNOUNCE_STORE_EVENT));
    void markTappersAnnouncementSeen();
  }

  function next() {
    if (step < SLIDE_COUNT - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  const isLast = step === SLIDE_COUNT - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-card animate-in fade-in-0 zoom-in-95 relative w-full max-w-md rounded-2xl border p-6 shadow-xl duration-200">
        <button
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground absolute top-4 right-4 transition-colors"
          aria-label="Skip announcement"
        >
          <X className="size-4" />
        </button>

        <div className="mb-6 flex justify-center gap-1.5">
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "bg-primary w-6"
                  : i < step
                    ? "bg-primary/40 w-1.5"
                    : "bg-muted w-1.5"
              }`}
            />
          ))}
        </div>

        <div className="mb-4 flex justify-center">
          <Users2 className="size-10 text-primary" />
        </div>

        {step === 0 ? (
          <>
            <h2 className="mb-2 text-center text-lg font-bold tracking-tight">
              Introducing Tappers
            </h2>
            <p className="text-muted-foreground mb-6 text-center text-sm leading-relaxed">
              Link with classmates and never miss a verbally-assigned task again.
              When someone in your class adds a task, they can share it with you
              in a tap.
            </p>
          </>
        ) : (
          <>
            <h2 className="mb-2 text-center text-lg font-bold tracking-tight">
              How it works
            </h2>
            <p className="text-muted-foreground mb-6 text-center text-sm leading-relaxed">
              Generate an invite code and share it with your classmate. They link
              up, and from then on, custom tasks they mark as shared appear in
              your Tappers feed instantly.
            </p>
          </>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={prev}
            disabled={step === 0}
            className="gap-1"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Button>

          <span className="text-muted-foreground text-xs">
            {step + 1} of {SLIDE_COUNT}
          </span>

          {isLast ? (
            <Button
              size="sm"
              onClick={() => {
                dismiss();
                router.push("/dashboard/tappers");
              }}
              className="gap-1"
            >
              Go to Tappers
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={next} className="gap-1">
              Next
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
