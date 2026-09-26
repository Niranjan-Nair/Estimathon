-- Estimathon database schema for Supabase (Postgres).
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
--
-- Identity: there is no OAuth. Everyone (hosts and players) gets a
-- Supabase Anonymous Auth session (enable "Anonymous sign-ins" under
-- Authentication > Providers in the Supabase dashboard -- no keys needed).
-- That gives each browser a stable auth.uid() to own an estimathon or a
-- participant row, while the only thing a person types is a display name.
--
-- Row Level Security: only `questions` has it enabled. It's the only table
-- holding anything that actually needs to stay secret (true_answer before
-- reveal) -- estimathons/participants/guesses have no sensitive data, so
-- RLS on them was pure friction with nothing to protect. Anyone with the
-- public API key can read/write those three tables freely; that's fine for
-- a join-code party game and avoids the class of RLS bugs that don't pay
-- for themselves here.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.estimathons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  host_id uuid not null references auth.users (id) on delete cascade,
  host_name text not null,
  join_code text not null unique,
  status text not null default 'draft' check (status in ('draft', 'active', 'finished')),
  current_question_index integer not null default -1,
  -- Selects which strategy the client uses to score guesses & aggregate the
  -- leaderboard (see src/lib/scoring). Purely a client-side computation over
  -- publicly-readable data (see questions_public below), so no SQL branch
  -- is required here to add a strategy -- just register it in the TS module.
  scoring_strategy text not null default 'jane_street',
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  estimathon_id uuid not null references public.estimathons (id) on delete cascade,
  order_index integer not null,
  prompt text not null,
  true_answer numeric not null,
  revealed boolean not null default false,
  revealed_at timestamptz,
  -- Optional unit suffix shown next to numbers for this question, e.g. "km", "people", "$".
  unit text,
  -- Optional alternate guessing mode: a guess is two integer powers of ten
  -- (stored in guesses.low/high as 10^exponent -- see src/lib/scoring) and
  -- is correct if the true answer's order of magnitude falls in that range,
  -- rather than the true answer itself falling in a raw numeric range.
  use_magnitude boolean not null default false,
  unique (estimathon_id, order_index)
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  estimathon_id uuid not null references public.estimathons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  created_at timestamptz not null default now(),
  unique (estimathon_id, user_id)
);

-- Names must be unique within one estimathon (case-insensitive), like a
-- Kahoot lobby.
create unique index if not exists participants_estimathon_name_uniq
  on public.participants (estimathon_id, lower(display_name));

create table if not exists public.guesses (
  id uuid primary key default gen_random_uuid(),
  estimathon_id uuid not null references public.estimathons (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  low numeric not null,
  high numeric not null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, participant_id)
);

-- Public view of questions that never exposes true_answer before reveal.
-- Views run with their owner's privileges, so this reads the base table
-- (host-only via RLS below) even though it's granted to every player.
-- New columns must be appended after true_answer (not before): Postgres
-- refuses `create or replace view` if it would rename/reorder an existing
-- output column, so unit/use_magnitude go at the end.
create or replace view public.questions_public as
  select
    id, estimathon_id, order_index, prompt, revealed, revealed_at,
    case when revealed then true_answer else null end as true_answer,
    unit, use_magnitude
  from public.questions;

grant select on public.questions_public to authenticated;

-- estimathons/participants/guesses: no RLS -- see note at the top of this
-- file. Grant full CRUD to authenticated sessions explicitly (Supabase's
-- default template grants usually already cover this, but be explicit).
grant select, insert, update, delete on public.estimathons to authenticated;
grant select, insert, update, delete on public.participants to authenticated;
grant select, insert, update, delete on public.guesses to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security (questions only -- true_answer must stay hidden until
-- the host reveals it; everything else is unrestricted, see note above)
-- ---------------------------------------------------------------------------

alter table public.questions enable row level security;

create policy "questions: host read" on public.questions
  for select using (
    exists (select 1 from public.estimathons e where e.id = estimathon_id and e.host_id = auth.uid())
  );
create policy "questions: host insert" on public.questions
  for insert with check (
    exists (select 1 from public.estimathons e where e.id = estimathon_id and e.host_id = auth.uid())
  );
create policy "questions: host update" on public.questions
  for update using (
    exists (select 1 from public.estimathons e where e.id = estimathon_id and e.host_id = auth.uid())
  );
create policy "questions: host delete" on public.questions
  for delete using (
    exists (select 1 from public.estimathons e where e.id = estimathon_id and e.host_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.questions;
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.guesses;
