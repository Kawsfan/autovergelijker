-- Carkijker -- accounts-laag (favorieten + zoekagenten synchroniseren)
--
-- Uitvoeren in de Supabase SQL Editor (project -> SQL Editor -> New query),
-- eenmalig, na het aanmaken van het project. Auth (gebruikers, magic-link
-- e-mails, sessies) regelt Supabase zelf via het ingebouwde `auth.users` --
-- daar hoeven we hier niets voor aan te maken.
--
-- Row Level Security staat op alle tabellen aan: een gebruiker kan met de
-- publieke anon-key nooit bij de rijen van een andere gebruiker, ook niet
-- per ongeluk vanuit de frontend-code. Dat wordt door Postgres zelf
-- afgedwongen, niet door de JS-code op de site.

create extension if not exists "pgcrypto";

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

alter table public.favorites enable row level security;

create policy "favorites_select_own" on public.favorites
  for select using (auth.uid() = user_id);
create policy "favorites_insert_own" on public.favorites
  for insert with check (auth.uid() = user_id);
create policy "favorites_delete_own" on public.favorites
  for delete using (auth.uid() = user_id);

create table if not exists public.zoekagenten (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  merk text,
  q text,
  min_prijs integer,
  max_prijs integer,
  gezien_ids jsonb not null default '[]'::jsonb,
  opgeslagen_op date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.zoekagenten enable row level security;

create policy "zoekagenten_select_own" on public.zoekagenten
  for select using (auth.uid() = user_id);
create policy "zoekagenten_insert_own" on public.zoekagenten
  for insert with check (auth.uid() = user_id);
create policy "zoekagenten_update_own" on public.zoekagenten
  for update using (auth.uid() = user_id);
create policy "zoekagenten_delete_own" on public.zoekagenten
  for delete using (auth.uid() = user_id);

-- Index voor de veelgebruikte "haal alle favorieten/agenten van deze
-- gebruiker op"-query.
create index if not exists favorites_user_id_idx on public.favorites(user_id);
create index if not exists zoekagenten_user_id_idx on public.zoekagenten(user_id);
