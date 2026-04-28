// Supabase Edge Function: uvec-proxy
// Secured CORS proxy for UVEC (Moodle) iCal URLs

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type CorsHeaders,
  isIpAddressLiteral,
  isRedirectStatus,
  parseAllowedOrigins,
  resolveCorsHeaders,
  validateUvecUrl,
} from "./security.ts";

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB

const corsConfig = {
  allowedOrigins: parseAllowedOrigins(Deno.env.toObject()),
  allowMissingOrigin: true,
};

function getCorsHeaders(req: Request): CorsHeaders | null {
  return resolveCorsHeaders(req.headers.get("Origin"), corsConfig);
}

function jsonResponse(req: Request, body: object, status: number) {
  const corsHeaders = getCorsHeaders(req) ?? { Vary: "Origin" };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveHostAddresses(hostname: string): Promise<string[]> {
  const results = await Promise.allSettled([
    Deno.resolveDns(hostname, "A"),
    Deno.resolveDns(hostname, "AAAA"),
  ]);

  const addresses = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  if (addresses.length === 0) {
    throw new Error("No DNS records found");
  }

  return addresses;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (!corsHeaders) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json", Vary: "Origin" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify the user is authenticated
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(req, { error: "Missing authorization" }, 401);
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
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }
  } catch {
    return jsonResponse(req, { error: "Authentication failed" }, 401);
  }

  const url = new URL(req.url);
  const target = url.searchParams.get("icalUrl");

  if (!target) {
    return jsonResponse(req, { error: "Missing icalUrl parameter" }, 400);
  }

  const initialValidation = validateUvecUrl(target);
  if (!initialValidation.allowed || !initialValidation.hostname) {
    return jsonResponse(req, { error: "Invalid or disallowed iCal URL" }, 400);
  }

  let resolvedAddresses: string[];
  if (isIpAddressLiteral(initialValidation.hostname)) {
    resolvedAddresses = [];
  } else {
    try {
      resolvedAddresses = await resolveHostAddresses(
        initialValidation.hostname,
      );
    } catch {
      return jsonResponse(
        req,
        { error: "Unable to validate iCal hostname" },
        400,
      );
    }
  }

  // Resolve once before fetch to catch hostnames that point at private networks.
  // This reduces SSRF risk but cannot fully eliminate DNS rebinding because fetch
  // performs its own resolution after this check.
  if (!validateUvecUrl(target, { resolvedAddresses }).allowed) {
    return jsonResponse(req, { error: "Invalid or disallowed iCal URL" }, 400);
  }

  try {
    const resp = await fetch(target, {
      redirect: "manual",
      headers: {
        "User-Agent": "TaskAggregator/1.0",
        Accept: "text/calendar, text/plain, */*",
      },
    });

    if (isRedirectStatus(resp.status)) {
      return jsonResponse(
        req,
        {
          error: "UVEC redirected the iCal request",
          hint: "Please use the final HTTPS calendar export URL from UVEC.",
        },
        400,
      );
    }

    if (!resp.ok) {
      return jsonResponse(
        req,
        {
          error: `UVEC returned ${resp.status}`,
          hint: "Your iCal URL may have expired. Try re-exporting from UVEC.",
        },
        502,
      );
    }

    // Enforce size limit
    const contentLength = resp.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      return jsonResponse(req, { error: "Response too large" }, 413);
    }

    const ics = await resp.text();
    if (ics.length > MAX_RESPONSE_SIZE) {
      return jsonResponse(req, { error: "Response too large" }, 413);
    }

    if (!ics.includes("BEGIN:VCALENDAR")) {
      return jsonResponse(
        req,
        {
          error: "Response is not a valid iCal feed",
          hint: "The URL may have changed. Please re-export from UVEC.",
        },
        502,
      );
    }

    return new Response(ics, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(
      req,
      { error: `Failed to fetch from UVEC: ${message}` },
      502,
    );
  }
});
