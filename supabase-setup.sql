-- =====================================================================
--  Portfolio analytics — run this once in Supabase → SQL Editor → New query
--  Visitors can only INSERT events; only the admin account can READ them.
-- =====================================================================

create table if not exists public.events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  visitor_id  text not null check (char_length(visitor_id) <= 64),
  session_id  text not null check (char_length(session_id) <= 64),
  type        text not null check (type in ('pageview','mode','lang','section_view','beat_play','video_open','site_preview','contact_click')),
  label       text check (char_length(label) <= 200),
  mode        text check (mode in ('dev','producer')),
  lang        text check (char_length(lang) <= 8),
  path        text check (char_length(path) <= 300),
  referrer    text check (char_length(referrer) <= 500),
  device      text check (device in ('mobile','tablet','desktop')),
  browser     text check (char_length(browser) <= 40),
  os          text check (char_length(os) <= 40),
  screen      text check (char_length(screen) <= 20),
  timezone    text check (char_length(timezone) <= 64),
  country     text check (char_length(country) <= 64)
);

create index if not exists events_created_at_idx on public.events (created_at desc);

alter table public.events enable row level security;

-- anyone visiting the site may add an event (nothing else)
drop policy if exists "visitors can add events" on public.events;
create policy "visitors can add events"
  on public.events for insert
  to anon, authenticated
  with check (true);

-- only the admin account can read the events
-- (change the email if you log into admin.html with another address)
drop policy if exists "admin can read events" on public.events;
create policy "admin can read events"
  on public.events for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'elmouradiiayoub@gmail.com');

-- optional: let the admin delete old rows from the SQL editor or the dashboard
drop policy if exists "admin can delete events" on public.events;
create policy "admin can delete events"
  on public.events for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'elmouradiiayoub@gmail.com');
