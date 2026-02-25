// Supabase Edge Function: uvec-proxy
// Secured CORS proxy for UVEC (Moodle) iCal URLs

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN =
  Deno.env.get("ALLOWED_ORIGIN") ?? "http://localhost:3000";
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

/**
 * Validate that the target URL is a legitimate Moodle/UVEC calendar export URL.
 * Rejects private IPs, non-HTTPS, and non-educational hostnames.
 */
function isAllowedUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);

    // Must be HTTPS
    if (parsed.protocol !== "https:") return false;

    // Reject common private/internal hostnames
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname.startsWith("192.168.") ||
      hostname === "metadata.google.internal" ||
      hostname.endsWith(".internal")
    ) {
      return false;
    }

    // Must contain a Moodle calendar export path indicator
    if (
      !parsed.pathname.includes("calendar/export") &&
      !parsed.pathname.includes("export_execute")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  // Verify the user is authenticated
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing authorization" }, 401);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
  } catch {
    return jsonResponse({ error: "Authentication failed" }, 401);
  }

  const url = new URL(req.url);
  const target = url.searchParams.get("icalUrl");

  if (!target) {
    return jsonResponse({ error: "Missing icalUrl parameter" }, 400);
  }

  // SSRF protection: validate target URL
  if (!isAllowedUrl(target)) {
    return jsonResponse({ error: "Invalid or disallowed iCal URL" }, 400);
  }

  try {
    const resp = await fetch(target);
    if (!resp.ok) {
      return jsonResponse({ error: `Failed to fetch: ${resp.status}` }, 502);
    }

    // Enforce size limit
    const contentLength = resp.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      return jsonResponse({ error: "Response too large" }, 413);
    }

    const ics = await resp.text();
    if (ics.length > MAX_RESPONSE_SIZE) {
      return jsonResponse({ error: "Response too large" }, 413);
    }

    return new Response(ics, {
      status: 200,
      headers: { ...corsHeaders(), "Content-Type": "text/calendar" },
    });
  } catch {
    return jsonResponse({ error: "Failed to fetch iCal data" }, 502);
  }
});
