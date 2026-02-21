# Task Aggregator — Architecture Blueprint

## System Overview

A Progressive Web App that aggregates academic tasks from UVEC (Moodle) and Google Classroom into a single, organized dashboard for university students. Designed for 10K students, $0 hosting cost.

```
┌─────────────────────────────────────────────────────────────┐
│                     Student's Device                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Next.js PWA (React)                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │  │
│  │  │Dashboard │  │ Task     │  │ Settings /         │  │  │
│  │  │ (Today/  │  │ Detail   │  │ Account Linking    │  │  │
│  │  │  Week)   │  │ View     │  │ (UVEC + GClass)    │  │  │
│  │  └──────────┘  └──────────┘  └────────────────────┘  │  │
│  │                      │                                │  │
│  │           ┌──────────┴──────────┐                     │  │
│  │           │   Client-Side       │                     │  │
│  │           │   Fetch Engine      │                     │  │
│  │           │  ┌────────┐ ┌─────┐ │                     │  │
│  │           │  │iCal    │ │GCR  │ │                     │  │
│  │           │  │Parser  │ │API  │ │                     │  │
│  │           │  └────────┘ └─────┘ │                     │  │
│  │           └──────────┬──────────┘                     │  │
│  └───────────────────────┼───────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │      Supabase           │
              │  ┌──────────────────┐   │
              │  │   Auth (Google   │   │
              │  │   OAuth 2.0)     │   │
              │  └──────────────────┘   │
              │  ┌──────────────────┐   │
              │  │   PostgreSQL     │   │
              │  │   (Tasks, Users, │   │
              │  │    Courses)      │   │
              │  └──────────────────┘   │
              │  ┌──────────────────┐   │
              │  │   Realtime       │   │
              │  │   (Subscriptions)│   │
              │  └──────────────────┘   │
              │  ┌──────────────────┐   │
              │  │   Edge Functions │   │
              │  │   (Notifications,│   │
              │  │    Dedup, Cron)  │   │
              │  └──────────────────┘   │
              └─────────────────────────┘
```

---

## Data Flow

### 1. UVEC (Moodle) Task Ingestion

```
Student's UVEC iCal URL
  → Client-side GET request (CORS proxy if needed)
  → Parse .ics with node-ical / ical.js
  → Extract VEVENT entries (assignments, quizzes, events)
  → Normalize to unified Task schema
  → Upsert to Supabase (dedup by source + external_id)
```

**What the iCal URL provides:**

- Assignment deadlines
- Quiz open/close times
- Scheduled course events
- One URL per student (contains personal token in `preset_what=all`)

**What it does NOT provide:**

- Announcements (unless professor set a date)
- Discussion board posts
- File uploads / materials

**CORS consideration:** The UVEC server likely blocks browser `fetch()` due to CORS. Solutions:

1. **Supabase Edge Function proxy** (recommended) — Lightweight proxy that forwards the iCal request
2. **Cloudflare Worker proxy** — Alternative free CORS proxy
3. **Student pastes iCal URL in settings** — App stores the URL, Edge Function fetches server-side

### 2. Google Classroom Task Ingestion

```
Student signs in with Google OAuth 2.0
  → Supabase Auth stores OAuth tokens (with classroom.courses.readonly scope)
  → Client calls Google Classroom API directly:
      GET /v1/courses
      GET /v1/courses/{id}/courseWork
      GET /v1/courses/{id}/announcements
  → Normalize to unified Task schema
  → Upsert to Supabase
```

**Google API free tier:** 4M queries/day — more than enough for 10K students.

**Required OAuth scopes:**

- `classroom.courses.readonly` — List enrolled courses
- `classroom.coursework.me.readonly` — List assignments and submissions
- `classroom.announcements.readonly` — List announcements

### 3. Task Normalization

Both sources produce a unified `Task` record:

```typescript
interface Task {
  id: string; // UUID (Supabase-generated)
  userId: string; // Foreign key to auth.users
  source: "uvec" | "gclassroom"; // Origin platform
  externalId: string; // ID from source platform (for dedup)
  courseId: string; // Internal course reference
  courseName: string; // e.g., "CS 101 - Data Structures"
  title: string; // Task title
  description: string | null; // Task description/instructions
  type: TaskType; // 'assignment' | 'quiz' | 'exam' | 'event' | 'announcement'
  status: TaskStatus; // 'pending' | 'submitted' | 'graded' | 'overdue' | 'dismissed'
  dueDate: string | null; // ISO 8601 datetime
  createdAt: string; // When the task was created on the source
  fetchedAt: string; // When we last fetched this data
  url: string | null; // Direct link to open in UVEC/GClassroom
  metadata: Record<string, unknown>; // Source-specific extra data
}

type TaskType = "assignment" | "quiz" | "exam" | "event" | "announcement";
type TaskStatus = "pending" | "submitted" | "graded" | "overdue" | "dismissed";
```

---

## Technology Stack

| Layer             | Technology                     | Cost           | Why                                                |
| ----------------- | ------------------------------ | -------------- | -------------------------------------------------- |
| **Frontend**      | Next.js 15 (App Router)        | Free (Vercel)  | React ecosystem, SSR, PWA support, instant deploys |
| **UI Library**    | shadcn/ui + Tailwind CSS       | Free           | Beautiful, accessible, copy-paste components       |
| **State**         | TanStack Query (React Query)   | Free           | Server state management, caching, refetching       |
| **PWA**           | next-pwa / Serwist             | Free           | Service worker, offline, installability            |
| **Auth**          | Supabase Auth                  | Free           | Google OAuth built-in, stores tokens               |
| **Database**      | Supabase PostgreSQL            | Free (500MB)   | RLS, real-time, Edge Functions included            |
| **Real-time**     | Supabase Realtime              | Free           | Push new tasks to open clients                     |
| **Serverless**    | Supabase Edge Functions (Deno) | Free (500K/mo) | CORS proxy, notifications, cron tasks              |
| **Notifications** | Web Push API                   | Free           | Push notifications to subscribed devices           |
| **iCal Parsing**  | ical.js / node-ical            | Free           | Parse UVEC .ics exports                            |
| **Hosting**       | Vercel (frontend)              | Free           | Edge network, automatic HTTPS                      |
| **Monitoring**    | Sentry (free tier)             | Free           | Error tracking, 5K events/month                    |

### Free Tier Budget Analysis (10K students)

| Resource                | Free Limit          | Estimated Usage                           | Headroom |
| ----------------------- | ------------------- | ----------------------------------------- | -------- |
| Supabase DB             | 500MB               | ~50MB (10K users × 50 tasks × ~100B/task) | 10x      |
| Supabase Auth           | 50K MAU             | 10K MAU                                   | 5x       |
| Supabase Edge Functions | 500K invocations/mo | ~100K (UVEC proxy calls)                  | 5x       |
| Supabase Realtime       | 200 concurrent      | ~50-100 concurrent peak                   | 2-4x     |
| Vercel Bandwidth        | 100GB/mo            | ~10-20GB                                  | 5-10x    |
| Google Classroom API    | 4M queries/day      | ~30K/day (10K × 3 endpoints)              | 130x     |
| Sentry                  | 5K events/mo        | ~1-2K errors                              | 2.5x     |

**Verdict:** Comfortably within free tiers. The bottleneck would be Supabase Realtime concurrent connections at peak (200 free). Mitigation: use polling fallback for non-critical updates.

---

## Database Schema

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  university_id TEXT,                    -- Student number
  uvec_ical_url TEXT,                    -- Personal UVEC iCal export URL
  google_connected BOOLEAN DEFAULT FALSE,
  notification_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses (deduplicated across students)
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('uvec', 'gclassroom')),
  external_id TEXT NOT NULL,             -- Course ID from source
  name TEXT NOT NULL,
  short_name TEXT,                       -- e.g., "CS101"
  instructor TEXT,
  color TEXT,                            -- User-assigned color for UI
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, source, external_id)
);

-- Tasks (the core entity)
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('uvec', 'gclassroom')),
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('assignment', 'quiz', 'exam', 'event', 'announcement')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'graded', 'overdue', 'dismissed')),
  due_date TIMESTAMPTZ,
  url TEXT,                              -- Direct link to source platform
  metadata JSONB DEFAULT '{}',
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, source, external_id)  -- Dedup key
);

-- User task customizations (status overrides, notes)
CREATE TABLE public.task_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  custom_status TEXT,                    -- User can mark as done, dismissed, etc.
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes TEXT,
  reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, task_id)
);

-- Push notification subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,                   -- p256dh + auth keys
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

-- Indexes for performance
CREATE INDEX idx_tasks_user_due ON public.tasks (user_id, due_date);
CREATE INDEX idx_tasks_user_status ON public.tasks (user_id, status);
CREATE INDEX idx_tasks_user_source_ext ON public.tasks (user_id, source, external_id);
CREATE INDEX idx_courses_user ON public.courses (user_id);

-- Row Level Security (every user sees only their own data)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users see own courses" ON public.courses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own tasks" ON public.tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own overrides" ON public.task_overrides
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own push subs" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);
```

---

## Component Architecture (Frontend)

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (PWA meta, providers)
│   ├── page.tsx                  # Landing / marketing page
│   ├── (auth)/
│   │   ├── login/page.tsx        # Google OAuth login
│   │   └── onboarding/page.tsx   # Link UVEC + GClassroom
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Dashboard shell (nav, sidebar)
│   │   ├── page.tsx              # Today's tasks (default view)
│   │   ├── week/page.tsx         # Week view
│   │   ├── calendar/page.tsx     # Calendar view
│   │   ├── courses/page.tsx      # Course list with task counts
│   │   └── settings/page.tsx     # Account, notification prefs
│   └── api/                      # Route handlers (if needed)
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── task-card.tsx             # Single task display
│   ├── task-list.tsx             # Filterable task list
│   ├── task-filters.tsx          # Filter bar (source, type, course)
│   ├── course-badge.tsx          # Color-coded course label
│   ├── sync-button.tsx           # Manual refresh trigger
│   ├── countdown-badge.tsx       # "Due in 2h" badge
│   └── empty-state.tsx           # No tasks illustration
├── hooks/
│   ├── use-tasks.ts              # TanStack Query: fetch/cache tasks
│   ├── use-courses.ts            # TanStack Query: fetch/cache courses
│   ├── use-sync.ts               # Trigger UVEC + GClass sync
│   └── use-push-notifications.ts # Web Push subscription
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Supabase browser client
│   │   ├── server.ts             # Supabase server client (SSR)
│   │   └── middleware.ts         # Auth middleware
│   ├── parsers/
│   │   ├── ical-parser.ts        # Parse UVEC .ics → Task[]
│   │   └── gclassroom-parser.ts  # Parse GClassroom API → Task[]
│   ├── sync-engine.ts            # Orchestrates fetch + normalize + upsert
│   └── utils.ts                  # Date helpers, formatters
├── types/
│   ├── task.ts                   # Task, Course, TaskType, etc.
│   └── database.ts               # Supabase generated types
└── services/
    ├── uvec-service.ts           # UVEC iCal fetching
    └── gclassroom-service.ts     # Google Classroom API calls
```

---

## Key User Flows

### Flow 1: First-time Setup (Onboarding)

```
1. Student opens app URL → Sees landing page
2. Clicks "Sign in with Google" → Supabase Auth (Google OAuth)
3. OAuth consent screen requests classroom.* scopes
4. Redirected to onboarding page:
   a. Google Classroom: Already connected (via OAuth) ✓
   b. UVEC: Paste your iCal export URL
      - Show step-by-step guide: "Go to UVEC → Calendar → Export → Copy URL"
5. App performs initial sync:
   a. Fetch iCal from UVEC URL (via Edge Function proxy)
   b. Fetch courses + courseWork from Google Classroom API
   c. Normalize + insert all tasks
6. Redirect to dashboard → Student sees all tasks unified
7. Prompt: "Add to Home Screen" for mobile PWA install
```

### Flow 2: Daily Usage

```
1. Student opens PWA (or it refreshes via service worker)
2. App auto-syncs:
   a. If last sync > 1 hour ago → fetch fresh data from both sources
   b. Upsert new/updated tasks, mark completed ones
3. Dashboard shows "Today" view:
   - Tasks due today, sorted by deadline
   - Overdue tasks highlighted in red
   - Upcoming tasks (next 48h) below
4. Student can:
   - Tap task → See details + "Open in UVEC/GClassroom" link
   - Swipe/click to mark as done or dismiss
   - Filter by course, source, or type
   - Set priority or add personal notes
5. Push notification fires 1h before deadline (if enabled)
```

### Flow 3: Manual Sync

```
1. Student pulls-to-refresh or taps sync button
2. Loading indicator shows per-source progress
3. New tasks appear with "NEW" badge animation
4. Toast: "Found 3 new tasks" or "Everything up to date"
```

---

## Security Considerations

1. **UVEC iCal URL** — Contains a personal token. Store encrypted in `profiles.uvec_ical_url`. Only fetch via server-side Edge Function (never expose URL to browser network tab of other users).
2. **Google OAuth tokens** — Managed by Supabase Auth, stored encrypted. Use refresh tokens for long-lived access.
3. **Row Level Security (RLS)** — Every table has RLS policies. Users can only read/write their own data. No admin endpoints needed for MVP.
4. **CORS proxy** — Edge Function validates that the requesting user owns the iCal URL being fetched.
5. **Input validation** — Zod schemas validate all client-to-server data.
6. **Rate limiting** — Edge Functions should rate-limit sync requests (max 1 per 5 minutes per user).

---

## Scalability Path

| Scale                                | Architecture                               | Changes Needed                                              |
| ------------------------------------ | ------------------------------------------ | ----------------------------------------------------------- |
| **100 students** (pilot)             | Current architecture, Supabase free        | None                                                        |
| **1K students** (department)         | Same                                       | None                                                        |
| **10K students** (university)        | Same, monitor Realtime connections         | May need Supabase Pro ($25/mo) for >200 concurrent Realtime |
| **50K+ students** (multi-university) | Add Redis caching, CDN, background workers | Supabase Pro, Vercel Pro, dedicated CORS proxy              |
