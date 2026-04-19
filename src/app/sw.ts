import { defaultCache } from "@serwist/next/worker";
import type {
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
} from "serwist";
import {
  Serwist,
  NetworkFirst,
  StaleWhileRevalidate,
  ExpirationPlugin,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/* ─── Additional runtime caching rules ─── */
const extraCaching: RuntimeCaching[] = [
  // Supabase REST / Auth API — NetworkFirst so offline reads come from cache
  {
    matcher: ({ url }) =>
      url.hostname.endsWith(".supabase.co") ||
      url.hostname.endsWith(".supabase.in"),
    handler: new NetworkFirst({
      cacheName: "supabase-api",
      networkTimeoutSeconds: 5,
      plugins: [
        new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 60 }),
      ],
    }),
  },
  // App shell HTML pages — NetworkFirst with cache fallback
  {
    matcher: ({ request, sameOrigin }) =>
      sameOrigin &&
      request.mode === "navigate" &&
      !request.url.includes("/api/"),
    handler: new NetworkFirst({
      cacheName: "app-shell",
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
      ],
    }),
  },
  // Same-origin API routes — NetworkFirst
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && url.pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: "api-routes",
      networkTimeoutSeconds: 5,
      plugins: [
        new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 60 }),
      ],
    }),
  },
  // Static assets (JS, CSS, images) — StaleWhileRevalidate
  {
    matcher: ({ request }) =>
      request.destination === "script" ||
      request.destination === "style" ||
      request.destination === "image",
    handler: new StaleWhileRevalidate({
      cacheName: "static-assets-swr",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 128,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...extraCaching, ...defaultCache],
});

serwist.addEventListeners();

/* ─── Push Notification Handling ─── */

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  timestamp?: number;
}

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { title: "Task Aggregator", body: event.data.text() };
  }

  const title = payload.title ?? "Task Aggregator";
  const options: NotificationOptions = {
    body: payload.body ?? "",
    icon: payload.icon ?? "/Logo_png_ver.png",
    badge: payload.badge ?? "/Logo_png_ver.png",
    tag: payload.tag ?? "task-reminder",
    timestamp: payload.timestamp ?? Date.now(),
    data: { url: payload.url ?? "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  // url is set in the push handler's data field — tapper-share notifications
  // pass "/dashboard/tappers" while due-date reminders pass "/dashboard".
  const targetUrl: string =
    (event.notification.data as { url?: string })?.url ?? "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus an existing window if one is open
        for (const client of windowClients) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        return self.clients.openWindow(targetUrl);
      }),
  );
});
