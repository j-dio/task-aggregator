"use client";

import { useSyncExternalStore } from "react";
import { Toaster } from "sonner";

type Theme = "light" | "dark";

function getThemeFromDocument(): Theme {
  return document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

/**
 * Subscribe to `<html class="dark">` toggles. Matches the root layout blocking
 * script and ThemeToggle: both mutate `document.documentElement.classList`.
 * Initial `queueMicrotask` picks up the class set before React hydrated (no
 * synchronous setState in an effect).
 */
function subscribeToHtmlClass(onStoreChange: () => void) {
  queueMicrotask(onStoreChange);
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

export function ThemedToaster() {
  const theme = useSyncExternalStore<Theme>(
    subscribeToHtmlClass,
    getThemeFromDocument,
    () => "light",
  );

  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      closeButton
      visibleToasts={3}
    />
  );
}
