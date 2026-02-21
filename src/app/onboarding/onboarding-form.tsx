"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveUvecIcalUrl } from "@/lib/actions/auth";
import { uvecIcalUrlSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ICAL_STEPS = [
  {
    step: 1,
    title: "Open UVEC",
    description:
      'Go to your UVEC dashboard and click on "Calendar" in the navigation menu.',
  },
  {
    step: 2,
    title: "Export Calendar",
    description:
      'Click the "Export calendar" button (or import/export icon) at the bottom of the calendar page.',
  },
  {
    step: 3,
    title: "Configure Export",
    description:
      'Set "All events" for the export type and choose a wide date range to include all assignments.',
  },
  {
    step: 4,
    title: "Copy the URL",
    description:
      'Click "Get calendar URL" and copy the entire URL. It should start with https:// and contain "export_execute.php".',
  },
] as const;

export function OnboardingForm({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = uvecIcalUrlSchema.safeParse(url.trim());

    if (!result.success) {
      const firstError = result.error.issues[0];
      setError(firstError?.message ?? "Invalid URL");
      return;
    }

    startTransition(async () => {
      const response = await saveUvecIcalUrl(result.data);

      if (response.error) {
        setError(response.error);
        return;
      }

      router.push("/dashboard");
    });
  }

  function handleSkip() {
    router.push("/dashboard");
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome, {displayName}! 👋
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Let&apos;s connect your university accounts to start aggregating
          tasks.
        </p>
      </div>

      {/* Google Classroom Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-base">Google Classroom</CardTitle>
              <CardDescription>Connected via Google Sign-In</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* UVEC iCal URL */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base">UVEC (Moodle)</CardTitle>
              <CardDescription>
                Paste your iCal export URL to sync assignments
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Step-by-step guide */}
          <button
            type="button"
            onClick={() => setShowSteps((prev) => !prev)}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <ChevronIcon
              className={`h-4 w-4 transition-transform ${showSteps ? "rotate-90" : ""}`}
            />
            {showSteps ? "Hide" : "Show"} setup instructions
          </button>

          {showSteps && (
            <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              {ICAL_STEPS.map(({ step, title, description }) => (
                <div key={step} className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                    {step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {title}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="uvec-url"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                iCal Export URL
              </label>
              <input
                id="uvec-url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                placeholder="https://uvec.example.edu/calendar/export_execute.php?..."
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                disabled={isPending}
              />
              {error && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isPending || !url.trim()} size="lg">
              {isPending ? "Saving..." : "Connect UVEC"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={handleSkip}
        className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        disabled={isPending}
      >
        Skip for now — I&apos;ll set this up later
      </button>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
