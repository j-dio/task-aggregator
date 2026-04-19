/**
 * Supabase Edge Function: notify-shared-task
 *
 * Called by the createCustomTask server action (fire-and-forget) whenever a
 * custom task is shared with one or more tappers. Sends a Web Push notification
 * to each recipient whose push subscription is active and whose
 * tapper_notifications_enabled flag is true.
 *
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_SUBJECT
 *
 * Deploy with:
 *   npx supabase functions deploy notify-shared-task --no-verify-jwt
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  sendWebPush,
  type PushSubscription,
  type SendPushResult,
} from "../send-due-reminders/web-push.ts";

interface RequestBody {
  taskId: string;
  recipientIds: string[];
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-client-info, apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidPublicKey = Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const vapidSubject =
    Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@task-aggregator.app";

  if (!serviceRoleKey || !supabaseUrl || !vapidPrivateKey || !vapidPublicKey) {
    return new Response(
      JSON.stringify({ error: "Missing required environment variables" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Caller must present the service role key — this function is internal-only.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { taskId, recipientIds } = body;
  if (!taskId || !Array.isArray(recipientIds) || recipientIds.length === 0) {
    return new Response(
      JSON.stringify({ error: "taskId and recipientIds are required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Fetch the task and the owner's display_name in one query.
  const { data: taskData } = await supabase
    .from("tasks")
    .select(
      `
      id,
      title,
      profiles!tasks_user_id_fkey ( display_name )
    `,
    )
    .eq("id", taskId)
    .single();

  if (!taskData) {
    return new Response(JSON.stringify({ error: "Task not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ownerDisplayName =
    (taskData.profiles as { display_name?: string } | null)?.display_name ??
    "Someone";

  let sent = 0;
  let failed = 0;
  let cleaned = 0;
  const notificationLogs: { user_id: string; task_id: string; type: string }[] =
    [];
  const staleSubIds: string[] = [];

  for (const recipientId of recipientIds) {
    // 1. Respect the per-user tapper notification preference.
    const { data: profile } = await supabase
      .from("profiles")
      .select("tapper_notifications_enabled")
      .eq("id", recipientId)
      .single();

    if (!profile?.tapper_notifications_enabled) continue;

    // 2. Get the shared_task id for the dedup tag.
    const { data: sharedTask } = await supabase
      .from("shared_tasks")
      .select("id")
      .eq("task_id", taskId)
      .eq("recipient_id", recipientId)
      .limit(1)
      .maybeSingle();

    const sharedTaskId = sharedTask?.id ?? taskId;

    // 3. Fetch the recipient's push subscriptions.
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", recipientId);

    if (!subscriptions || subscriptions.length === 0) continue;

    const payload = JSON.stringify({
      title: `${ownerDisplayName} shared a task`,
      body: String(taskData.title),
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: `tapper-share-${sharedTaskId}`,
      url: "/dashboard/tappers",
      timestamp: Date.now(),
    });

    let recipientNotified = false;

    for (const sub of subscriptions as SubscriptionRow[]) {
      const pushSub: PushSubscription = {
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
      };

      let result: SendPushResult;
      try {
        result = await sendWebPush(
          pushSub,
          payload,
          vapidPrivateKey,
          vapidPublicKey,
          vapidSubject,
        );
      } catch {
        failed++;
        continue;
      }

      if (result.success) {
        recipientNotified = true;
        sent++;
      } else if (result.gone) {
        staleSubIds.push(sub.id);
        cleaned++;
      } else {
        failed++;
      }
    }

    if (recipientNotified) {
      notificationLogs.push({
        user_id: recipientId,
        task_id: taskId,
        type: "tapper_share",
      });
    }
  }

  // Log sent notifications — dedup on (user_id, task_id, type) prevents double-logging.
  if (notificationLogs.length > 0) {
    await supabase.from("notification_log").upsert(notificationLogs, {
      onConflict: "user_id,task_id,type",
      ignoreDuplicates: true,
    });
  }

  // Remove stale subscriptions (410 Gone / 404 Not Found).
  if (staleSubIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleSubIds);
  }

  return new Response(JSON.stringify({ sent, failed, cleaned }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
