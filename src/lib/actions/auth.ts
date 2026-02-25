"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uvecIcalUrlSchema } from "@/lib/validations/auth";

/**
 * Initiates Google OAuth sign-in via Supabase Auth.
 * Requests Google Classroom API scopes for task aggregation.
 */
export async function signInWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getBaseUrl()}/auth/callback`,
      scopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/classroom.courses.readonly",
        "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
        "https://www.googleapis.com/auth/classroom.announcements.readonly",
      ].join(" "),
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { error: "Failed to generate sign-in URL" };
}

/**
 * Signs the user out and redirects to the login page.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Saves the UVEC iCal URL to the user's profile during onboarding.
 */
export async function saveUvecIcalUrl(uvecIcalUrl: string) {
  // Server-side validation (client-side can be bypassed)
  const validated = uvecIcalUrlSchema.safeParse(uvecIcalUrl);
  if (!validated.success) {
    return { error: "Invalid UVEC iCal URL" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ uvec_ical_url: validated.data })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
