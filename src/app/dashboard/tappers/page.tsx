"use client";

import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyInvite } from "@/lib/actions/tappers";
import { useTappers } from "@/hooks/use-tappers";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteCodeCard } from "@/components/tappers/invite-code-card";
import { AcceptInviteForm } from "@/components/tappers/accept-invite-form";
import { TappersList } from "@/components/tappers/tappers-list";
import { GenerateInviteButton } from "@/components/tappers/generate-invite-button";

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

export default function TappersPage() {
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
    <div className="mx-auto max-w-2xl space-y-10 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tappers</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Invite a classmate to link accounts. Shared task feeds come next.
        </p>
      </div>

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
    </div>
  );
}
