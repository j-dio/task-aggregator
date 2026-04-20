"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLogo } from "@/components/app-logo";
import {
  AlertCircle,
  Calendar,
  ChevronsUpDown,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  Users2,
} from "lucide-react";
import { useState, useTransition } from "react";
import { signOut } from "@/lib/actions/auth";
import { markTappersAnnouncementSeen } from "@/lib/actions/tappers";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ExportButton } from "@/components/export-button";
import { SyncButton } from "@/components/sync-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  displayName: string;
  email: string;
  hasUvec: boolean;
  seenTappersAnnouncement?: boolean;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/history", label: "History", icon: History },
  { href: "/dashboard/tappers", label: "Tappers", icon: Users2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function SidebarNav({
  displayName,
  email,
  hasUvec,
  seenTappersAnnouncement,
}: SidebarNavProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [hasSeenTappers, setHasSeenTappers] = useState(
    seenTappersAnnouncement ?? true,
  );

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
    });
  }

  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <AppLogo className="size-8 shrink-0" />
        <span className="text-sm font-bold tracking-[-0.02em]">TapO(1)</span>
      </div>

      <Separator />

      {/* Nav links */}
      <nav
        className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3"
        aria-label="Dashboard"
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          const isTappers = href === "/dashboard/tappers";
          const showNewBadge = isTappers && !hasSeenTappers;

          function handleTappersClick() {
            if (isTappers && !hasSeenTappers) {
              setHasSeenTappers(true);
              void markTappersAnnouncementSeen();
            }
          }

          return (
            <Link
              key={href}
              href={href}
              onClick={isTappers ? handleTappersClick : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "skeu-nav-active text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              />
              {label}
              {showNewBadge && (
                <Badge
                  variant="default"
                  className="ml-auto h-4 px-1.5 text-[9px] font-bold"
                >
                  NEW
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* UVEC status — pinned above profile */}
      {!hasUvec && (
        <div className="shrink-0 px-2.5 pb-2">
          <Link
            href="/onboarding"
            className="flex items-center gap-2 rounded-lg border border-dashed border-warning/40 bg-warning/5 px-3 py-2 text-xs font-medium text-warning/80 transition-colors hover:border-warning/60 hover:bg-warning/10 hover:text-warning"
          >
            <AlertCircle className="size-3.5 shrink-0" />
            Connect UVEC to sync tasks
          </Link>
        </div>
      )}

      <Separator />

      {/* User info + actions */}
      <div className="shrink-0 px-2.5 py-3">
        <div className="space-y-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="hover:bg-accent/50 focus-visible:ring-ring group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors outline-none focus-visible:ring-2"
                aria-label="Open account menu"
              >
                {/* Avatar */}
                <div className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold ring-1 ring-border/30 transition-shadow group-hover:ring-border/60">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold leading-tight">{displayName}</p>
                  <p className="text-muted-foreground truncate text-[11px] leading-tight">
                    {email}
                  </p>
                </div>
                <ChevronsUpDown className="text-muted-foreground/60 group-hover:text-muted-foreground size-3 shrink-0 transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuLabel className="pb-0">
                {displayName}
              </DropdownMenuLabel>
              <DropdownMenuLabel className="text-muted-foreground pt-0 text-xs font-normal">
                {email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleSignOut} disabled={isPending}>
                <LogOut className="size-4" />
                {isPending ? "Signing out..." : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex min-w-0 items-center gap-0.5 px-1">
            <ThemeToggle showLabel />
            <ExportButton showLabel />
            <SyncButton />
          </div>
        </div>
      </div>
    </div>
  );
}
