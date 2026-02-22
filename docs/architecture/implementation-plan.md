# Task Aggregator — Implementation Plan

## Requirements Restatement

1. **Aggregate tasks** from UVEC (Moodle iCal) and Google Classroom into a single view
2. **Categorize** tasks by course, type (assignment/quiz/exam/event), and urgency
3. **Notify** students of upcoming deadlines via push notifications
4. **Support 10K students** on zero-cost infrastructure
5. **Mobile-first** PWA with desktop support
6. **Auto-sync** tasks periodically; manual refresh available
7. **Personal** — Each student sees only their own tasks with RLS

---

## Implementation Phases

### Phase 0: Project Scaffolding (Size: S — ~2 hours)

- [x] Initialize Next.js 15 with App Router, TypeScript strict mode
- [x] Install dependencies: Tailwind CSS, shadcn/ui, TanStack Query, Supabase client
- [x] Configure PWA (next-pwa or Serwist) with manifest.json
- [x] Set up Supabase project (Auth, Database, Edge Functions)
- [x] Configure Google Cloud Console (OAuth consent screen, Classroom API)
- [x] Set up environment variables (.env.local)
- [x] Create CI/CD: deploy to Vercel on push to `main`

**Files:**

```
package.json, tsconfig.json, next.config.ts, tailwind.config.ts,
.env.local, .env.example, public/manifest.json
```

### Phase 1: Authentication & Onboarding (Size: M — ~4 hours)

- [x] Supabase Auth with Google OAuth (request classroom.\* scopes)
- [x] Auth middleware (protect dashboard routes)
- [x] Login page with "Sign in with Google" button
- [x] Onboarding flow: UVEC iCal URL input + instructions
- [x] Profile table migration + RLS policies
- [x] Store UVEC URL in profile, Google tokens in Supabase Auth

**Files:**

```
src/app/(auth)/login/page.tsx
src/app/(auth)/onboarding/page.tsx
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/middleware.ts
supabase/migrations/001_profiles.sql
```

### Phase 2: Data Ingestion — UVEC (Size: M — ~4 hours)

- [x] Supabase Edge Function: CORS proxy for iCal URL
- [x] iCal parser: .ics text → Task[] (using ical.js)
- [x] UVEC service: fetch + parse + normalize
- [x] Task + Course table migrations + RLS
- [x] Upsert logic (dedup by source + external_id)
- [x] Unit tests for iCal parser with sample .ics data

**Files:**

```
src/lib/parsers/ical-parser.ts
src/services/uvec-service.ts
supabase/functions/uvec-proxy/index.ts
supabase/migrations/002_courses_tasks.sql
src/lib/parsers/__tests__/ical-parser.test.ts
```

### Phase 3: Data Ingestion — Google Classroom (Size: M — ~4 hours)

- [ ] Google Classroom API client (courses, courseWork, announcements)
- [ ] GClassroom parser: API response → Task[]
- [ ] Sync engine: orchestrate both sources, handle errors gracefully
- [ ] Unit tests for GClassroom parser
- [ ] Integration test for sync engine

**Files:**

```
src/services/gclassroom-service.ts
src/lib/parsers/gclassroom-parser.ts
src/lib/sync-engine.ts
src/lib/parsers/__tests__/gclassroom-parser.test.ts
src/lib/__tests__/sync-engine.test.ts
```

### Phase 4: Dashboard UI (Size: L — ~6 hours)

- [ ] Dashboard layout (nav, sidebar, responsive)
- [ ] Today view: tasks due today + overdue, sorted by deadline
- [ ] Week view: tasks grouped by day
- [ ] Task card component: title, course badge, due countdown, source icon
- [ ] Task detail modal/page: description, link to source, notes
- [ ] Filter bar: by course, source, type, status
- [ ] Empty states: "No tasks due!" illustration
- [ ] Sync button with loading state
- [ ] Pull-to-refresh on mobile

**Files:**

```
src/app/(dashboard)/layout.tsx
src/app/(dashboard)/page.tsx
src/app/(dashboard)/week/page.tsx
src/components/task-card.tsx
src/components/task-list.tsx
src/components/task-filters.tsx
src/components/course-badge.tsx
src/components/countdown-badge.tsx
src/components/sync-button.tsx
src/components/empty-state.tsx
src/hooks/use-tasks.ts
src/hooks/use-courses.ts
src/hooks/use-sync.ts
```

### Phase 5: Task Management (Size: M — ~3 hours)

- [ ] Mark task as done / dismiss
- [ ] Set priority (low/medium/high/urgent)
- [ ] Add personal notes to tasks
- [ ] Task overrides table migration
- [ ] Auto-detect overdue tasks (due_date < now && status = pending)
- [ ] "Open in UVEC/GClassroom" deep link button

**Files:**

```
src/components/task-actions.tsx
supabase/migrations/003_task_overrides.sql
src/hooks/use-task-actions.ts
```

### Phase 6: Notifications & Reminders (Size: M — ~4 hours)

- [ ] Web Push API: subscription management
- [ ] Push subscription table migration
- [ ] Supabase Edge Function: send push notifications
- [ ] Cron trigger: check for tasks due within 1 hour, send reminders
- [ ] In-app notification center
- [ ] Settings page: notification preferences

**Files:**

```
src/hooks/use-push-notifications.ts
src/app/(dashboard)/settings/page.tsx
supabase/functions/send-notifications/index.ts
supabase/migrations/004_push_subscriptions.sql
public/sw.js (service worker for push)
```

### Phase 7: Polish & Launch (Size: M — ~4 hours)

- [ ] Offline support: service worker caches task data
- [ ] "Add to Home Screen" prompt + tutorial
- [ ] Calendar view (monthly overview)
- [ ] Export tasks to .ics file (for native calendar apps)
- [ ] Error boundaries + Sentry integration
- [ ] Landing page with feature highlights
- [ ] README.md with setup instructions
- [ ] Deploy to production

**Files:**

```
src/app/(dashboard)/calendar/page.tsx
src/app/page.tsx (landing)
src/components/error-boundary.tsx
README.md
```

---

## Dependencies

| Dependency           | Purpose                            | Risk                                                    |
| -------------------- | ---------------------------------- | ------------------------------------------------------- |
| Supabase free tier   | Auth, DB, Edge Functions, Realtime | LOW — Well within limits for 10K users                  |
| Google Classroom API | Task data from GClassroom          | LOW — 4M queries/day free                               |
| UVEC iCal export     | Task data from Moodle              | MEDIUM — URL format may change; no official API         |
| Vercel free tier     | Frontend hosting                   | LOW — 100GB bandwidth sufficient                        |
| Google OAuth consent | Unverified app warning             | MEDIUM — Need to submit for verification for >100 users |

## Risks

| Severity   | Risk                                                                       | Mitigation                                                                                 |
| ---------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **HIGH**   | Google OAuth unverified app — Google shows scary warning to users over 100 | Submit for Google verification early (Phase 1). Use university domain for faster approval. |
| **HIGH**   | UVEC CORS blocks browser requests                                          | Edge Function proxy (already planned in Phase 2)                                           |
| **MEDIUM** | UVEC iCal URL format changes or tokens expire                              | Build resilient parser with error handling; prompt user to re-paste URL if fetch fails     |
| **MEDIUM** | Supabase Realtime 200 concurrent limit                                     | Use TanStack Query polling (every 60s) as primary; Realtime as enhancement only            |
| **LOW**    | iOS Web Push requires "Add to Home Screen"                                 | Show clear tutorial during onboarding                                                      |
| **LOW**    | Student doesn't know where to find iCal URL                                | In-app guide with screenshots                                                              |

## Estimated Timeline

| Phase                         | Effort        | Cumulative                 |
| ----------------------------- | ------------- | -------------------------- |
| Phase 0: Scaffolding          | 2h            | 2h                         |
| Phase 1: Auth & Onboarding    | 4h            | 6h                         |
| Phase 2: UVEC Ingestion       | 4h            | 10h                        |
| Phase 3: GClassroom Ingestion | 4h            | 14h                        |
| Phase 4: Dashboard UI         | 6h            | 20h                        |
| Phase 5: Task Management      | 3h            | 23h                        |
| Phase 6: Notifications        | 4h            | 27h                        |
| Phase 7: Polish & Launch      | 4h            | 31h                        |
| **Total**                     | **~31 hours** | **~2-3 weeks** (part-time) |
