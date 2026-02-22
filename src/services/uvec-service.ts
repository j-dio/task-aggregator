// src/services/uvec-service.ts
// UVEC service: fetch, parse, normalize, upsert tasks
// Conventions: Immutability, Zod validation, no console.log

import { parseICal, Task } from "../lib/parsers/ical-parser";
import { z } from "zod";

const UvecServiceSchema = z.object({
  icalUrl: z.string().url(),
  userId: z.string(),
});

export async function fetchUvecICal(icalUrl: string): Promise<string> {
  // Use Supabase Edge Function proxy for CORS
  const resp = await fetch(
    `/functions/uvec-proxy?icalUrl=${encodeURIComponent(icalUrl)}`,
  );
  if (!resp.ok) throw new Error("Failed to fetch UVEC iCal");
  return await resp.text();
}

export async function ingestUvecTasks({
  icalUrl,
  userId,
}: z.infer<typeof UvecServiceSchema>): Promise<Task[]> {
  UvecServiceSchema.parse({ icalUrl, userId });
  const ics = await fetchUvecICal(icalUrl);

  // TODO: Normalize courses, upsert tasks/courses in DB (dedup by source + external_id)
  // This function returns parsed tasks for now
  return parseICal(ics);
}
