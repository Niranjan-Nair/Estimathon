-- Estimathon database schema for Supabase (Postgres).
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
--
-- Identity: there is no OAuth. Everyone (hosts and players) gets a
-- Supabase Anonymous Auth session (enable "Anonymous sign-ins" under
-- Authentication > Providers in the Supabase dashboard -- no keys needed).
-- That gives each browser a stable auth.uid() to own an estimathon or a
-- participant row, while the only thing a person types is a display name.

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
create or replace view public.questions_public as
  select
    id, estimathon_id, order_index, prompt, revealed, revealed_at,
    case when revealed then true_answer else null end as true_answer
  from public.questions;

grant select on public.questions_public to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.estimathons enable row level security;
alter table public.questions enable row level security;
alter table public.participants enable row level security;
alter table public.guesses enable row level security;

-- estimathons: any signed-in (anonymous) session can look one up by code;
-- only the host can create/modify their own.
create policy "estimathons: read all" on public.estimathons
  for select using (auth.uid() is not null);
create policy "estimathons: insert own" on public.estimathons
  for insert with check (host_id = auth.uid());
create policy "estimathons: update own" on public.estimathons
  for update using (host_id = auth.uid());

-- questions (base table): host-only. Everyone else must use questions_public.
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

-- A policy on `participants` can't query `participants` directly in its own
-- USING clause -- Postgres re-evaluates the same policy for that subquery,
-- forever (error 42P17, infinite recursion). This SECURITY DEFINER function
-- runs as its owner, which bypasses RLS on the table it owns, so it reads
-- participants once instead of recursively re-triggering the policy below.
create or replace function public.is_estimathon_participant(p_estimathon_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.participants p
    where p.estimathon_id = p_estimathon_id and p.user_id = auth.uid()
  );
$$;

grant execute on function public.is_estimathon_participant(uuid) to authenticated;

-- participants: visible to other participants and the host of the same
-- estimathon (needed for the leaderboard); a session adds itself once.
create policy "participants: members read" on public.participants
  for select using (
    public.is_estimathon_participant(estimathon_id)
    or exists (
      select 1 from public.estimathons e
      where e.id = participants.estimathon_id and e.host_id = auth.uid()
    )
  );
create policy "participants: insert self" on public.participants
  for insert with check (user_id = auth.uid());

-- guesses: you can always read your own; the host can always read all of
-- theirs (moderation); everyone else in the estimathon can only see a
-- question's guesses once that question is revealed, so nobody can peek at
-- rivals' ranges during a live round.
create policy "guesses: read own, host, or revealed" on public.guesses
  for select using (
    exists (select 1 from public.participants p where p.id = participant_id and p.user_id = auth.uid())
    or exists (select 1 from public.estimathons e where e.id = estimathon_id and e.host_id = auth.uid())
    or (
      exists (select 1 from public.questions q where q.id = question_id and q.revealed = true)
      and exists (
        select 1 from public.participants p2
        where p2.estimathon_id = guesses.estimathon_id and p2.user_id = auth.uid()
      )
    )
  );

create policy "guesses: insert own" on public.guesses
  for insert with check (
    exists (select 1 from public.participants p where p.id = participant_id and p.user_id = auth.uid())
    and exists (
      select 1 from public.questions q
      join public.estimathons e on e.id = q.estimathon_id
      where q.id = question_id
        and q.revealed = false
        and q.order_index = e.current_question_index
    )
  );

create policy "guesses: update own before reveal" on public.guesses
  for update using (
    exists (select 1 from public.participants p where p.id = participant_id and p.user_id = auth.uid())
    and exists (select 1 from public.questions q where q.id = question_id and q.revealed = false)
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.questions;
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.guesses;
