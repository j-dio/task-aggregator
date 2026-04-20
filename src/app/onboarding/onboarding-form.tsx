"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Info,
  Link2,
  Loader2,
  Sparkles,
  Users2,
} from "lucide-react";
import { saveUvecIcalUrl } from "@/lib/actions/auth";
import { uvecIcalUrlSchema } from "@/lib/validations/auth";
import { createInvite } from "@/lib/actions/tappers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SETUP_STEPS = [
  {
    step: 1,
    title: "Google sign-in",
    helper: "Done. Classroom syncs from the dashboard.",
  },
  {
    step: 2,
    title: "UVEC calendar link",
    helper: "Paste the UVEC iCal export URL here.",
  },
  {
    step: 3,
    title: "Link with classmates",
    helper: "Optional: link with classmates to share tasks.",
  },
  {
    step: 4,
    title: "Finish",
    helper: "Head to your dashboard.",
  },
];

const ICAL_STEPS = [
  {
    step: 1,
    title: "Open Calendar",
    description: "In UVEC, open Calendar from the main menu.",
  },
  {
    step: 2,
    title: "Export",
    description: "Use Export calendar at the bottom of that page.",
  },
  {
    step: 3,
    title: "Options",
    description: "Pick All events and a wide date range.",
  },
  {
    step: 4,
    title: "Copy URL",
    description: "Copy the full https:// link (includes export_execute.php).",
  },
] as const;

type StepState = "complete" | "active" | "pending";

function getUrlHelperText(value: string, isValid: boolean) {
  if (!value) {
    return "Full export URL from UVEC — usually contains export_execute.php.";
  }

  if (isValid) {
    return "Looks valid.";
  }

  if (value.startsWith("http://")) {
    return "Use https:// from UVEC.";
  }

  if (!value.includes("export") && !value.includes("ical")) {
    return "Link may be incomplete — copy the full export URL.";
  }

  return "Recheck against the steps above.";
}

function StepChip({
  step,
  title,
  helper,
  state,
  delay,
}: {
  step: number;
  title: string;
  helper: string;
  state: StepState;
  delay: string;
}) {
  return (
    <li
      className={cn(
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-1 rounded-xl border p-2.5 transition-all motion-safe:duration-300 motion-reduce:animate-none",
        state === "complete" && "border-success/35 bg-success/10",
        state === "active" &&
          "border-primary/45 bg-primary/8 shadow-primary/10 shadow-sm",
        state === "pending" && "border-border bg-muted/35",
      )}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
            state === "complete" &&
              "border-success bg-success text-success-foreground",
            state === "active" &&
              "border-primary bg-primary text-primary-foreground",
            state === "pending" &&
              "border-input bg-background text-muted-foreground",
          )}
          aria-hidden="true"
        >
          {state === "complete" ? <Check className="size-3.5" /> : step}
        </div>
        <div className="space-y-1">
          <p className="text-sm leading-tight font-semibold">{title}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {helper}
          </p>
        </div>
      </div>
    </li>
  );
}

function StatusBanner({
  tone,
  title,
  description,
}: {
  tone: "info" | "error" | "success";
  title: string;
  description: string;
}) {
  const icon =
    tone === "error" ? (
      <AlertCircle className="size-4" />
    ) : tone === "success" ? (
      <CheckCircle2 className="size-4" />
    ) : (
      <Info className="size-4" />
    );

  return (
    <div
      className={cn(
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 rounded-lg border px-3 py-2.5 text-sm motion-safe:duration-200 motion-reduce:animate-none",
        tone === "info" && "border-info/35 bg-info/8 text-foreground",
        tone === "error" &&
          "border-destructive/35 bg-destructive/8 text-foreground",
        tone === "success" && "border-success/35 bg-success/10 text-foreground",
      )}
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <div className="flex gap-2">
        <span
          className={cn(
            "mt-0.5",
            tone === "error" && "text-destructive",
            tone === "success" && "text-success",
            tone === "info" && "text-info",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function OnboardingForm({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "success">(
    "idle",
  );
  const [currentView, setCurrentView] = useState<"uvec" | "tappers">("uvec");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generateCodePending, startGenerateCodeTransition] = useTransition();

  const trimmedUrl = url.trim();
  const parsedUrl = uvecIcalUrlSchema.safeParse(trimmedUrl);
  const isUrlValid = trimmedUrl.length > 0 && parsedUrl.success;

  const activeStep =
    currentView === "tappers"
      ? 3
      : isUrlValid || submitState === "saving" || submitState === "success" || isPending
        ? 3
        : 2;

  const stepStates = SETUP_STEPS.map((s) => {
    let state: StepState;
    if (s.step === 1) {
      state = "complete";
    } else if (s.step === 2) {
      state =
        isUrlValid || currentView === "tappers"
          ? "complete"
          : activeStep === 2
            ? "active"
            : "pending";
    } else if (s.step === 3) {
      state = currentView === "tappers" ? "active" : "pending";
    } else {
      state = "pending";
    }
    return { ...s, state };
  });

  const guideFocusStep = trimmedUrl ? 4 : 1;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const candidate = url.trim();
    const result = uvecIcalUrlSchema.safeParse(candidate);

    if (!result.success) {
      const firstError = result.error.issues[0];
      setSubmitState("idle");
      setError(firstError?.message ?? "Invalid URL");
      return;
    }

    setSubmitState("saving");

    startTransition(async () => {
      const response = await saveUvecIcalUrl(result.data);

      if (response.error) {
        setSubmitState("idle");
        setError(response.error);
        return;
      }

      setSubmitState("success");
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCurrentView("tappers");
    });
  }

  function handleSkip() {
    setCurrentView("tappers");
  }

  return (
    <div className="flex w-full flex-col gap-8 sm:gap-10">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome, {displayName}!
        </h1>
        <p className="text-muted-foreground mt-3 text-pretty text-sm leading-relaxed sm:text-base">
          Add your UVEC export link so UVEC and Classroom live in one board.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,290px)_minmax(0,1fr)] lg:items-stretch lg:gap-10">
        <Card className="border-primary/25 bg-card/95 flex h-full min-h-0 flex-col backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Setup progress</CardTitle>
            <CardDescription>Four steps, then the dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {stepStates.map(({ step, title, helper, state }, index) => (
                <StepChip
                  key={step}
                  step={step}
                  title={title}
                  helper={helper}
                  state={state}
                  delay={`${index * 70}ms`}
                />
              ))}
            </ol>

            <div className="border-border/70 bg-muted/35 mt-auto rounded-lg border p-3">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Next
              </p>
              <ul className="mt-2 space-y-1.5 text-xs leading-snug sm:text-sm">
                <li className="flex gap-2">
                  <Check className="text-success mt-0.5 size-4 shrink-0" />
                  Classroom syncs from the dashboard.
                </li>
                <li className="flex gap-2">
                  <Link2 className="text-primary mt-0.5 size-4 shrink-0" />
                  UVEC URL adds UVEC tasks.
                </li>
                <li className="flex gap-2">
                  <Sparkles className="text-info mt-0.5 size-4 shrink-0" />
                  Skip UVEC anytime — add it later in settings.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="flex min-h-0 flex-col gap-4">
          {currentView === "uvec" ? (
            <>
              <Card className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-reduce:animate-none">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-success/20 flex size-8 items-center justify-center rounded-full">
                      <Check className="text-success size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Google Classroom</CardTitle>
                      <CardDescription>
                        Signed in — first sync runs from the dashboard.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="border-primary/30 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-reduce:animate-none">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/20 flex size-8 items-center justify-center rounded-full">
                      <Calendar className="text-primary size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">UVEC</CardTitle>
                      <CardDescription>
                        Paste the calendar export URL from UVEC.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                  <button
                    type="button"
                    onClick={() => setShowGuide((prev) => !prev)}
                    className="text-primary hover:text-primary/80 flex items-center gap-2 text-sm font-medium"
                  >
                    <ChevronRight
                      className={cn(
                        "size-4 transition-transform motion-reduce:transition-none",
                        showGuide && "rotate-90",
                      )}
                    />
                    {showGuide ? "Hide" : "Show"} steps
                  </button>

                  {showGuide && (
                    <div className="bg-muted/40 grid gap-2 rounded-xl border p-3">
                      {ICAL_STEPS.map(({ step, title, description }, index) => {
                        const itemState: StepState =
                          step < guideFocusStep
                            ? "complete"
                            : step === guideFocusStep
                              ? "active"
                              : "pending";

                        return (
                          <div
                            key={step}
                            className={cn(
                              "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-1 rounded-lg border p-2.5 transition-all motion-safe:duration-250 motion-reduce:animate-none",
                              itemState === "complete" &&
                                "border-success/35 bg-success/10",
                              itemState === "active" &&
                                "border-primary/40 bg-primary/10",
                              itemState === "pending" && "border-border bg-card/70",
                            )}
                            style={{ animationDelay: `${index * 60}ms` }}
                          >
                            <div className="flex gap-3">
                              <div
                                className={cn(
                                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                                  itemState === "complete" &&
                                    "border-success bg-success text-success-foreground",
                                  itemState === "active" &&
                                    "border-primary bg-primary text-primary-foreground",
                                  itemState === "pending" &&
                                    "border-input bg-background text-muted-foreground",
                                )}
                                aria-hidden="true"
                              >
                                {itemState === "complete" ? (
                                  <Check className="size-3.5" />
                                ) : (
                                  step
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{title}</p>
                                <p className="text-muted-foreground text-xs leading-snug sm:text-sm">
                                  {description}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {submitState === "saving" && (
                    <StatusBanner
                      tone="info"
                      title="Saving…"
                      description="Storing your link and opening the dashboard."
                    />
                  )}
                  {submitState === "success" && (
                    <StatusBanner
                      tone="success"
                      title="Connected"
                      description="Heading to your dashboard."
                    />
                  )}
                  {error && (
                    <StatusBanner
                      tone="error"
                      title="Could not save this URL"
                      description={error}
                    />
                  )}

                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div
                      className={cn(
                        "rounded-xl border p-3 transition-colors motion-reduce:transition-none",
                        isInputFocused
                          ? "border-primary/45 bg-primary/5"
                          : "border-border bg-background",
                      )}
                    >
                      <label
                        htmlFor="uvec-url"
                        className="mb-1.5 block text-sm font-medium"
                      >
                        UVEC calendar export URL
                      </label>
                      <input
                        id="uvec-url"
                        type="url"
                        value={url}
                        onChange={(e) => {
                          setUrl(e.target.value);
                          setError(null);
                          if (submitState === "success") {
                            setSubmitState("idle");
                          }
                        }}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        placeholder="https://your-school.edu/.../export_execute.php?..."
                        className="border-input bg-background placeholder:text-muted-foreground focus:border-ring focus:ring-ring w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:opacity-50"
                        disabled={isPending}
                        autoComplete="off"
                      />
                      <p
                        className={cn(
                          "mt-1.5 text-xs",
                          isUrlValid ? "text-success" : "text-muted-foreground",
                        )}
                      >
                        {getUrlHelperText(trimmedUrl, isUrlValid)}
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={isPending || !trimmedUrl}
                      size="lg"
                      className="shadow-primary/20 h-11 font-semibold shadow-sm transition-all motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md motion-reduce:transform-none"
                    >
                      {isPending || submitState === "saving" ? (
                        <>
                          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                          Connecting UVEC...
                        </>
                      ) : submitState === "success" ? (
                        <>
                          <Check className="size-4" />
                          UVEC connected
                        </>
                      ) : (
                        "Connect UVEC"
                      )}
                    </Button>
                    <p className="text-muted-foreground text-xs">
                      Saved only to your profile.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-primary/30 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-reduce:animate-none">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 flex size-8 items-center justify-center rounded-full">
                    <Users2 className="text-primary size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Link with classmates (Optional)
                    </CardTitle>
                    <CardDescription>
                      Tappers lets you link with classmates so you can share
                      verbally-assigned tasks with each other. You can always do
                      this later from the Tappers page.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-4">
                {generatedCode ? (
                  <div className="space-y-3">
                    <StatusBanner
                      tone="success"
                      title="Invite code generated"
                      description="Share this code with your classmates to link accounts."
                    />
                    <div className="flex items-center gap-3 rounded-xl border p-3">
                      <p className="font-mono text-xl font-semibold tracking-wider">
                        {generatedCode}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(generatedCode);
                          } catch {
                            // ignore
                          }
                        }}
                        aria-label="Copy invite code"
                      >
                        <Copy className="size-4" />
                        Copy
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    disabled={generateCodePending}
                    onClick={() => {
                      startGenerateCodeTransition(async () => {
                        const result = await createInvite();
                        if (result.success) {
                          setGeneratedCode(result.code);
                        }
                      });
                    }}
                  >
                    {generateCodePending ? (
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    ) : null}
                    Generate my first invite code
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        {currentView === "uvec" ? (
          <button
            type="button"
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            disabled={isPending}
          >
            Skip UVEC for now
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {generatedCode ? "Continue to dashboard" : "Skip for now"}
          </button>
        )}
      </div>

      <p className="text-muted-foreground mx-auto max-w-2xl text-center text-xs text-pretty leading-relaxed sm:text-sm">
        TapO(1) currently only works online.
      </p>
    </div>
  );
}
