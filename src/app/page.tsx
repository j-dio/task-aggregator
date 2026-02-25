import Link from "next/link";
import { BookOpen, Bell, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

const features: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: BookOpen,
    title: "Unified View",
    desc: "See tasks from UVEC and Google Classroom together",
  },
  {
    icon: Bell,
    title: "Never Miss Due Dates",
    desc: "Smart reminders before deadlines",
  },
  {
    icon: Smartphone,
    title: "Works Everywhere",
    desc: "Install as an app on any device",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <main className="flex max-w-lg flex-col items-center gap-8 text-center">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-primary">
          <span className="text-3xl font-bold text-primary-foreground">TA</span>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-bold tracking-tight">
            Task Aggregator
          </h1>
          <p className="text-lg text-muted-foreground">
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
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border bg-card p-4 text-left">
              <Icon className="size-5 text-primary" />
              <h3 className="mt-2 text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
