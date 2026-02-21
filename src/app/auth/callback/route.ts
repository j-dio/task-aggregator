import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Check if user has completed onboarding (has UVEC URL set)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("uvec_ical_url")
      .eq("id", user.id)
      .single();

    // If profile exists and has UVEC URL, go to dashboard
    if (profile?.uvec_ical_url) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // Otherwise, go to onboarding
  return NextResponse.redirect(`${origin}${next}`);
}
