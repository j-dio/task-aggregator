"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateTapperNotificationPref } from "@/lib/actions/tappers";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TapperNotificationToggle() {
  const { isSupported, isSubscribed } = usePushNotifications();
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!session) {
          setLoading(false);
          return;
        }
        return supabase
          .from("profiles")
          .select("tapper_notifications_enabled")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            setEnabled(data?.tapper_notifications_enabled ?? true);
            setLoading(false);
          });
      })
      .catch(() => setLoading(false));
  }, []);

  const handleToggle = useCallback(async () => {
    if (!isSubscribed || saving || loading) return;
    const newValue = !enabled;
    setEnabled(newValue);
    setSaving(true);
    const result = await updateTapperNotificationPref(newValue);
    if (!result.success) {
      setEnabled(!newValue);
      toast.error(result.error ?? "Failed to update preference");
    }
    setSaving(false);
  }, [enabled, isSubscribed, saving, loading]);

  if (!isSupported) return null;

  const isDisabled = !isSubscribed || saving || loading;
  const toggleOn = enabled && isSubscribed;

  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={toggleOn}
      disabled={isDisabled}
      onClick={handleToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed ${
        toggleOn ? "bg-primary" : "bg-input"
      }`}
    >
      <span className="sr-only">Toggle tapper share notifications</span>
      {saving || loading ? (
        <Loader2 className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
      ) : (
        <span
          className={`pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
            toggleOn ? "translate-x-5" : "translate-x-0"
          }`}
        />
      )}
    </button>
  );

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${
        isDisabled ? "opacity-60" : ""
      }`}
    >
      <div>
        <p className="text-sm font-semibold">Tapper shares</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Get notified when a classmate shares a new task with you
        </p>
      </div>

      {!isSubscribed ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{toggle}</span>
            </TooltipTrigger>
            <TooltipContent>Enable push notifications first</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        toggle
      )}
    </div>
  );
}
