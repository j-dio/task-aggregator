"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMyInvite } from "@/lib/actions/tappers";
import { useTappers } from "@/hooks/use-tappers";
import { useSharedTasks } from "@/hooks/use-shared-tasks";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InviteCodeCard } from "@/components/tappers/invite-code-card";
import { AcceptInviteForm } from "@/components/tappers/accept-invite-form";
import { TappersList } from "@/components/tappers/tappers-list";
import { GenerateInviteButton } from "@/components/tappers/generate-invite-button";
import { SharedTasksFeed } from "@/components/tappers/shared-tasks-feed";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.08em]">
        {children}
      </span>
      <div className="flex-1 border-t" />
    </div>
  );
}

async function fetchMyInvite() {
  const result = await getMyInvite();
  if (!result.success) {
    throw new Error(result.error ?? "Failed to load invite");
  }
  return result.invite ?? null;
}

function TappersInviteQueryToasts() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) {
      return;
    }

    // Read the real URL here — not useSearchParams(). Without a Suspense
    // boundary, useSearchParams can be empty on first paint and never match
    // ?linked= / ?error= after a server redirect (dashboard page wraps
    // useSearchParams in Suspense for the same reason).
    const params = new URLSearchParams(window.location.search);
    const linked = params.get("linked");
    const error = params.get("error");

    const stripQuery = () => {
      queueMicrotask(() => router.replace("/dashboard/tappers"));
    };

    if (linked === "1") {
      handled.current = true;
      toast.success("Linked up! You're now connected.");
      stripQuery();
      return;
    }

    if (error === "self") {
      handled.current = true;
      toast.error("That's your own invite code.");
      stripQuery();
      return;
    }

    if (error === "invalid") {
      handled.current = true;
      toast.error("Invite code is invalid or expired.");
      stripQuery();
      return;
    }

    if (error === "unknown") {
      handled.current = true;
      toast.error("Something went wrong. Try again.");
      stripQuery();
    }
  }, [router]);

  return null;
}

export default function TappersPage() {
  const { unseenCount } = useSharedTasks();
  const { tappers, isLoading: tappersLoading, refetch } = useTappers();
  const {
    data: invite,
    isLoading: inviteLoading,
    refetch: refetchInvite,
  } = useQuery({
    queryKey: ["tapper-invite"],
    queryFn: fetchMyInvite,
    staleTime: 60_000,
  });

  const inviteReady = !inviteLoading;
  const hasInvite = invite != null;

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4 md:p-6">
      <TappersInviteQueryToasts />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tappers</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Invite a classmate to link accounts. Shared tasks live in the Shared
          Tasks tab.
        </p>
      </div>

      <Tabs defaultValue="tappers" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="tappers">Tappers</TabsTrigger>
          <TabsTrigger value="shared" className="gap-1.5">
            Shared Tasks
            {unseenCount > 0 && (
              <Badge
                variant="secondary"
                className="h-5 min-w-5 px-1 text-[10px] font-semibold tabular-nums"
              >
                {unseenCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tappers" className="mt-8 space-y-10">
          <section className="space-y-3">
            <SectionLabel>Your invite code</SectionLabel>
            {!inviteReady ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-[14px]" />
                <Skeleton className="mx-auto size-[200px] rounded-md" />
              </div>
            ) : hasInvite ? (
              <InviteCodeCard code={invite.code} expiresAt={invite.expiresAt} />
            ) : (
              <GenerateInviteButton
                onGenerated={() => {
                  void refetchInvite();
                }}
              />
            )}
          </section>

          <section className="space-y-3">
            <SectionLabel>Link with a classmate</SectionLabel>
            <AcceptInviteForm
              onSuccess={() => {
                void refetch();
              }}
            />
          </section>

          <section className="space-y-3">
            <SectionLabel>Your Tappers</SectionLabel>
            <p className="text-muted-foreground text-xs">
              Don&apos;t see someone who used your code? Refresh the page.
            </p>
            {tappersLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-[14px]" />
                <Skeleton className="h-16 w-full rounded-[14px]" />
              </div>
            ) : (
              <TappersList tappers={tappers} />
            )}
          </section>
        </TabsContent>

        <TabsContent value="shared" className="mt-8">
          <SharedTasksFeed />
        </TabsContent>
      </Tabs>
    </div>
  );
}
