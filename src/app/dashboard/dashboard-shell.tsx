"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/sidebar-nav";
import { AppLogo } from "@/components/app-logo";
import { ExportButton } from "@/components/export-button";
import { ThemeToggle } from "@/components/theme-toggle";

interface DashboardShellProps {
  children: ReactNode;
  displayName: string;
  email: string;
  hasUvec: boolean;
  seenTappersAnnouncement?: boolean;
}

export function DashboardShell({
  children,
  displayName,
  email,
  hasUvec,
  seenTappersAnnouncement,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="skeu-bg flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="skeu-sidebar hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:overflow-hidden">
        <SidebarNav
          displayName={displayName}
          email={email}
          hasUvec={hasUvec}
          seenTappersAnnouncement={seenTappersAnnouncement}
        />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="skeu-sidebar w-60 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav
            displayName={displayName}
            email={email}
            hasUvec={hasUvec}
            seenTappersAnnouncement={seenTappersAnnouncement}
          />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-13 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-sm lg:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <AppLogo className="size-7 shrink-0" />
            <span className="text-[13px] font-bold tracking-[-0.02em]">TapO(1)</span>
          </div>
          <div className="ml-auto flex items-center gap-0.5">
            <ThemeToggle />
            <ExportButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-5 lg:px-8 lg:py-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
