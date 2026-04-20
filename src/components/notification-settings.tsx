"use client";

import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2, AlertTriangle, Info } from "lucide-react";

/**
 * Notification settings content — renders inline without a Card wrapper.
 * Intended to be placed inside a settings section.
 */
export function NotificationSettings() {
  const {
    isSupported,
    isBraveBrowser,
    isFirefoxBrowser,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  return (
    <div className="space-y-3">
      {isBraveBrowser && (
        <div className="bg-muted/50 flex items-start gap-2 rounded-md border border-amber-500/30 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
          <div>
            <p className="font-medium">Brave and Web Push</p>
            <p className="text-muted-foreground">
              Brave can allow notification permission for this site but still block
              the push service used for reminders. For reliable Web Push, use{" "}
              <span className="text-foreground font-medium">Google Chrome</span> or{" "}
              <span className="text-foreground font-medium">Microsoft Edge</span>.
              You can also try lowering Shields for this site (not guaranteed).
            </p>
          </div>
        </div>
      )}

      {isFirefoxBrowser && (
        <div className="bg-muted/50 flex items-start gap-2 rounded-md p-3 text-sm">
          <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Firefox and installing this app</p>
            <p className="text-muted-foreground">
              Firefox has limited support for installing web apps (PWA) compared to
              Chrome, Edge, or Safari. You can still use this site in the browser;
              shortcuts and install prompts may vary by platform.
            </p>
          </div>
        </div>
      )}

      {!isSupported ? (
        <div className="bg-muted/50 flex items-start gap-2 rounded-md p-3 text-sm">
          <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Not supported</p>
            <p className="text-muted-foreground">
              Push notifications are not supported in this browser. On iOS,
              please add this app to your Home Screen first.
            </p>
          </div>
        </div>
      ) : permission === "denied" ? (
        <div className="flex items-start gap-2 rounded-md bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Permission blocked</p>
            <p>
              Notifications have been blocked. Open your browser settings and
              allow notifications for this site.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={unsubscribe}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              <BellOff className="size-4" />
              Disable
            </Button>
          ) : (
            <Button size="sm" onClick={subscribe} disabled={isLoading}>
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              <Bell className="size-4" />
              Enable Notifications
            </Button>
          )}
          <span className="text-muted-foreground text-xs">
            {isSubscribed
              ? "You'll receive reminders for upcoming deadlines."
              : "Get reminders for tasks due within 24 hours."}
          </span>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-md p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
