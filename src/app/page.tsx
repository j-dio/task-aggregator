import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <main className="flex max-w-lg flex-col items-center gap-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-900 dark:bg-zinc-100">
          <span className="text-3xl font-bold text-zinc-50 dark:text-zinc-900">
            TA
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Task Aggregator
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            All your university tasks from UVEC and Google Classroom in one
            place. Never miss a deadline again.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login">Get Started</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: "📚",
              title: "Unified View",
              desc: "See tasks from UVEC and Google Classroom together",
            },
            {
              icon: "⏰",
              title: "Never Miss Due Dates",
              desc: "Smart reminders before deadlines",
            },
            {
              icon: "📱",
              title: "Works Everywhere",
              desc: "Install as an app on any device",
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="text-2xl">{icon}</span>
              <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {title}
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
