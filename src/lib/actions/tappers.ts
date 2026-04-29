"use server";

import { createClient } from "@/lib/supabase/server";
import {
  acceptInviteSchema,
  adoptSharedTaskSchema,
  markSeenSchema,
  unlinkTapperSchema,
} from "@/lib/validations/tappers";
import type {
  SharedTaskCard,
  TapperInvite,
  TapperSummary,
} from "@/types/tappers";
import { generateInviteCode } from "@/lib/invite-code";

export type CreateInviteResult =
  | { success: true; code: string; expiresAt: string }
  | { success: false; error: string };

export type AcceptInviteResult =
  | { success: true; linkId: string }
  | { success: false; error: string };

export type ListTappersResult =
  | { success: true; data: TapperSummary[] }
  | { success: false; error: string };

export type UnlinkTapperResult =
  | { success: true }
  | { success: false; error: string };

export type GetMyInviteResult =
  | { success: true; invite?: TapperInvite }
  | { success: false; error: string };

export type ListSharedTasksResult =
  | { success: true; data: SharedTaskCard[] }
  | { success: false; error: string };

export type AdoptSharedTaskResult =
  | { success: true; taskId: string }
  | { success: false; error: string };

export type SimpleActionResult =
  | { success: true }
  | { success: false; error: string };

function mapFeedRow(row: Record<string, unknown>): SharedTaskCard {
  return {
    sharedTaskId: String(row.shared_task_id),
    taskId: String(row.task_id),
    ownerId: String(row.owner_id),
    ownerDisplayName: String(row.owner_display_name ?? ""),
    recipientId: String(row.recipient_id),
    addedTaskId: row.added_task_id ? String(row.added_task_id) : null,
    seenAt: row.seen_at ? String(row.seen_at) : null,
    createdAt: String(row.created_at),
    title: String(row.title ?? ""),
    description: row.description != null ? String(row.description) : null,
    dueDate: row.due_date ? String(row.due_date) : null,
    type: String(row.type ?? "assignment"),
    courseName: row.course_name != null ? String(row.course_name) : null,
    courseColor: row.course_color != null ? String(row.course_color) : null,
  };
}

/**
 * adoptSharedTask: origin task fields are loaded via SECURITY DEFINER RPC
 * `get_shared_task_detail` (see 009b_tappers_addons.sql) so we do not need a
 * service-role client to read another user's task under RLS.
 */
export async function createInvite(): Promise<CreateInviteResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const code = generateInviteCode(12);
      const { data, error } = await supabase
        .from("tapper_invites")
        .insert({
          code,
          inviter_id: user.id,
        })
        .select("code, expires_at")
        .single();

      if (!error && data) {
        return {
          success: true,
          code: data.code,
          expiresAt: data.expires_at,
        };
      }

      if (error?.code !== "23505") {
        return { success: false, error: error?.message ?? "Failed to create invite" };
      }
    }

    return { success: false, error: "Could not generate a unique invite code" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return { success: false, error: message };
  }
}

export async function acceptInvite(code: string): Promise<AcceptInviteResult> {
  const parsed = acceptInviteSchema.safeParse({ code });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase.rpc("accept_tapper_invite", {
      invite_code: parsed.data.code.toUpperCase(),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data == null) {
      return { success: false, error: "Invite could not be accepted" };
    }

    return { success: true, linkId: String(data) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return { success: false, error: message };
  }
}

export async function listTappers(): Promise<ListTappersResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase.rpc("get_my_tappers");

    if (error) {
      return { success: false, error: error.message };
    }

    const rows = (data ?? []) as Array<{
      user_id: string;
      display_name: string | null;
      linked_at: string;
    }>;

    const dataOut: TapperSummary[] = rows.map((row) => ({
      userId: row.user_id,
      displayName: row.display_name ?? "",
      linkedAt: row.linked_at,
    }));

    return { success: true, data: dataOut };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return { success: false, error: message };
  }
}

export async function unlinkTapper(userId: string): Promise<UnlinkTapperResult> {
  const parsed = unlinkTapperSchema.safeParse({ userId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const sorted = [parsed.data.userId, user.id].sort();
    const minId = sorted[0]!;
    const maxId = sorted[1]!;

    const { error } = await supabase
      .from("tapper_links")
      .delete()
      .eq("user_a_id", minId)
      .eq("user_b_id", maxId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return { success: false, error: message };
  }
}

export async function getMyInvite(): Promise<GetMyInviteResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("tapper_invites")
      .select("id, code, expires_at, used_count, max_uses, created_at")
      .eq("inviter_id", user.id)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: true };
    }

    const invite: TapperInvite = {
      id: data.id,
      code: data.code,
      expiresAt: data.expires_at,
      usedCount: data.used_count,
      maxUses: data.max_uses,
      createdAt: data.created_at,
    };

    return { success: true, invite };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return { success: false, error: message };
  }
}

export async function listSharedTasks(): Promise<ListSharedTasksResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase.rpc("get_tappers_feed");

    if (error) {
      return { success: false, error: error.message };
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    return {
      success: true,
      data: rows.map((row) => mapFeedRow(row)),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return { success: false, error: message };
  }
}

export async function adoptSharedTask(
  sharedTaskId: string,
): Promise<AdoptSharedTaskResult> {
  const parsed = adoptSharedTaskSchema.safeParse({ sharedTaskId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: detailRows, error: detailError } = await supabase.rpc(
      "get_shared_task_detail",
      { p_shared_task_id: parsed.data.sharedTaskId },
    );

    if (detailError) {
      return { success: false, error: detailError.message };
    }

    const detailList = (detailRows ?? []) as Array<{
      owner_user_id: string;
      title: string;
      description: string | null;
      due_date: string | null;
      type: string;
    }>;

    const detail = detailList[0];
    if (!detail) {
      return {
        success: false,
        error: "Shared task not found or already adopted",
      };
    }

    const externalId = crypto.randomUUID();

    const { data: newTask, error: insertError } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        external_id: externalId,
        source: "custom",
        is_custom: true,
        status: "pending",
        title: detail.title,
        description: detail.description ?? null,
        due_date: detail.due_date ?? null,
        type: detail.type,
        course_id: null,
        shared_from_user_id: detail.owner_user_id,
      })
      .select("id")
      .single();

    if (insertError || !newTask) {
      return {
        success: false,
        error: insertError?.message ?? "Failed to create task",
      };
    }

    const { error: updateError } = await supabase
      .from("shared_tasks")
      .update({ added_task_id: newTask.id })
      .eq("id", parsed.data.sharedTaskId)
      .eq("recipient_id", user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, taskId: newTask.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return { success: false, error: message };
  }
}

export async function dismissSharedTask(
  sharedTaskId: string,
): Promise<SimpleActionResult> {
  const parsed = adoptSharedTaskSchema.safeParse({ sharedTaskId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const dismissedAt = new Date().toISOString();
    const { error } = await supabase
      .from("shared_tasks")
      .update({ dismissed_at: dismissedAt })
      .eq("id", parsed.data.sharedTaskId)
      .eq("recipient_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return { success: false, error: message };
  }
}

export async function markSharedTasksSeen(
  sharedTaskIds: string[],
): Promise<SimpleActionResult> {
  const parsed = markSeenSchema.safeParse({ sharedTaskIds });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const seenAt = new Date().toISOString();
    const { error } = await supabase
      .from("shared_tasks")
      .update({ seen_at: seenAt })
      .eq("recipient_id", user.id)
      .is("seen_at", null)
      .in("id", parsed.data.sharedTaskIds);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return { success: false, error: message };
  }
}

export async function updateTapperNotificationPref(
  enabled: boolean,
): Promise<SimpleActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ tapper_notifications_enabled: enabled })
      .eq("id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return { success: false, error: message };
  }
}

export async function markTappersAnnouncementSeen(): Promise<SimpleActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ seen_tappers_announcement: true })
      .eq("id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return { success: false, error: message };
  }
}
