"use client";

import { useTransition } from "react";
import { signInWithGoogle } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Authentication was cancelled. Please try again.",
  auth_failed: "Authentication failed. Please try again.",
};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginCard({ error }: { error?: string }) {
  const [isPending, startTransition] = useTransition();

  const errorMessage = error ? (ERROR_MESSAGES[error] ?? error) : null;

  function handleSignIn() {
    startTransition(async () => {
      const result = await signInWithGoogle();

      if (result?.error) {
        // Server action handles redirect; error is displayed via URL params
      }
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 dark:bg-zinc-100">
          <span className="text-2xl font-bold text-zinc-50 dark:text-zinc-900">
            TA
          </span>
        </div>
        <CardTitle className="text-2xl font-bold">Task Aggregator</CardTitle>
        <CardDescription className="text-base">
          All your university tasks from UVEC and Google Classroom in one place.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {errorMessage}
          </div>
        )}

        <Button
          onClick={handleSignIn}
          disabled={isPending}
          size="lg"
          className="w-full gap-3"
          variant="outline"
        >
          <GoogleIcon className="h-5 w-5" />
          {isPending ? "Redirecting..." : "Sign in with Google"}
        </Button>

        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          We&apos;ll request access to your Google Classroom courses to
          aggregate your tasks. Your data stays private.
        </p>
      </CardContent>
    </Card>
  );
}
