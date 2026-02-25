// UVEC service: fetch, parse, normalize, upsert tasks

import { parseICal } from "../lib/parsers/ical-parser";
import { createClient } from "../lib/supabase/client";
import type { ParsedTask } from "../types/task";
import { z } from "zod";

const UvecServiceSchema = z.object({
  icalUrl: z.string().url(),
  userId: z.string(),
});

export async function fetchUvecICal(icalUrl: string): Promise<string> {
  // Use Supabase Edge Function proxy for CORS
  const proxyUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/uvec-proxy?icalUrl=${encodeURIComponent(icalUrl)}`;
  const resp = await fetch(proxyUrl);
  if (!resp.ok) throw new Error("Failed to fetch UVEC iCal");
  return await resp.text();
}

export async function ingestUvecTasks({
  icalUrl,
  userId,
}: z.infer<typeof UvecServiceSchema>): Promise<ParsedTask[]> {
  UvecServiceSchema.parse({ icalUrl, userId });

  const icsText = await fetchUvecICal(icalUrl);
  const { tasks, errors } = parseICal(icsText);

  if (tasks.length === 0) {
    if (errors.length > 0) {
      throw new Error(`UVEC parse failed: ${errors[0]}`);
    }
    return [];
  }

  // Upsert tasks to database
  const supabase = createClient();
  const taskRows = tasks.map((t) => ({
    user_id: userId,
    external_id: t.externalId,
    title: t.title,
    description: t.description,
    due_date: t.dueDate,
    type: t.type,
    source: t.source,
    status: "pending",
  }));

  const { error } = await supabase.from("tasks").upsert(taskRows, {
    onConflict: "user_id,external_id,source",
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(`Failed to upsert UVEC tasks: ${error.message}`);
  }

  return tasks;
}
