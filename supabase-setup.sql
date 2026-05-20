-- Supabase → SQL Editor → New query → Run

-- Add role column to existing table:
alter table public.messages
  add column if not exists role text default 'user';

update public.messages
  set role = case when username = 'Коуч' then 'bot' else 'user' end
  where role is null;

alter table public.messages enable row level security;

drop policy if exists "Anyone can read messages" on public.messages;
create policy "Anyone can read messages"
  on public.messages for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can insert messages" on public.messages;
create policy "Anyone can insert messages"
  on public.messages for insert
  to anon, authenticated
  with check (true);
