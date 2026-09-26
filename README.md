# Estimathon

Host and play live Estimathon competitions. A host creates an estimathon
with a set of questions, gets a join code, and plays through the questions
one at a time; a live, Kahoot-style leaderboard updates after each reveal.
No accounts or passwords — everyone just picks a name.

## Stack

- Vite + React + TypeScript, Tailwind CSS
- Supabase (Postgres + Row Level Security + Realtime) for all app data
- Supabase **Anonymous Auth** for identity — no OAuth, no passwords. Each
  browser gets a stable, invisible session so the host and each player
  have a real `auth.uid()` to own their estimathon / entry, while the only
  thing anyone types is a display name.
- Deployed as a static site via GitHub Pages + GitHub Actions

## Scoring

Scoring is modular — see `src/lib/scoring/`. Each strategy implements
`ScoringStrategy` (`evaluateGuess` + `aggregate`); swap the default by
adding a new file and registering it in `src/lib/scoring/index.ts`, then
selecting its `key` as an estimathon's `scoring_strategy`.

The default, **Jane Street's Estimathon rule**, is golf-style (lower is
better):

```
score = 2^(N − correct) × (10 + Σ ceil(high / low) over correct guesses)
```

where `N` is the number of questions revealed so far and a guess is
"correct" if the true answer falls inside `[low, high]`. Every wrong or
missing guess doubles your score; tighter correct ranges add less to the
sum inside the parentheses.

Because the formula only ever uses **revealed** questions' true answers
(which are public once revealed) and each player's own submitted guesses,
the whole leaderboard is computed client-side from data the database
already allows everyone in the estimathon to read — no server-side
scoring function is needed.

## Setup

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com). You'll need two
values from **Settings > API**:

| Key | Where it's used |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable API key (Supabase's newer name for the `anon` `public` key) |

Copy `.env.example` to `.env.local` and fill them in for local dev.

### 2. Enable Anonymous sign-ins

In the Supabase dashboard: **Authentication > Providers > Anonymous
Sign-ins** → enable. No credentials to configure — this is what lets
people join with just a name instead of an account.

### 3. Run the schema

Open **SQL Editor** in Supabase, paste in `supabase/schema.sql`, and run
it. This creates the tables, the `questions_public` view (hides answers
until reveal), all Row Level Security policies, and adds the realtime
tables to the `supabase_realtime` publication.

### 4. Run locally

```
npm install
npm run dev
```

### 5. Deploy to GitHub Pages

1. Push this repo to GitHub.
2. In **Settings > Pages**, set Source to "GitHub Actions".
3. In **Settings > Secrets and variables > Actions**, add repo secrets
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (same values as
   `.env.local`) — the deploy workflow (`.github/workflows/deploy.yml`)
   bakes them into the static build.
4. Push to `main`; the workflow builds and publishes `dist/` to Pages.

## Design

Dark/off-black background, red accent, white text. Headers use **Quantico**,
body text uses **Lexend** (both loaded from Google Fonts in `index.html`).

## Notes / things to know

- Identity lives in the browser's `localStorage` (Supabase's session
  storage). Clearing site data means starting over as a "new" person —
  fine for a live event, worth knowing if a host wants to come back to
  the same estimathon later on the same device.
- Display names must be unique per estimathon (case-insensitive), enforced
  by a unique index in `supabase/schema.sql`.
- Realtime updates leaderboard, question reveals, and player joins live via
  Supabase Realtime `postgres_changes` subscriptions.
