"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CalendarRange, LogOut } from "lucide-react";
import { useTransition } from "react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SyncButton } from "@/components/sync-button";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  displayName: string;
  email: string;
  hasUvec: boolean;
}

const navItems = [
  { href: "/dashboard", label: "Today", icon: CalendarDays },
  { href: "/dashboard/week", label: "Week", icon: CalendarRange },
];

export function SidebarNav({ displayName, email, hasUvec }: SidebarNavProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
    });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-xs font-bold text-primary-foreground">TA</span>
        </div>
        <span className="text-sm font-semibold">Task Aggregator</span>
      </div>

      <Separator />

      {/* Nav links */}
      <nav className="flex-1 space-y-1 px-3 py-3" aria-label="Dashboard">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* UVEC status */}
      {!hasUvec && (
        <div className="px-3 pb-2">
          <Link
            href="/onboarding"
            className="block rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
          >
            Connect UVEC to sync tasks
          </Link>
        </div>
      )}

      <Separator />

      {/* User info + actions */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <div className="flex items-center gap-0.5">
            <SyncButton />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleSignOut}
              disabled={isPending}
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
