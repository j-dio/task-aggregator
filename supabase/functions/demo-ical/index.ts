// Supabase Edge Function: demo-ical
// Public iCal feed with dates relative to NOW — never goes stale.
// Deploy: supabase functions deploy demo-ical --no-verify-jwt

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function toICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  // e.g. "20260613T160000Z"
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(23, 59, 0, 0);
  return d;
}

interface DemoEvent {
  uid: string;
  summary: string;
  dtstart: Date;
  categories: string;
  description: string;
}

function buildCalendar(now: Date): string {
  const events: DemoEvent[] = [
    {
      uid: "demo-uvec-1@tapo1",
      summary: "[CMSC 128] Lab Exercise 4: REST API Implementation",
      dtstart: addDays(now, -2),
      categories: "assignment",
      description: "Implement a REST API using Express.js with full CRUD operations.",
    },
    {
      uid: "demo-uvec-2@tapo1",
      summary: "[MATH 100] Problem Set 7: Linear Transformations",
      dtstart: addDays(now, -1),
      categories: "assignment",
      description: "Complete problems 7.1–7.8 on linear transformations and eigenvalues.",
    },
    {
      uid: "demo-uvec-3@tapo1",
      summary: "[CMSC 142] Quiz 3: Graph Traversal Algorithms",
      dtstart: addDays(now, 0),
      categories: "quiz",
      description: "BFS, DFS, and their applications. Open-book, 30 minutes.",
    },
    {
      uid: "demo-uvec-4@tapo1",
      summary: "[COMM 1] Reaction Paper: Digital Literacy in the 21st Century",
      dtstart: addDays(now, 1),
      categories: "assignment",
      description: "Write a 500-word reaction paper on the assigned reading.",
    },
    {
      uid: "demo-uvec-5@tapo1",
      summary: "[CMSC 128] Project Milestone 2: Database Schema",
      dtstart: addDays(now, 3),
      categories: "assignment",
      description: "Submit ER diagram and normalized schema for the semester project.",
    },
    {
      uid: "demo-uvec-6@tapo1",
      summary: "[CMSC 142] Programming Assignment 3: Dijkstra's Algorithm",
      dtstart: addDays(now, 5),
      categories: "assignment",
      description: "Implement Dijkstra's shortest path algorithm with a priority queue.",
    },
    {
      uid: "demo-uvec-7@tapo1",
      summary: "[MATH 100] Long Exam 2: Eigenvalues and Eigenvectors",
      dtstart: addDays(now, 7),
      categories: "exam",
      description: "Covers chapters 5–7. Bring a scientific calculator.",
    },
    {
      uid: "demo-uvec-8@tapo1",
      summary: "[CMSC 128] Team Standup: Sprint 3 Review",
      dtstart: addDays(now, 9),
      categories: "event",
      description: "Present sprint 3 deliverables. Each team has 10 minutes.",
    },
    {
      uid: "demo-uvec-9@tapo1",
      summary: "[COMM 1] Oral Presentation: Technology and Society",
      dtstart: addDays(now, 12),
      categories: "event",
      description: "5-minute presentation on your chosen technology topic.",
    },
    {
      uid: "demo-uvec-10@tapo1",
      summary: "[CMSC 128] Final Project Submission",
      dtstart: addDays(now, 14),
      categories: "assignment",
      description: "Submit complete source code, documentation, and demo video.",
    },
  ];

  const vevents = events
    .map(
      (ev) =>
        [
          "BEGIN:VEVENT",
          `UID:${ev.uid}`,
          `SUMMARY:${ev.summary}`,
          `DTSTART:${toICalDate(ev.dtstart)}`,
          `CATEGORIES:${ev.categories}`,
          `DESCRIPTION:${ev.description}`,
          "END:VEVENT",
        ].join("\r\n"),
    )
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TapO1//Demo iCal Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    vevents,
    "END:VCALENDAR",
  ].join("\r\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const ics = buildCalendar(new Date());

  return new Response(ics, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
});
