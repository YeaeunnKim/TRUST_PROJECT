-- 잠자기 모드 + 돌맹이 던지기 + 신뢰도 점수
--
-- user_status: 사용자별 잠자기 모드 + 마지막 활동 시각 + 트러스트 스코어
-- pebble_events: 돌 던진 기록 (스냅샷 포함)
-- throw_pebble RPC: 던졌을 때 판정 + 점수 갱신을 원자적으로 처리

-- ---------- user_status ----------

create table if not exists public.user_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sleep_mode boolean not null default false,
  last_active_at timestamptz,
  trust_score integer not null default 100,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_user_status_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_user_status_touch on public.user_status;
create trigger trg_user_status_touch
  before update on public.user_status
  for each row execute function public.touch_user_status_updated_at();

alter table public.user_status enable row level security;

drop policy if exists "users read own status" on public.user_status;
create policy "users read own status" on public.user_status
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "users insert own status" on public.user_status;
create policy "users insert own status" on public.user_status
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "users update own status" on public.user_status;
create policy "users update own status" on public.user_status
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "couple peers read status" on public.user_status;
create policy "couple peers read status" on public.user_status
  for select to authenticated using (
    user_id in (
      select cm.user_id from public.couple_members cm
      where cm.couple_id = public.current_user_couple_id()
    )
  );

-- ---------- pebble_events ----------

create table if not exists public.pebble_events (
  id uuid primary key default gen_random_uuid(),
  thrower_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  outcome text not null check (outcome in ('bounced', 'hit', 'no_op')),
  target_sleep_mode boolean not null,
  target_active_recently boolean not null,
  trust_change integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_pebble_events_target on public.pebble_events(target_id, created_at desc);
create index if not exists idx_pebble_events_thrower on public.pebble_events(thrower_id, created_at desc);

alter table public.pebble_events enable row level security;

-- 자기가 보낸 / 받은 이벤트 모두 읽기 가능
drop policy if exists "read own pebble events" on public.pebble_events;
create policy "read own pebble events" on public.pebble_events
  for select to authenticated using (
    auth.uid() = thrower_id or auth.uid() = target_id
  );

-- INSERT는 RPC만 (직접 insert 막힘)

-- ---------- throw_pebble RPC ----------

create or replace function public.throw_pebble(p_target_user_id uuid)
returns table (
  outcome text,
  target_sleep_mode boolean,
  target_active_recently boolean,
  trust_change integer,
  target_trust_score integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_target_in_couple boolean;
  v_sleep_mode boolean;
  v_last_active timestamptz;
  v_active_recently boolean;
  v_outcome text;
  v_trust_change integer := 0;
  v_new_score integer;
  -- 90초 이내에 활동했으면 "최근 활동"으로 간주
  c_active_window_secs constant integer := 90;
  -- hit 시 신뢰도 차감
  c_hit_penalty constant integer := 5;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if v_user_id = p_target_user_id then
    raise exception '자기 자신에게는 돌을 던질 수 없어요.';
  end if;

  -- 같은 커플인지 확인
  select couple_id into v_couple_id
  from public.couple_members
  where user_id = v_user_id;
  if v_couple_id is null then
    raise exception '먼저 커플을 연결해주세요.';
  end if;
  select exists (
    select 1 from public.couple_members
    where couple_id = v_couple_id and user_id = p_target_user_id
  ) into v_target_in_couple;
  if not v_target_in_couple then
    raise exception '같은 커플에 속한 상대에게만 돌을 던질 수 있어요.';
  end if;

  -- 상대 상태 조회 (없으면 기본값으로 간주)
  select coalesce(us.sleep_mode, false), us.last_active_at
  into v_sleep_mode, v_last_active
  from auth.users u
  left join public.user_status us on us.user_id = u.id
  where u.id = p_target_user_id;

  v_active_recently :=
    v_last_active is not null
    and v_last_active > now() - make_interval(secs => c_active_window_secs);

  -- 판정
  if v_sleep_mode and v_active_recently then
    -- 잠자기 모드 켜놓고 앱 활동 중 → 명중, 점수 차감
    v_outcome := 'hit';
    v_trust_change := -c_hit_penalty;
  elsif v_sleep_mode and not v_active_recently then
    -- 정말 자는 중 → 튕겨냄
    v_outcome := 'bounced';
    v_trust_change := 0;
  else
    -- 잠자기 모드 OFF: 일반 알림 (점수 변동 없음)
    v_outcome := 'no_op';
    v_trust_change := 0;
  end if;

  -- user_status가 없으면 생성, trust_score 갱신
  insert into public.user_status (user_id, trust_score)
  values (p_target_user_id, 100)
  on conflict (user_id) do nothing;

  if v_trust_change <> 0 then
    update public.user_status
    set trust_score = greatest(0, least(100, trust_score + v_trust_change))
    where user_id = p_target_user_id
    returning trust_score into v_new_score;
  else
    select trust_score into v_new_score
    from public.user_status where user_id = p_target_user_id;
  end if;

  -- 이벤트 로그
  insert into public.pebble_events (
    thrower_id, target_id, outcome,
    target_sleep_mode, target_active_recently, trust_change
  ) values (
    v_user_id, p_target_user_id, v_outcome,
    v_sleep_mode, v_active_recently, v_trust_change
  );

  outcome := v_outcome;
  target_sleep_mode := v_sleep_mode;
  target_active_recently := v_active_recently;
  trust_change := v_trust_change;
  target_trust_score := v_new_score;
  return next;
end;
$$;

grant execute on function public.throw_pebble(uuid) to authenticated;
