"use client";

import { useState, useEffect, useCallback } from "react";
import { subscribePush, unsubscribePush } from "@/lib/actions/notifications";

type PushPermissionState = "default" | "granted" | "denied" | "unsupported";

/** Firefox (desktop or iOS); PWA install support is limited compared to Chromium / Safari. */
function readIsFirefox(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /\b(Firefox|FxiOS)\//.test(ua);
}

type NavigatorWithBrave = Navigator & {
  brave?: { isBrave?: () => Promise<boolean> };
  userAgentData?: { brands?: readonly { brand: string }[] };
};

/** Chromium client hints: Brave identifies itself here even when the UA looks like Chrome. */
function readBraveFromUserAgentBrands(): boolean {
  if (typeof navigator === "undefined") return false;
  const brands = (navigator as NavigatorWithBrave).userAgentData?.brands;
  return Boolean(brands?.some((b) => /brave/i.test(b.brand)));
}

async function readIsBraveBrowser(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  if (readBraveFromUserAgentBrands()) return true;
  const isBrave = (navigator as NavigatorWithBrave).brave?.isBrave;
  if (typeof isBrave !== "function") return false;
  try {
    return await isBrave();
  } catch {
    return false;
  }
}

const CHROME_EDGE_FRAGMENT = "Try Google Chrome or Microsoft Edge";

const BRAVE_WEB_PUSH_HINT =
  ` Brave often blocks Web Push (the push service step) even when notification permission is allowed — ${CHROME_EDGE_FRAGMENT} for reliable reminders.`;

/** When we cannot detect Brave but the browser reports a push infrastructure failure. */
const PUSH_SERVICE_GENERIC_HINT = ` ${CHROME_EDGE_FRAGMENT}, confirm the site uses HTTPS with an active service worker, or lower privacy/Shields if your browser blocks third-party push endpoints.`;

function isLikelyPushServiceRegistrationFailure(message: string): boolean {
  return /registration failed|push service not available|push service error/i.test(
    message,
  );
}

function appendPushSubscribeHint(
  message: string,
  options: { runningOnBrave: boolean },
): string {
  if (message.includes(CHROME_EDGE_FRAGMENT)) return message;
  if (options.runningOnBrave) {
    return `${message}${BRAVE_WEB_PUSH_HINT}`;
  }
  if (isLikelyPushServiceRegistrationFailure(message)) {
    return `${message}${PUSH_SERVICE_GENERIC_HINT}`;
  }
  return message;
}

interface UsePushNotificationsReturn {
  /** Whether push notifications are supported in this browser. */
  isSupported: boolean;
  /** Brave often blocks Web Push silently; suggest another browser for reliability. */
  isBraveBrowser: boolean;
  /** Firefox has limited / inconsistent PWA “install to home screen” support across platforms. */
  isFirefoxBrowser: boolean;
  /** Current browser notification permission state. */
  permission: PushPermissionState;
  /** Whether the user is currently subscribed to push. */
  isSubscribed: boolean;
  /** Whether a subscribe/unsubscribe operation is in progress. */
  isLoading: boolean;
  /** Error message from the last operation, if any. */
  error: string | null;
  /** Subscribe to push notifications (requests permission if needed). */
  subscribe: () => Promise<void>;
  /** Unsubscribe from push notifications. */
  unsubscribe: () => Promise<void>;
}

/**
 * Convert a base64url string to a Uint8Array (required for applicationServerKey).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Resolves `navigator.serviceWorker.ready` with a timeout.
 * Rejects if no SW activates within `ms` milliseconds.
 */
function swReady(ms = 10000): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Service worker timed out after 10s")),
        ms,
      ),
    ),
  ]);
}

/**
 * Hook to manage Web Push notification subscriptions.
 *
 * Handles permission requests, subscribe/unsubscribe via server actions,
 * and tracks subscription state.
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBraveBrowser, setIsBraveBrowser] = useState(
    () => typeof window !== "undefined" && readBraveFromUserAgentBrands(),
  );
  const [isFirefoxBrowser] = useState(() => readIsFirefox());

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  // Check current permission and subscription state on mount
  useEffect(() => {
    if (!isSupported) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission as PushPermissionState);

    // Check if already subscribed — skip silently if SW not registered (dev mode)
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        if (regs.length === 0) return null;
        return navigator.serviceWorker.ready.then((reg) =>
          reg.pushManager.getSubscription(),
        );
      })
      .then((subscription) => {
        setIsSubscribed(subscription !== null);
      })
      .catch(() => {
        // SW not ready — silent fallback
      });
  }, [isSupported]);

  useEffect(() => {
    if (readBraveFromUserAgentBrands()) {
      setIsBraveBrowser(true);
    }
    let cancelled = false;
    void readIsBraveBrowser().then((brave) => {
      if (!cancelled) setIsBraveBrowser((prev) => prev || brave);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError("Push notifications are not supported in this browser");
      return;
    }

    setIsLoading(true);
    setError(null);

    /** Fresh each attempt — avoids a race where UI still has `isBraveBrowser === false`. */
    let runningOnBrave = false;

    try {
      runningOnBrave =
        readBraveFromUserAgentBrands() || (await readIsBraveBrowser());
      if (runningOnBrave) {
        setIsBraveBrowser(true);
      }

      // Step 1: Check SW is registered before asking for permission
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length === 0) {
        setError(
          "Service worker is not active. Push notifications require a production build (npm run build && npm start).",
        );
        return;
      }

      // Step 2: Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);

      if (result !== "granted") {
        setError(
          "Notification permission denied. Please enable notifications in browser settings.",
        );
        return;
      }

      // Step 3: Validate VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setError(
          "Push notification configuration is missing (NEXT_PUBLIC_VAPID_PUBLIC_KEY not set)",
        );
        return;
      }

      // Step 4: Wait for SW to be ready
      const registration = await swReady(10000);

      // Step 5: Subscribe — Uint8Array.buffer needs explicit cast in strict mode
      // (new Uint8Array() always uses ArrayBuffer, never SharedArrayBuffer)
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Step 6: Validate subscription keys
      const subscriptionJson = subscription.toJSON();
      if (
        !subscriptionJson.endpoint ||
        !subscriptionJson.keys?.p256dh ||
        !subscriptionJson.keys?.auth
      ) {
        await subscription.unsubscribe();
        setError(
          appendPushSubscribeHint(
            "Failed to create push subscription — missing keys",
            { runningOnBrave },
          ),
        );
        return;
      }

      // Step 7: Save to server
      const serverResult = await subscribePush({
        endpoint: subscriptionJson.endpoint,
        keys: {
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth,
        },
      });

      if (!serverResult.success) {
        await subscription.unsubscribe();
        setError(
          appendPushSubscribeHint(
            serverResult.error ?? "Failed to save subscription",
            { runningOnBrave },
          ),
        );
        return;
      }

      setIsSubscribed(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to subscribe";
      setError(appendPushSubscribeHint(message, { runningOnBrave }));
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;

    setIsLoading(true);
    setError(null);

    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length === 0) {
        setIsSubscribed(false);
        return;
      }

      const registration = await swReady(10000);
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const { endpoint } = subscription;
        await subscription.unsubscribe();

        const serverResult = await unsubscribePush(endpoint);
        if (!serverResult.success) {
          setError(serverResult.error ?? "Failed to remove subscription");
        }
      }

      setIsSubscribed(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to unsubscribe";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    isBraveBrowser,
    isFirefoxBrowser,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}
