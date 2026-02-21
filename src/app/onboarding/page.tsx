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
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-8 dark:bg-zinc-950">
      <OnboardingForm displayName={displayName} />
    </div>
  );
}
