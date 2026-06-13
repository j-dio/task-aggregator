"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uvecIcalUrlSchema } from "@/lib/validations/auth";
import { assertSafePublicUrl, UnsafeUrlError } from "@/lib/security/url-guard";

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
 * Verifies the URL is a real calendar feed before saving.
 */
export async function saveUvecIcalUrl(uvecIcalUrl: string) {
  const validated = uvecIcalUrlSchema.safeParse(uvecIcalUrl);
  if (!validated.success) {
    return { error: "Invalid UVEC iCal URL" };
  }

  const url = validated.data;

  try {
    await assertSafePublicUrl(url);
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return { error: err.message };
    }
    return { error: "Could not validate this URL" };
  }

  let eventCount = 0;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "TaskAggregator/1.0", Accept: "text/calendar, */*" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      return {
        error: `We couldn't read a calendar at that link (server returned ${resp.status}).`,
      };
    }

    const text = await resp.text();

    if (!text.includes("BEGIN:VCALENDAR")) {
      return {
        error: "We couldn't read a calendar at that link — the URL doesn't point to a calendar feed.",
      };
    }

    eventCount = (text.match(/BEGIN:VEVENT/g) ?? []).length;
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { error: "We couldn't reach that URL — request timed out." };
    }
    return { error: "We couldn't read a calendar at that link." };
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
    .update({ uvec_ical_url: url })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true, eventCount };
}
