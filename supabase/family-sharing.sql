-- Condivisione del taccuino tra familiari.
-- Eseguire questo file nel Supabase SQL Editor dopo schema-normalized.sql.

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'La mia famiglia',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz default now(),
  primary key (family_id, user_id)
);

create table if not exists public.family_invites (
  code text primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;

drop policy if exists family_select_member on public.families;
create policy family_select_member on public.families for select using (
  exists (select 1 from public.family_members m where m.family_id = families.id and m.user_id = auth.uid())
);
drop policy if exists family_insert_owner on public.families;
create policy family_insert_owner on public.families for insert with check (created_by = auth.uid());

drop policy if exists family_members_select on public.family_members;
create policy family_members_select on public.family_members for select using (
  user_id = auth.uid()
);

-- Gli inviti sono leggibili solo da chi li ha creati; l'ingresso passa dalla funzione sicura.
drop policy if exists family_invites_owner on public.family_invites;
create policy family_invites_owner on public.family_invites for all using (created_by = auth.uid()) with check (created_by = auth.uid());

create or replace function public.create_family(p_name text default 'La mia famiglia')
returns uuid language plpgsql security definer set search_path = public as $$
declare family_id uuid;
begin
  select m.family_id into family_id from family_members m where m.user_id = auth.uid() limit 1;
  if family_id is not null then return family_id; end if;
  insert into families(name, created_by) values (coalesce(nullif(trim(p_name), ''), 'La mia famiglia'), auth.uid()) returning id into family_id;
  insert into family_members(family_id, user_id, role) values (family_id, auth.uid(), 'owner');
  return family_id;
end;
$$;

grant execute on function public.create_family(text) to authenticated;

create or replace function public.create_family_invite()
returns table(code text, expires_at timestamptz) language plpgsql security definer set search_path = public as $$
declare family_id uuid; invite_code text;
begin
  select m.family_id into family_id from family_members m where m.user_id = auth.uid() limit 1;
  if family_id is null then family_id := public.create_family(); end if;
  invite_code := upper(substr(encode(gen_random_bytes(12), 'hex'), 1, 12));
  insert into family_invites(code, family_id, created_by, expires_at)
  values (invite_code, family_id, auth.uid(), now() + interval '24 hours');
  return query select invite_code, now() + interval '24 hours';
end;
$$;

grant execute on function public.create_family_invite() to authenticated;

create or replace function public.join_family(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare family_id uuid;
begin
  select i.family_id into family_id from family_invites i where i.code = upper(trim(p_code)) and i.expires_at > now();
  if family_id is null then raise exception 'Invito non valido o scaduto'; end if;
  insert into family_members(family_id, user_id, role) values (family_id, auth.uid(), 'member') on conflict do nothing;
  return family_id;
end;
$$;

grant execute on function public.join_family(text) to authenticated;

create or replace function public.get_family_user_ids()
returns table(user_id uuid) language sql security definer set search_path = public as $$
  select distinct member.user_id
  from family_members mine
  join family_members member on member.family_id = mine.family_id
  where mine.user_id = auth.uid()
  union
  select auth.uid();
$$;

grant execute on function public.get_family_user_ids() to authenticated;

-- Dopo l'ingresso di un familiare, le righe del taccuino diventano condivise tra i membri.
do $$
declare t text;
begin
  for t in select unnest(array['health','medicines','bills','home_tasks','installments','home_documents','seasonal_tasks','expenses','assets','cars','car_events','events','personal_docs','contacts','wellness_routines','trash','activity_log'])
  loop
    execute format('drop policy if exists select_own on %I;', t);
    execute format('drop policy if exists insert_own on %I;', t);
    execute format('drop policy if exists update_own on %I;', t);
    execute format('drop policy if exists delete_own on %I;', t);
    execute format('create policy select_family on %I for select using (user_id in (select user_id from public.get_family_user_ids()));', t);
    execute format('create policy insert_family on %I for insert with check (user_id = auth.uid());', t);
    execute format('create policy update_family on %I for update using (user_id in (select user_id from public.get_family_user_ids()));', t);
    execute format('create policy delete_family on %I for delete using (user_id in (select user_id from public.get_family_user_ids()));', t);
  end loop;
end $$;
