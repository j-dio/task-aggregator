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

  // Upsert logic: dedup by source + external_id
  // Assumes Supabase client is available as supabase
  // Upsert courses and tasks
  // NOTE: This is a placeholder, adapt to your Supabase client import
  // import { supabase } from '../lib/supabase/client';

  // Example upsert for tasks
  // await supabase.from('tasks').upsert(
  //   parseICal(await fetchUvecICal(icalUrl)).map(t => ({
  //     ...t,
  //     user_id: userId,
  //   })),
  //   { onConflict: ['external_id', 'source', 'user_id'] }
  // );

  // Example upsert for courses (if course info is available)
  // await supabase.from('courses').upsert(
  //   courses.map(c => ({
  //     ...c,
  //     user_id: userId,
  //   })),
  //   { onConflict: ['external_id', 'source', 'user_id'] }
  // );

  // Return parsed tasks for now
  return parseICal(await fetchUvecICal(icalUrl));
}
