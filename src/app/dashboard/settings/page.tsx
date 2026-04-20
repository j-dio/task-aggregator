"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uvecIcalUrlSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  ChevronDown,
  Download,
  Bug,
  Lightbulb,
  Shield,
  ChevronRight,
} from "lucide-react";
import { NotificationSettings } from "@/components/notification-settings";
import { TapperNotificationToggle } from "@/components/tappers/tapper-notification-toggle";
import { usePwaInstall } from "@/components/add-to-homescreen-prompt";

const SUPPORT_EMAIL = "tapo1support@gmail.com";
const BUG_REPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("TapO(1) Bug Report")}&body=${encodeURIComponent(
  "Hi TapO(1) developer,\n\nI found a bug:\n- What happened:\n- What I expected:\n- Device/browser:\n- Steps to reproduce:\n\nThank you!",
)}`;
const FEATURE_REQUEST_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("TapO(1) Feature Suggestion")}&body=${encodeURIComponent(
  "Hi TapO(1) developer,\n\nI would like to suggest this feature:\n- Feature idea:\n- Why it helps:\n- Optional example workflow:\n\nThank you!",
)}`;

type SettingsProfileHydrationResult =
  | { kind: "no_session" }
  | {
      kind: "profile";
      uvecIcalUrl: string | null;
      hasGoogleRefreshToken: boolean;
    };

function SettingsProfileHydration({
  onHydrated,
}: {
  onHydrated: (result: SettingsProfileHydrationResult) => void;
}) {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!session) {
          onHydrated({ kind: "no_session" });
          return;
        }

        return supabase
          .from("profiles")
          .select("uvec_ical_url, google_refresh_token")
          .eq("id", session.user.id)
          .single()
          .then(({ data: profile, error }) => {
            if (error) {
              onHydrated({
                kind: "profile",
                uvecIcalUrl: null,
                hasGoogleRefreshToken: false,
              });
              return;
            }
            onHydrated({
              kind: "profile",
              uvecIcalUrl: profile?.uvec_ical_url ?? null,
              hasGoogleRefreshToken: !!profile?.google_refresh_token,
            });
          });
      })
      .catch(() => {
        onHydrated({ kind: "no_session" });
      });
  }, [onHydrated]);

  return null;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.08em]">
        {children}
      </span>
      <div className="flex-1 border-t" />
    </div>
  );
}

export default function SettingsPage() {
  const {
    canInstall,
    install,
    isIos,
    isStandalone,
    wasDismissed,
    resetDismissed,
  } = usePwaInstall();
  const [uvecUrl, setUvecUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [hasGoogleRefreshToken, setHasGoogleRefreshToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [saveMessage, setSaveMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [reconnectBannerDismissed, setReconnectBannerDismissed] =
    useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

  const googleReconnectFailed =
    searchParams.get("google_reconnect") === "failed";
  const reconnectFromUrl =
    googleReconnectFailed && !reconnectBannerDismissed
      ? ({
          ok: false as const,
          text: "Google reconnect did not complete — the refresh token could not be saved. Please try again.",
        } as const)
      : null;
  const displaySaveMessage = saveMessage ?? reconnectFromUrl;

  const onProfileHydrated = useCallback(
    (result: SettingsProfileHydrationResult) => {
      if (result.kind === "no_session") {
        setLoading(false);
        return;
      }
      setUvecUrl(result.uvecIcalUrl ?? "");
      setSavedUrl(result.uvecIcalUrl ?? null);
      setHasGoogleRefreshToken(result.hasGoogleRefreshToken);
      setLoading(false);
    },
    [],
  );

  async function handleSaveUvec() {
    setSaving(true);
    setSaveMessage(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setSaveMessage({ ok: false, text: "Not authenticated." });
      setSaving(false);
      return;
    }

    const trimmed = uvecUrl.trim();

    if (trimmed) {
      const validation = uvecIcalUrlSchema.safeParse(trimmed);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        setSaveMessage({
          ok: false,
          text: firstIssue?.message ?? "Invalid URL",
        });
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ uvec_ical_url: trimmed || null })
      .eq("id", session.user.id);

    if (error) {
      setSaveMessage({ ok: false, text: `Failed to save: ${error.message}` });
    } else {
      setSavedUrl(trimmed || null);
      setSaveMessage({ ok: true, text: "UVEC URL saved!" });
    }
    setSaving(false);
  }

  async function handleTestUvec() {
    setTesting(true);
    setTestResult(null);

    const { data: refreshData, error: refreshError } =
      await supabase.auth.refreshSession();
    const session = refreshData?.session;
    if (refreshError || !session) {
      setTestResult({
        ok: false,
        message: "Not authenticated. Please sign out and sign back in.",
      });
      setTesting(false);
      return;
    }

    const trimmed = uvecUrl.trim();
    if (!trimmed) {
      setTestResult({ ok: false, message: "No URL to test." });
      setTesting(false);
      return;
    }

    try {
      const proxyUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/uvec-proxy?icalUrl=${encodeURIComponent(trimmed)}`;
      const resp = await fetch(proxyUrl, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        let detail = body;
        try {
          const parsed = JSON.parse(body);
          detail = parsed.error ?? parsed.message ?? body;
          if (parsed.hint) detail += ` ${parsed.hint}`;
        } catch {
          // body isn't JSON, use as-is
        }
        setTestResult({
          ok: false,
          message: `Proxy returned ${resp.status}. ${detail}`,
        });
      } else {
        const text = await resp.text();
        if (text.includes("BEGIN:VCALENDAR")) {
          const eventCount = (text.match(/BEGIN:VEVENT/g) || []).length;
          setTestResult({
            ok: true,
            message: `Connected! Found ${eventCount} calendar events.`,
          });
        } else {
          setTestResult({
            ok: false,
            message: "Response is not a valid iCal feed.",
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      if (message.includes("NetworkError") || message.includes("fetch")) {
        setTestResult({
          ok: false,
          message:
            "Cannot reach the sync proxy. Make sure the Edge Function is deployed: run `supabase functions deploy uvec-proxy` in your terminal.",
        });
      } else {
        setTestResult({ ok: false, message });
      }
    }

    setTesting(false);
  }

  async function handleReconnectGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: [
          "openid",
          "email",
          "profile",
          "https://www.googleapis.com/auth/classroom.courses.readonly",
          "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
          "https://www.googleapis.com/auth/classroom.student-submissions.me.readonly",
        ].join(" "),
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setSaveMessage({
        ok: false,
        text: `Google reconnect failed: ${error.message}`,
      });
    }
  }

  return (
    <>
      <SettingsProfileHydration onHydrated={onProfileHydrated} />
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : (
        <div className="mx-auto max-w-2xl space-y-10 p-4 md:p-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground text-sm">
              Manage your data sources and sync configuration.
            </p>
          </div>

          {/* ── Data Sources ───────────────────────────────────────── */}
          <section className="space-y-6">
            <SectionLabel>Data Sources</SectionLabel>

            {/* UVEC */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold">UVEC (Moodle Calendar)</p>
                    {savedUrl ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : (
                      <XCircle className="text-muted-foreground size-4" />
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Paste your UVEC iCal export URL to sync Moodle calendar events.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 dark:bg-muted/50 p-4 space-y-3">
                <Input
                  placeholder="https://uvec.upcebu.edu.ph/calendar/export_execute.php?..."
                  value={uvecUrl}
                  onChange={(e) => {
                    setUvecUrl(e.target.value);
                    setTestResult(null);
                    setSaveMessage(null);
                    setReconnectBannerDismissed(true);
                  }}
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveUvec} disabled={saving} size="sm">
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    Save URL
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTestUvec}
                    disabled={testing || !uvecUrl.trim()}
                    size="sm"
                  >
                    {testing && <Loader2 className="size-4 animate-spin" />}
                    Test Connection
                  </Button>
                </div>
              </div>

              {displaySaveMessage && (
                <p
                  className={`text-sm ${displaySaveMessage.ok ? "text-success" : "text-destructive"}`}
                >
                  {displaySaveMessage.text}
                </p>
              )}

              {testResult && (
                <div
                  className={`flex items-start gap-2 rounded-md p-3 text-sm ${
                    testResult.ok
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowHelp((h) => !h)}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
              >
                <ChevronDown
                  className={`size-4 transition-transform ${showHelp ? "rotate-180" : ""}`}
                />
                How to get your UVEC iCal URL
              </button>
              {showHelp && (
                <ol className="text-muted-foreground list-inside list-decimal space-y-1 pl-1 text-sm">
                  <li>
                    Go to{" "}
                    <a
                      href="https://uvec.upcebu.edu.ph/calendar/export.php"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      UVEC Calendar Export
                    </a>
                  </li>
                  <li>
                    Select <strong>All events</strong> and{" "}
                    <strong>This month</strong> (or your preferred range)
                  </li>
                  <li>Click <strong>Export</strong></li>
                  <li>
                    Copy the URL from the download link (right-click → Copy Link)
                  </li>
                  <li>Paste the full URL above</li>
                </ol>
              )}
            </div>

            <div className="border-t" />

            {/* Google Classroom */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold">Google Classroom</p>
                  {hasGoogleRefreshToken ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : (
                    <XCircle className="text-muted-foreground size-4" />
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {hasGoogleRefreshToken
                    ? "Connected. Tasks sync automatically."
                    : "Not connected. Authorize to sync assignments."}
                </p>
                {hasGoogleRefreshToken && (
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Reconnect if sync stops working.
                  </p>
                )}
              </div>
              <Button
                variant={hasGoogleRefreshToken ? "outline" : "default"}
                onClick={handleReconnectGoogle}
                size="sm"
                className="shrink-0"
              >
                <ExternalLink className="size-4" />
                {hasGoogleRefreshToken ? "Reconnect" : "Connect"}
              </Button>
            </div>
          </section>

          {/* ── Notifications ──────────────────────────────────────── */}
          <section className="space-y-4">
            <SectionLabel>Notifications</SectionLabel>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold">Push Notifications</p>
              </div>
              <p className="text-muted-foreground text-xs">
                Get notified when tasks are due soon. Reminders are sent for
                tasks due within 24 hours.
              </p>
            </div>

            <NotificationSettings />
            <TapperNotificationToggle />
          </section>

          {/* ── App ────────────────────────────────────────────────── */}
          {!isStandalone && (
            <section className="space-y-4">
              <SectionLabel>App</SectionLabel>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">Install App</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Add TapO(1) to your home screen for faster launch and
                    app-like navigation.
                  </p>
                </div>

                {isIos ? (
                  <p className="text-muted-foreground text-sm">
                    On iPhone/iPad: tap the <strong>Share</strong> button in
                    Safari, then <strong>Add to Home Screen</strong>.
                  </p>
                ) : canInstall ? (
                  <Button size="sm" onClick={install}>
                    <Download className="size-4" />
                    Install App
                  </Button>
                ) : wasDismissed ? (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">
                      You dismissed the install prompt. Click below to enable it
                      again.
                    </p>
                    <Button size="sm" variant="outline" onClick={resetDismissed}>
                      Re-enable install prompt
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Install option is not available in this browser, or the app
                    is already installed.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ── Privacy ────────────────────────────────────────────── */}
          <section className="space-y-3">
            <SectionLabel>Legal</SectionLabel>
            <Link
              href="/privacy"
              className="group border-border bg-muted/30 hover:bg-muted/50 dark:bg-muted/50 dark:hover:bg-muted/70 flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
                <Shield className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-semibold">Privacy Policy</p>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  What we collect, how we use it, and your rights.
                </p>
              </div>
              <ChevronRight
                className="text-muted-foreground group-hover:text-foreground size-5 shrink-0 transition-colors"
                aria-hidden
              />
            </Link>
          </section>

          {/* ── Support footer ─────────────────────────────────────── */}
          <div className="border-t pt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-muted-foreground text-xs">{SUPPORT_EMAIL}</p>
            <div className="flex items-center gap-4">
              <a
                href={BUG_REPORT_MAILTO}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
              >
                <Bug className="size-3.5" />
                Report a bug
              </a>
              <a
                href={FEATURE_REQUEST_MAILTO}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
              >
                <Lightbulb className="size-3.5" />
                Suggest a feature
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
