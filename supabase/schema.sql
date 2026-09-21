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
-- _syncFavorieten() in index.html doet een upsert(..., {onConflict:'user_id,listing_id'})
-- bij elke login -- zodra een favoriet die al bestond opnieuw wordt geüpload, valt
-- Postgres terug op het "ON CONFLICT DO UPDATE"-pad, en dat wordt getoetst aan de
-- UPDATE-policy (niet de INSERT-policy). Zonder deze policy blokkeert RLS dat
-- pad standaard (42501 permission denied -> PostgREST 403) -- live ontdekt op
-- 20 sep via de client_errors-tabel/console: elke terugkerende ingelogde
-- bezoeker met minstens 1 bestaande favoriet kreeg dit bij iedere paginaload.
create policy "favorites_update_own" on public.favorites
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
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

-- Browser-pushabonnementen (Web Push/VAPID) -- slaat op wat de browser bij
-- PushManager.subscribe() teruggeeft (endpoint + p256dh/auth-sleutels), zodat
-- scripts/send-notifications.js buiten een browsersessie om een melding kan
-- sturen zodra er een prijsdaling op een favoriet of een nieuwe zoekagent-
-- match is. Zie lib/webpush.js voor de dependency-vrije Web Push-encryptie.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
-- Zelfde reden als favorites_update_own hierboven: index.html doet een
-- upsert(..., {onConflict:'user_id,endpoint'}) zodat opnieuw inschakelen op
-- hetzelfde apparaat geen duplicaatrij aanmaakt -- dat raakt bij een
-- bestaand abonnement het UPDATE-pad, niet INSERT.
create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- Index voor de veelgebruikte "haal alle favorieten/agenten/abonnementen van
-- deze gebruiker op"-query.
create index if not exists favorites_user_id_idx on public.favorites(user_id);
create index if not exists zoekagenten_user_id_idx on public.zoekagenten(user_id);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- Client-side foutmonitoring: index.html stuurt onafgevangen JS-fouten en
-- unhandled promise rejections hierheen (rechtstreekse REST-call, los van
-- de Supabase-SDK -- zie het foutmonitoring-blok bovenaan index.html), zodat
-- fouten bij echte bezoekers niet langer onopgemerkt blijven (kritiek
-- rapport-punt: er was helemaal geen client-side foutlogging).
--
-- Write-only vanaf de frontend: elke bezoeker (ingelogd of niet) mag een
-- rij toevoegen, maar niemand kan via de publieke anon-key ooit een rij
-- lezen, wijzigen of verwijderen -- dat kan alleen via de Supabase SQL
-- Editor (die RLS met de service-role omzeilt). Bewust geen user_id-kolom:
-- de lichtgewicht logger draait vóór de Supabase-SDK laadt en heeft dus
-- geen sessie beschikbaar; message/stack/url/user-agent is voor triage
-- doorgaans al genoeg context.
--
-- Onbegrensde groei is hier bewust geaccepteerd voor nu (foutregels zijn
-- een paar honderd bytes, en het volume van échte fouten hoort laag te
-- zijn) -- mocht dit ooit substantieel worden, ruim dan periodiek op met
-- bv. "delete from public.client_errors where created_at < now() - interval '90 days'".
create table if not exists public.client_errors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  message text not null,
  stack text,
  filename text,
  lineno integer,
  colno integer,
  page_url text,
  user_agent text
);

alter table public.client_errors enable row level security;

create policy "client_errors_insert_any" on public.client_errors
  for insert to anon, authenticated with check (true);

create index if not exists client_errors_created_at_idx on public.client_errors(created_at desc);
