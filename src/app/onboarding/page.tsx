import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata = {
  title: "Get Started",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if already onboarded
  const { data: profile } = await supabase
    .from("profiles")
    .select("uvec_ical_url, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.uvec_ical_url) {
    redirect("/dashboard");
  }

  const displayName =
    profile?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "there";

  return (
    <div className="bg-background relative flex min-h-dvh flex-col overflow-x-hidden px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,oklch(0.97_0.008_264/.9),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,oklch(0.2_0_0/.3),transparent_55%)]" />
        <div className="bg-primary/10 absolute -right-20 -bottom-20 size-72 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <OnboardingForm displayName={displayName} />
      </div>
    </div>
  );
}
