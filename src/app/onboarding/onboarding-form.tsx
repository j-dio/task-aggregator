"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Calendar, ChevronRight } from "lucide-react";
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
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {displayName}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Let&apos;s connect your university accounts to start aggregating
          tasks.
        </p>
      </div>

      {/* Google Classroom Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-success/20">
              <Check className="size-4 text-success" />
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
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/20">
              <Calendar className="size-4 text-primary" />
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
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
          >
            <ChevronRight
              className={`size-4 transition-transform ${showSteps ? "rotate-90" : ""}`}
            />
            {showSteps ? "Hide" : "Show"} setup instructions
          </button>

          {showSteps && (
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4">
              {ICAL_STEPS.map(({ step, title, description }) => (
                <div key={step} className="flex gap-3">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {step}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-sm text-muted-foreground">
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
                className="mb-1.5 block text-sm font-medium"
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
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none disabled:opacity-50"
                disabled={isPending}
              />
              {error && (
                <p className="mt-1.5 text-sm text-destructive">{error}</p>
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
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        disabled={isPending}
      >
        Skip for now — I&apos;ll set this up later
      </button>
    </div>
  );
}
