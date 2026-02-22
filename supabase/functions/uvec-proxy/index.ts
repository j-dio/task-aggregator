// Supabase Edge Function: uvec-proxy
// CORS proxy for UVEC (Moodle) iCal URL
// Phase 2: Task Aggregator

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  const url = new URL(req.url);
  const target = url.searchParams.get("icalUrl");

  if (!target) {
    return new Response(
      JSON.stringify({ error: "Missing icalUrl parameter" }),
      {
        status: 400,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      },
    );
  }

  try {
    const resp = await fetch(target);
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch: ${resp.status}` }),
        {
          status: resp.status,
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        },
      );
    }
    const ics = await resp.text();
    return new Response(ics, {
      status: 200,
      headers: { ...corsHeaders(), "Content-Type": "text/calendar" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Fetch error" }), {
      status: 502,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }
});
