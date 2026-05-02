-- Birdguard couple matching schema
-- Run this once in Supabase SQL Editor (Dashboard → SQL → New query → Run).
-- Re-running is safe: each block uses IF NOT EXISTS / OR REPLACE.

-- ---------- Tables ----------

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  joined_at timestamptz not null default now(),
  unique (couple_id, user_id),
  unique (user_id) -- a user belongs to at most one couple
);

create index if not exists idx_couple_members_couple_id on public.couple_members(couple_id);
create index if not exists idx_couples_invite_code on public.couples(invite_code);

-- ---------- RLS ----------

alter table public.couples enable row level security;
alter table public.couple_members enable row level security;

-- Couples: a user can read couples they belong to (used by getMyCouple).
drop policy if exists "members can read their couple" on public.couples;
create policy "members can read their couple"
  on public.couples for select
  to authenticated
  using (
    id in (select couple_id from public.couple_members where user_id = auth.uid())
  );

-- Couple members: read members of a couple you belong to.
drop policy if exists "members can read peers" on public.couple_members;
create policy "members can read peers"
  on public.couple_members for select
  to authenticated
  using (
    couple_id in (select couple_id from public.couple_members where user_id = auth.uid())
  );

-- Insert/delete are funneled through SECURITY DEFINER RPCs below; no direct policies.

-- ---------- RPC: create_couple_invite ----------

create or replace function public.create_couple_invite(p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_couple_id uuid;
  v_attempt int := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from public.couple_members where user_id = v_user_id) then
    raise exception '이미 커플에 연결되어 있어요.';
  end if;

  -- Generate a unique 6-char code (max 10 attempts)
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, (random() * length(v_chars))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.couples where invite_code = v_code);
    v_attempt := v_attempt + 1;
    if v_attempt > 10 then
      raise exception '코드 생성에 실패했어요. 잠시 후 다시 시도해 주세요.';
    end if;
  end loop;

  insert into public.couples (invite_code, created_by)
  values (v_code, v_user_id)
  returning id into v_couple_id;

  insert into public.couple_members (couple_id, user_id, username)
  values (v_couple_id, v_user_id, p_username);
end;
$$;

grant execute on function public.create_couple_invite(text) to authenticated;

-- ---------- RPC: join_couple_by_code ----------

create or replace function public.join_couple_by_code(p_code text, p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_member_count int;
  v_creator uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from public.couple_members where user_id = v_user_id) then
    raise exception '이미 커플에 연결되어 있어요.';
  end if;

  select id, created_by into v_couple_id, v_creator
  from public.couples
  where invite_code = upper(p_code)
  limit 1;

  if v_couple_id is null then
    raise exception '유효하지 않은 코드예요.';
  end if;

  if v_creator = v_user_id then
    raise exception '자기 자신의 코드는 입력할 수 없어요.';
  end if;

  select count(*) into v_member_count
  from public.couple_members
  where couple_id = v_couple_id;

  if v_member_count >= 2 then
    raise exception '이미 사용된 코드예요.';
  end if;

  insert into public.couple_members (couple_id, user_id, username)
  values (v_couple_id, v_user_id, p_username);
end;
$$;

grant execute on function public.join_couple_by_code(text, text) to authenticated;

-- ---------- RPC: disconnect_couple ----------

create or replace function public.disconnect_couple()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_remaining int;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select couple_id into v_couple_id
  from public.couple_members
  where user_id = v_user_id;
  if v_couple_id is null then
    return;
  end if;

  delete from public.couple_members
  where user_id = v_user_id;

  -- If no members remain, drop the couple too.
  select count(*) into v_remaining
  from public.couple_members
  where couple_id = v_couple_id;
  if v_remaining = 0 then
    delete from public.couples where id = v_couple_id;
  end if;
end;
$$;

grant execute on function public.disconnect_couple() to authenticated;
