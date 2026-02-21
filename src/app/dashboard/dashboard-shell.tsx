"use client";

import { useTransition, type ReactNode } from "react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

interface DashboardShellProps {
  children: ReactNode;
  displayName: string;
  email: string;
  hasUvec: boolean;
}

export function DashboardShell({
  children,
  displayName,
  email,
  hasUvec,
}: DashboardShellProps) {
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
              <span className="text-sm font-bold text-zinc-50 dark:text-zinc-900">
                TA
              </span>
            </div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Task Aggregator
            </span>
          </div>

          <div className="flex items-center gap-4">
            {!hasUvec && (
              <a
                href="/onboarding"
                className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              >
                Connect UVEC
              </a>
            )}

            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {displayName}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {email}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={isPending}
              >
                {isPending ? "..." : "Sign Out"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
