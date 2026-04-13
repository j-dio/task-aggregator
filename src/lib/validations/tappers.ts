import { z } from "zod/v4";

// ─── Invite code ────────────────────────────────────────────────────────────
// Codes are 12 alphanumeric chars (generated as uppercase base32 minus ambiguous
// characters: 0, O, 1, I, L). Accept any case on input; normalize server-side.
export const acceptInviteSchema = z.object({
  code: z
    .string()
    .min(6, "Code is too short")
    .max(20, "Code is too long")
    .regex(/^[A-Za-z0-9]+$/, "Code must be alphanumeric"),
});

// ─── Share a task ────────────────────────────────────────────────────────────
export const shareTaskSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
  recipientIds: z
    .array(z.string().uuid("Invalid recipient ID"))
    .min(1, "Select at least one tapper")
    .max(20, "Cannot share with more than 20 tappers at once"),
});

// ─── Adopt a shared task ─────────────────────────────────────────────────────
export const adoptSharedTaskSchema = z.object({
  sharedTaskId: z.string().uuid("Invalid shared task ID"),
});

// ─── Mark shared tasks seen ──────────────────────────────────────────────────
export const markSeenSchema = z.object({
  sharedTaskIds: z.array(z.string().uuid()).min(1).max(100),
});

// ─── Unlink tapper ───────────────────────────────────────────────────────────
export const unlinkTapperSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});
