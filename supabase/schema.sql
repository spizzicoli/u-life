-- ============================================================
-- SCHEMA "Il mio taccuino" per Supabase (Postgres) — versione semplice
-- ============================================================
-- Come usarlo:
-- 1. Crea un progetto gratuito su https://supabase.com
-- 2. Vai su "SQL Editor" nel pannello del progetto → New query
-- 3. Incolla tutto questo file e premi "Run"
-- ============================================================
-- Perché una sola tabella e non tante tabelle separate?
-- L'app che già usi sul PC tiene tutti i tuoi dati in un unico blocco
-- (un file JSON). Per portarla su Supabase "tutto insieme" senza
-- rischiare di rompere qualcosa, teniamo la stessa identica struttura:
-- una riga per utente, con dentro tutti i suoi dati in formato JSON.
-- Più avanti, se vorrai, si può passare a tabelle separate per fare
-- analisi/statistiche più sofisticate lato database — non è necessario
-- per il funzionamento dell'app.
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table app_state enable row level security;

drop policy if exists "select_own" on app_state;
create policy "select_own" on app_state for select using (auth.uid() = user_id);

drop policy if exists "insert_own" on app_state;
create policy "insert_own" on app_state for insert with check (auth.uid() = user_id);

drop policy if exists "update_own" on app_state;
create policy "update_own" on app_state for update using (auth.uid() = user_id);

drop policy if exists "delete_own" on app_state;
create policy "delete_own" on app_state for delete using (auth.uid() = user_id);

-- Aggiorna automaticamente "updated_at" ad ogni salvataggio
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on app_state;
create trigger set_updated_at
  before update on app_state
  for each row execute procedure public.touch_updated_at();

-- Crea automaticamente una riga vuota quando qualcuno si registra,
-- con la stessa struttura di dati "vuota" che usa la versione sul PC.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.app_state (user_id, data) values (
    new.id,
    '{
      "health": [], "homeInfo": {"street":"","city":"","cap":"","note":""},
      "bills": [], "homeTasks": [], "installments": [],
      "expenses": [], "cars": [], "carEvents": [], "events": [],
      "homeDocuments": [], "personalDocs": [], "contacts": [],
      "medicines": [], "seasonalTasks": [], "assets": [], "profiles": [],
      "wellness": {"routines": [], "notificationsAsked": false},
      "trash": [], "activityLog": [],
      "settings": {
        "reminderDaysAhead": 3, "theme": "light",
        "budgets": {}, "onboardingDone": false,
        "lastBriefingShown": "", "ownerName": "", "reminderEmail": ""
      }
    }'::jsonb
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Spazio di archiviazione per foto/PDF allegati (al posto del base64 nel JSON)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

drop policy if exists "attachments_select_own" on storage.objects;
create policy "attachments_select_own" on storage.objects for select
  using (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "attachments_insert_own" on storage.objects;
create policy "attachments_insert_own" on storage.objects for insert
  with check (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "attachments_delete_own" on storage.objects;
create policy "attachments_delete_own" on storage.objects for delete
  using (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);
