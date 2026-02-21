# ADR-001: Platform Choice — Progressive Web App (PWA)

## Date

2026-02-20

## Status

Accepted

## Context

We need to build a task aggregator for ~10K university students who use two separate platforms (UVEC/Moodle and Google Classroom). Students need to track assignments, quizzes, and deadlines across both platforms from a single interface.

Key constraints:

- **Zero budget** — No paid hosting, no app store fees
- **10K students** — Must scale to the entire university population
- **Mobile-first** — Students use phones most of the time
- **Desktop useful** — For task categorization and detailed views
- **Fast deployment** — Need to reach students quickly, not through app store review cycles
- **Rapid iteration** — University calendar changes frequently, need instant updates

## Decision

Build a **Progressive Web App (PWA)** using Next.js, deployable to Vercel's free tier.

## How It Works — Distribution Model

A PWA is a website that behaves like a native app. There is **no app store involved**.

### Installation Flow

1. **You deploy the app** to a URL (e.g., `https://taskagg.vercel.app`)
2. **You share the URL** via university group chats, Facebook groups, class announcements, etc.
3. **Each student visits the URL** in their phone or desktop browser
4. **Browser prompts "Add to Home Screen"** (or student taps menu → "Install")
5. **App icon appears** on their home screen — full-screen, no browser chrome, looks native

This is how the app reaches 10K students instantly — a single link, no downloads, no app store approval.

### Data Is Personal, Not Shared

Every student sees **only their own** tasks. The shared URL is just the app's address — like how everyone goes to `gmail.com` but sees their own inbox.

```
  Student A visits taskagg.vercel.app     Student B visits taskagg.vercel.app
           │                                        │
           ▼                                        ▼
  ┌──────────────────┐                   ┌──────────────────┐
  │ Signs in with    │                   │ Signs in with    │
  │ their Google     │                   │ their Google     │
  │ account + pastes │                   │ account + pastes │
  │ their UVEC URL   │                   │ their UVEC URL   │
  └────────┬─────────┘                   └────────┬─────────┘
           │                                      │
           ▼                                      ▼
  ┌──────────────────┐                   ┌──────────────────┐
  │ Sees their tasks:│                   │ Sees their tasks:│
  │ - CS201 Quiz     │                   │ - ENG101 Essay   │
  │ - MATH301 HW     │                   │ - BIO202 Lab     │
  │ - ENG101 Essay   │                   │ - HIST100 Paper  │
  └──────────────────┘                   └──────────────────┘
```

## Consequences

### Positive

- **Zero distribution friction** — Share a URL, students add to home screen. No app store, no downloads, no waiting.
- **Cross-platform** — Single codebase works on iOS, Android, Windows, macOS, Linux — any device with a browser
- **Instant updates** — Every deploy is live for all users immediately. No app store review cycles.
- **Push notifications** — Web Push API supported on Android and desktop; iOS 16.4+ supports it when added to home screen
- **Offline support** — Service workers cache task data so students can view deadlines without internet
- **$0 cost** — Vercel free tier handles 100GB bandwidth/month, more than enough for 10K students
- **Familiar tech** — React/Next.js ecosystem, large community, easy to find contributors
- **Future-proof** — Can wrap with Capacitor for native app store listing later with zero rewrite

### Negative

- **iOS Push limitations** — Web Push on iOS requires the student to "Add to Home Screen" first (iOS 16.4+); not all students will do this unprompted
- **No deep background sync** — PWA background sync is limited compared to native apps; tasks refresh when the app is opened, not continuously in the background
- **No native integration** — Cannot directly write to the phone's calendar or native reminders app without explicit user action

### Alternatives Considered

| Alternative                   | Why Rejected                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| **React Native (mobile app)** | $99/yr Apple fee; 1-4 week review cycles; can't run on desktop; 2x dev effort for iOS+Android |
| **Browser Extension**         | Desktop-only; separate codebases for Chrome/Firefox; limited to browser context               |
| **Flutter**                   | Steeper learning curve; Dart ecosystem smaller for web; PWA support less mature               |
| **Electron (desktop)**        | Desktop-only; overkill for this use case; heavy install                                       |
| **Native iOS + Android**      | Maximum dev effort; need Swift + Kotlin; highest cost; slowest iteration                      |

### Mitigation for PWA Limitations

- **iOS Push**: Show an in-app tutorial on first visit guiding students to "Add to Home Screen" with step-by-step screenshots
- **Background sync**: Use `navigator.serviceWorker` + Periodic Background Sync API where available; fall back to fetch-on-open with a "last synced" timestamp
- **Calendar integration**: Offer an "Export to .ics" button so students can add individual deadlines or all deadlines to their native calendar app
