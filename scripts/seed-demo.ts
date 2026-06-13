/**
 * Idempotent seed script for TapO(1) demo accounts.
 * Run: npm run seed:demo
 * Reset: npm run seed:demo -- --reset
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DEMO_ICAL_URL  (set after deploying supabase/functions/demo-ical)
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local without a dependency on dotenv
function loadEnvFile(filename: string) {
  try {
    const content = readFileSync(resolve(process.cwd(), filename), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // File absent — rely on shell environment
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// TODO: set DEMO_ICAL_URL after running: supabase functions deploy demo-ical --no-verify-jwt
const DEMO_ICAL_URL =
  process.env.DEMO_ICAL_URL ??
  "https://<project-ref>.supabase.co/functions/v1/demo-ical";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "TapO1demo!";

interface AccountDef {
  email: string;
  hasIcalUrl: boolean;
  landsOn: string;
}

const ACCOUNTS: AccountDef[] = [
  { email: "demo@tapo1.app", hasIcalUrl: true, landsOn: "/dashboard" },
  { email: "test-seeded@tapo1.app", hasIcalUrl: true, landsOn: "/dashboard" },
  { email: "test-empty-1@tapo1.app", hasIcalUrl: false, landsOn: "/onboarding" },
  { email: "test-empty-2@tapo1.app", hasIcalUrl: false, landsOn: "/onboarding" },
];

/** Safe set: script only ever touches these emails. */
const SAFE_EMAILS = new Set(ACCOUNTS.map((a) => a.email));

function daysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(23, 59, 0, 0);
  return d.toISOString();
}

async function getOrCreateUser(email: string): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });

  if (!error) return data.user.id;

  // 422 = user already registered — find and reuse
  if (
    error.status === 422 ||
    error.message.toLowerCase().includes("already registered")
  ) {
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listErr || !list) throw new Error(`listUsers failed: ${listErr?.message}`);
    const existing = list.users.find((u) => u.email === email);
    if (!existing) throw new Error(`${email}: 422 but not found in listUsers`);
    return existing.id;
  }

  throw new Error(`createUser(${email}): ${error.message}`);
}

async function resetGClassroomData(userId: string): Promise<void> {
  // Tasks first (FK constraint on course_id)
  await supabase
    .from("tasks")
    .delete()
    .eq("user_id", userId)
    .eq("source", "gclassroom");
  await supabase
    .from("courses")
    .delete()
    .eq("user_id", userId)
    .eq("source", "gclassroom");
}

async function seedGClassroom(userId: string): Promise<void> {
  const { data: courses, error: courseErr } = await supabase
    .from("courses")
    .upsert(
      [
        {
          user_id: userId,
          external_id: "gc-1",
          source: "gclassroom",
          name: "Operating Systems",
          color: null,
        },
        {
          user_id: userId,
          external_id: "gc-2",
          source: "gclassroom",
          name: "Data Structures and Algorithms",
          color: null,
        },
        {
          user_id: userId,
          external_id: "gc-3",
          source: "gclassroom",
          name: "Software Engineering",
          color: null,
        },
      ],
      { onConflict: "user_id,external_id,source" },
    )
    .select("id, external_id");

  if (courseErr || !courses)
    throw new Error(`courses upsert: ${courseErr?.message}`);

  const byExtId = Object.fromEntries(courses.map((c) => [c.external_id, c.id]));

  const { error: taskErr } = await supabase.from("tasks").upsert(
    [
      {
        user_id: userId,
        course_id: byExtId["gc-1"],
        external_id: "gc-task-1",
        source: "gclassroom",
        title: "Process Scheduling Report",
        description:
          "Write a comparative analysis of CPU scheduling algorithms (FCFS, SJF, Round Robin).",
        due_date: daysFromNow(-1),
        type: "assignment",
        status: "pending",
        is_custom: false,
      },
      {
        user_id: userId,
        course_id: byExtId["gc-1"],
        external_id: "gc-task-2",
        source: "gclassroom",
        title: "Memory Management Quiz",
        description: "Covers virtual memory, paging, and segmentation. Open notes, 30 minutes.",
        due_date: daysFromNow(0),
        type: "quiz",
        status: "pending",
        is_custom: false,
      },
      {
        user_id: userId,
        course_id: byExtId["gc-2"],
        external_id: "gc-task-3",
        source: "gclassroom",
        title: "Binary Search Tree Implementation",
        description:
          "Implement a self-balancing BST (AVL or Red-Black) with insert, delete, and search.",
        due_date: daysFromNow(2),
        type: "assignment",
        status: "pending",
        is_custom: false,
      },
      {
        user_id: userId,
        course_id: byExtId["gc-2"],
        external_id: "gc-task-4",
        source: "gclassroom",
        title: "Graph Algorithms Lab",
        description: "Implement Prim's and Kruskal's MST algorithms with complexity analysis.",
        due_date: daysFromNow(4),
        type: "assignment",
        status: "in_progress",
        is_custom: false,
      },
      {
        user_id: userId,
        course_id: byExtId["gc-3"],
        external_id: "gc-task-5",
        source: "gclassroom",
        title: "UML Design Document",
        description:
          "Create class, sequence, and activity diagrams for the semester project.",
        due_date: daysFromNow(6),
        type: "assignment",
        status: "pending",
        is_custom: false,
      },
      {
        user_id: userId,
        course_id: byExtId["gc-3"],
        external_id: "gc-task-6",
        source: "gclassroom",
        title: "Sprint 2 Peer Review",
        description:
          "Review two other teams' sprint deliverables and submit structured feedback.",
        due_date: daysFromNow(8),
        type: "assignment",
        status: "pending",
        is_custom: false,
      },
    ],
    { onConflict: "user_id,external_id,source" },
  );

  if (taskErr) throw new Error(`tasks upsert: ${taskErr.message}`);
}

async function main() {
  const reset = process.argv.includes("--reset");

  if (DEMO_ICAL_URL.includes("<project-ref>")) {
    console.warn(
      "\n⚠  DEMO_ICAL_URL not set — seeded accounts will have a placeholder URL.\n" +
        "   Deploy demo-ical then re-run with DEMO_ICAL_URL=https://<ref>.supabase.co/functions/v1/demo-ical\n",
    );
  }

  console.log(`Seeding against: ${SUPABASE_URL}`);
  if (reset) console.log("Mode: --reset (deletes existing gclassroom data first)");
  console.log("");

  type Result = { email: string; status: "ok" | "error"; detail: string; landsOn: string };
  const results: Result[] = [];

  for (const account of ACCOUNTS) {
    if (!SAFE_EMAILS.has(account.email)) continue; // safety guard

    process.stdout.write(`  ${account.email} ... `);

    try {
      const userId = await getOrCreateUser(account.email);

      if (reset) await resetGClassroomData(userId);

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ uvec_ical_url: account.hasIcalUrl ? DEMO_ICAL_URL : null })
        .eq("id", userId);

      if (profileErr) throw new Error(`profiles.update: ${profileErr.message}`);

      await seedGClassroom(userId);

      results.push({ email: account.email, status: "ok", detail: "ok", landsOn: account.landsOn });
      process.stdout.write("done\n");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ email: account.email, status: "error", detail: msg, landsOn: "—" });
      process.stdout.write(`FAILED: ${msg}\n`);
    }
  }

  const col1 = 26, col2 = 14, col3 = 14;
  const line = "─".repeat(col1 + col2 + col3 + 8);
  console.log(`\n┌${line}┐`);
  console.log(
    `│ ${"Account".padEnd(col1)} │ ${"Password".padEnd(col2)} │ ${"Lands on".padEnd(col3)} │`,
  );
  console.log(`├${line}┤`);
  for (const r of results) {
    const dest = r.status === "ok" ? r.landsOn : `ERROR`;
    console.log(
      `│ ${r.email.padEnd(col1)} │ ${DEMO_PASSWORD.padEnd(col2)} │ ${dest.padEnd(col3)} │`,
    );
  }
  console.log(`└${line}┘\n`);

  if (results.some((r) => r.status === "error")) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
