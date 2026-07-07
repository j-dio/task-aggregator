# TapO(1)

Academic task aggregator for UP Cebu students — aggregates UVEC Moodle and Google Classroom tasks into a single drag-and-drop Kanban board.

[GitHub Repository](https://github.com/j-dio/task-aggregator)

---

## Tech Stack

| Dependency | Version | Role |
|------------|---------|------|
| Next.js (App Router) | 16.1.6 | Full-stack React framework |
| React | 19.2.3 | UI rendering |
| TypeScript | 5.x | Type-safe development |
| supabase-js | 2.97.0 | Auth, PostgreSQL (RLS), Edge Functions |
| @supabase/ssr | 0.8.0 | Server-side Supabase client |
| @tanstack/react-query | 5.90.21 | Client data fetching |
| @dnd-kit/core | 6.3.1 | Drag-and-drop primitives |
| @dnd-kit/sortable | 10.0.0 | Sortable list abstraction |
| Tailwind CSS | v4 | Utility-first styling |
| @radix-ui/react-* | 1.4.3 | shadcn/ui component primitives |
| serwist | 9.5.6 | PWA / service worker |
| @sentry/nextjs | 10.43.0 | Client-side error monitoring |
| ics | 3.8.1 | ICS calendar file generation |
| Vitest | 4.0.18 | Unit testing |

**Architecture note:** Imported tasks are never mutated. All user changes (status, priority, notes) are written as upserts to the `task_overrides` table keyed on `(user_id, task_id)`. This keeps the sync engine idempotent and prevents accidental overwrites of upstream task data.

---

## Prerequisites

- Node.js 20+
- npm
- Supabase account (free tier works — https://supabase.com)
- Google account with access to Google Cloud Console (https://console.cloud.google.com)

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in each value:

```bash
cp .env.example .env.local
```

| Variable | Description | Where to obtain |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project API URL | Supabase Dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (safe to expose) | Supabase Dashboard → Project Settings → API → Project API keys → anon public |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID |
| `NEXT_PUBLIC_SITE_URL` | Full URL of your deployed app (no trailing slash) | Your hosting provider URL, e.g. `https://tapo1.vercel.app`; use `http://localhost:3000` locally |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key for Web Push | Generated locally — see Push Notifications section below |
| `VAPID_PRIVATE_KEY` | VAPID private key for Web Push | Generated locally — see Push Notifications section below |
| `VAPID_SUBJECT` | Contact URI for push service (must start with `mailto:` or `https://`) | Set to `mailto:you@example.com` with your email address |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry Data Source Name for error reporting | Sentry Dashboard → Project Settings → Client Keys (DSN) — safe as `NEXT_PUBLIC_` |

---

## Setup: Supabase

1. Go to https://supabase.com and create a new project. Note the **Project URL** and **anon key** from Project Settings → API.

2. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

3. Log in:
   ```bash
   supabase login
   ```

4. Link your project (the project ref is in Project Settings → General):
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

5. Apply all database migrations — this creates the `profiles`, `courses`, `tasks`, `task_overrides`, `push_subscriptions`, and `notification_log` tables with Row Level Security policies:
   ```bash
   supabase db push
   ```

6. Deploy the UVEC proxy Edge Function (required for fetching Moodle iCal feeds through CORS):
   ```bash
   supabase functions deploy uvec-proxy
   ```

7. Configure Google OAuth in Supabase Auth:
   - Supabase Dashboard → Authentication → Providers → Google
   - Enable the Google provider
   - Paste in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - Copy the **Supabase OAuth callback URL** shown in the UI (format: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`) — you will need it in the Google Cloud Console step below

---

## Setup: Google Cloud Console

1. Go to https://console.cloud.google.com and create (or select) a project.

2. Enable the Google Classroom API:
   - APIs & Services → Library → search "Google Classroom API" → Enable

3. Configure the OAuth consent screen:
   - APIs & Services → OAuth consent screen
   - User Type: **External**
   - Fill in App name (`TapO(1)`), user support email, and developer contact email
   - Add the following scopes:
     - `openid`
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/classroom.courses.readonly`
     - `https://www.googleapis.com/auth/classroom.coursework.me.readonly`
     - `https://www.googleapis.com/auth/classroom.student-submissions.me.readonly`
   - While the app is in **Testing** mode, add your Google accounts as test users

4. Create OAuth credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Authorized redirect URIs — add **all three**:
     - `http://localhost:3000/auth/callback` (local development)
     - `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback` (Supabase OAuth flow)
     - `https://YOUR_DEPLOYED_DOMAIN/auth/callback` (production)
   - Copy the **Client ID** and **Client Secret** into `.env.local` and into the Supabase Auth Google provider settings

---

## Setup: Push Notifications / VAPID Keys

1. Generate VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```
   This prints a public key and a private key.

2. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to the **public key**.

3. Set `VAPID_PRIVATE_KEY` to the **private key**.

4. Set `VAPID_SUBJECT` to a `mailto:` URI with a contact address:
   ```
   VAPID_SUBJECT=mailto:admin@example.com
   ```
   **Important:** The value MUST start with `mailto:` or `https://`. A bare email address or empty string will cause the push service to reject notifications at runtime with no visible error to the end user.

5. Add the same public key to your Supabase Edge Function environment (the push cron function reads it server-side to sign outgoing push requests).

---

## Running Locally

```bash
# 1. Clone the repo
git clone https://github.com/j-dio/task-aggregator.git
cd task-aggregator

# 2. Install dependencies
npm install

# 3. Copy and fill in env vars
cp .env.example .env.local
# Edit .env.local with your values from the sections above

# 4. Start the dev server
npm run dev
```

Visit http://localhost:3000. You will be redirected to the landing page. Sign in with Google to reach the dashboard.

---

## Running Tests

```bash
npm run test        # run all tests once
npm run test:watch  # watch mode
```

77 tests covering: iCal parser, Google Classroom parser, sync engine, action board bucketing, ICS calendar generation, and push notification validation. Tests run in the Vitest `node` environment (no jsdom).

---

## Deployment (Vercel)

1. Push the repo to GitHub.
2. Import the project at https://vercel.com.
3. In Vercel Project Settings → Environment Variables, add all variables from `.env.example`.
4. Deploy. Vercel auto-detects Next.js and configures the build command automatically.

---

## Contributing

Standard fork → branch → PR workflow.

Before submitting a PR:
```bash
npm run lint    # ESLint
npm run test    # Vitest
```

use it guys!