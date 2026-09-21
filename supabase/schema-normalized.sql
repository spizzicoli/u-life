-- ============================================================
-- SCHEMA NORMALIZZATO "IU-Life" — Fase 2 (opzionale)
-- ============================================================
-- ATTENZIONE: questo è un secondo schema, alternativo a quello che
-- già usi e funziona (supabase/schema.sql, tabella unica "app_state").
-- Eseguendo questo file NON perdi i dati che hai già: crea tabelle
-- nuove e separate, non tocca "app_state".
--
-- Però l'app in questo momento parla ancora con "app_state": collegare
-- davvero queste tabelle nuove richiede riscrivere le funzioni di
-- salvataggio/lettura in app.js (una per ogni sezione, circa 40 punti).
-- È un lavoro sostanzioso: te lo preparo qui come base pronta, poi
-- dimmi se vuoi che proceda anche con quella migrazione del codice,
-- così evitiamo di toccare qualcosa che oggi funziona senza conferma.
--
-- Vantaggi di queste tabelle separate rispetto al blocco unico:
-- - puoi fare query dirette (es. "somma spese di marzo per categoria")
-- - più efficiente quando i dati crescono molto
-- - più facile collegare dashboard/statistiche esterne in futuro
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Impostazioni personali (una riga per utente) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  owner_name text default '',
  theme text default 'light',
  reminder_days_ahead int default 3,
  auto_lock_minutes int default 10,
  pin text default '',
  pin_enabled boolean default false,
  budgets jsonb default '{}'::jsonb,
  onboarding_done boolean default false,
  reminder_email text default '',
  last_briefing_shown date,
  home_street text default '',
  home_city text default '',
  home_cap text default '',
  home_note text default '',
  created_at timestamptz default now()
);

-- ---------- Salute ----------
create table if not exists health (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  cat text,                    -- ambito (Infortunio, Vista, Cardiologia, ...)
  title text,
  date date,
  next_date date,
  description text,
  med text,                    -- medicinale/cura usata
  cost numeric,
  recur_months int,            -- ripetizione automatica (es. controllo annuale)
  tags text[] default '{}',
  files jsonb default '[]'::jsonb,   -- [{name, path}] su Supabase Storage
  created_at timestamptz default now()
);

create table if not exists medicines (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  expiry_date date,
  note text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- ---------- Casa ----------
create table if not exists bills (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text, frequency text, amount numeric, method text, next_due date,
  created_at timestamptz default now()
);

create table if not exists home_tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text, status text, priority text, note text, cost numeric,
  tags text[] default '{}', archived boolean default false,
  created_at timestamptz default now()
);

create table if not exists installments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text, total_amount numeric, installment_amount numeric,
  total_count int, paid_count int default 0, next_due date, frequency text,
  created_at timestamptz default now()
);

create table if not exists home_documents (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text, category text, note text,
  tags text[] default '{}', files jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists seasonal_tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text, month int, note text, last_done_year int,
  created_at timestamptz default now()
);

-- ---------- Salvadanaio ----------
create table if not exists expenses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_key text,   -- collega la spesa alla voce che l'ha generata (es. "health-<id>")
  title text, amount numeric, date date, category text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists assets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text, purchase_price numeric, purchase_date date, note text,
  created_at timestamptz default now()
);

-- ---------- Auto ----------
create table if not exists cars (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text, plate text, model text, year int, km numeric, start_km numeric,
  last_service_km numeric, service_interval_km numeric, archived boolean default false,
  created_at timestamptz default now()
);

create table if not exists car_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  car_id text references cars(id) on delete cascade,
  type text, date date, note text, cost numeric, tags text[] default '{}',
  created_at timestamptz default now()
);

-- ---------- Calendario ----------
create table if not exists events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text, date date, time text, note text,
  recur text default 'none',       -- none | monthly | yearly
  category text default 'Altro',   -- Salute | Lavoro | Famiglia | Sport | Altro
  linked_from text,                -- non nullo se l'evento è generato automaticamente da un'altra sezione
  created_at timestamptz default now()
);

-- ---------- Amministrazione ----------
create table if not exists personal_docs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text, title text, number text, expiry_date date, note text,
  tags text[] default '{}', files jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists contacts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text, category text, phone text, note text,
  created_at timestamptz default now()
);

-- ---------- Benessere ----------
create table if not exists wellness_routines (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text, label text,
  schedule_type text,             -- interval | daily
  interval_minutes int, active_start text, active_end text,   -- per schedule_type = interval
  time text,                                                   -- per schedule_type = daily
  enabled boolean default true, color text,
  last_fired_at timestamptz, last_fired_date date,
  done_dates date[] default '{}',
  created_at timestamptz default now()
);

-- ---------- Cestino e registro attività ----------
create table if not exists trash (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text, data jsonb, label text, deleted_at date default current_date,
  created_at timestamptz default now()
);

create table if not exists activity_log (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ts timestamptz default now(),
  action text, type text, label text
);

-- ============================================================
-- ROW LEVEL SECURITY: ognuno vede e modifica solo le proprie righe
-- ============================================================
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'profiles','health','medicines','bills','home_tasks','installments',
    'home_documents','seasonal_tasks','expenses','assets','cars','car_events',
    'events','personal_docs','contacts','wellness_routines','trash','activity_log'
  ])
  loop
    execute format('alter table %I enable row level security;', t);
    if t = 'profiles' then
      execute format('drop policy if exists "select_own" on %I;', t);
      execute format('create policy "select_own" on %I for select using (auth.uid() = id);', t);
      execute format('drop policy if exists "insert_own" on %I;', t);
      execute format('create policy "insert_own" on %I for insert with check (auth.uid() = id);', t);
      execute format('drop policy if exists "update_own" on %I;', t);
      execute format('create policy "update_own" on %I for update using (auth.uid() = id);', t);
      execute format('drop policy if exists "delete_own" on %I;', t);
      execute format('create policy "delete_own" on %I for delete using (auth.uid() = id);', t);
    else
      execute format('drop policy if exists "select_own" on %I;', t);
      execute format('create policy "select_own" on %I for select using (auth.uid() = user_id);', t);
      execute format('drop policy if exists "insert_own" on %I;', t);
      execute format('create policy "insert_own" on %I for insert with check (auth.uid() = user_id);', t);
      execute format('drop policy if exists "update_own" on %I;', t);
      execute format('create policy "update_own" on %I for update using (auth.uid() = user_id);', t);
      execute format('drop policy if exists "delete_own" on %I;', t);
      execute format('create policy "delete_own" on %I for delete using (auth.uid() = user_id);', t);
    end if;
  end loop;
end $$;

-- Crea automaticamente una riga "profiles" quando qualcuno si registra
create or replace function public.handle_new_user_v2()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_v2 on auth.users;
create trigger on_auth_user_created_v2
  after insert on auth.users
  for each row execute procedure public.handle_new_user_v2();

-- Backfill: se ti eri già registrato prima di eseguire questo schema, questa riga
-- crea comunque il tuo profilo (il trigger sopra scatta solo per le NUOVE registrazioni).
insert into public.profiles (id)
select id from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;

-- ============================================================
-- Indici utili per le query più comuni
-- ============================================================
create index if not exists idx_expenses_user_date on expenses(user_id, date);
create index if not exists idx_events_user_date on events(user_id, date);
create index if not exists idx_health_user_date on health(user_id, date);
create index if not exists idx_car_events_car on car_events(car_id);
