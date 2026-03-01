"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const views = [
  { href: "/dashboard", label: "Today" },
  { href: "/dashboard/week", label: "Week" },
];

export function ViewToggle() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <div className="bg-muted/40 inline-flex h-9 rounded-lg border p-1">
        {views.map((view) => {
          const isActive =
            view.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(view.href);

          return (
            <Link
              key={view.href}
              href={view.href}
              className={cn(
                "inline-flex min-w-20 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {view.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
