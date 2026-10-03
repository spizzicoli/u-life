-- Run this migration in Supabase SQL Editor before using notes and car reminders.
alter table public.cars
  add column if not exists next_service_date date,
  add column if not exists insurance_company text,
  add column if not exists insurance_policy text,
  add column if not exists insurance_expiry date,
  add column if not exists road_tax_due date,
  add column if not exists car_note text;

alter table public.events
  add column if not exists end_date date;

create table if not exists public.notes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text default '',
  list_type text not null default 'text',
  items jsonb not null default '[]'::jsonb,
  selected_item text default '',
  created_at date default current_date,
  updated_at date default current_date
);

alter table public.notes enable row level security;
drop policy if exists "select_own" on public.notes;
create policy "select_own" on public.notes for select using (auth.uid() = user_id);
drop policy if exists "insert_own" on public.notes;
create policy "insert_own" on public.notes for insert with check (auth.uid() = user_id);
drop policy if exists "update_own" on public.notes;
create policy "update_own" on public.notes for update using (auth.uid() = user_id);
drop policy if exists "delete_own" on public.notes;
create policy "delete_own" on public.notes for delete using (auth.uid() = user_id);
