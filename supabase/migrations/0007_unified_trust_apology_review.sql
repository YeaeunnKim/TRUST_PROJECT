-- 0007: 신뢰도 점수 통합 (couple_trust_scores) + 사과문 수락 플로우
--
-- 1. throw_pebble RPC가 couple_trust_scores를 갱신 (전: user_status.trust_score)
-- 2. apology_submissions에 status / reviewed_at 추가
-- 3. submit_apology는 status='pending'으로 저장만, 점수 변동 없음
-- 4. review_apology RPC 추가 — 상대가 수락/거절, 수락 시 점수 회복

-- ---------- throw_pebble RPC 갱신 ----------

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
  c_active_window_secs constant integer := 90;
  c_hit_penalty constant integer := 10;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if v_user_id = p_target_user_id then
    raise exception '자기 자신에게는 돌을 던질 수 없어요.';
  end if;

  select couple_id into v_couple_id
  from public.couple_members where user_id = v_user_id;
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

  select coalesce(us.sleep_mode, false), us.last_active_at
  into v_sleep_mode, v_last_active
  from auth.users u
  left join public.user_status us on us.user_id = u.id
  where u.id = p_target_user_id;

  v_active_recently :=
    v_last_active is not null
    and v_last_active > now() - make_interval(secs => c_active_window_secs);

  if v_sleep_mode and v_active_recently then
    v_outcome := 'hit';
    v_trust_change := -c_hit_penalty;
  elsif v_sleep_mode and not v_active_recently then
    v_outcome := 'bounced';
    v_trust_change := 0;
  else
    v_outcome := 'no_op';
    v_trust_change := 0;
  end if;

  -- couple_trust_scores from=me, to=target (내가 상대를 신뢰하는 점수)
  if v_trust_change <> 0 then
    insert into public.couple_trust_scores (couple_id, from_user_id, to_user_id, score)
    values (v_couple_id, v_user_id, p_target_user_id, greatest(0, least(100, 70 + v_trust_change)))
    on conflict (couple_id, from_user_id, to_user_id)
    do update set
      score = greatest(0, least(100, public.couple_trust_scores.score + v_trust_change)),
      updated_at = now()
    returning score into v_new_score;
  else
    select score into v_new_score
    from public.couple_trust_scores
    where couple_id = v_couple_id
      and from_user_id = v_user_id
      and to_user_id = p_target_user_id;
    if v_new_score is null then
      v_new_score := 70;
    end if;
  end if;

  -- pebble_events 로그
  insert into public.pebble_events (
    thrower_id, target_id, outcome,
    target_sleep_mode, target_active_recently, trust_change
  ) values (
    v_user_id, p_target_user_id, v_outcome,
    v_sleep_mode, v_active_recently, v_trust_change
  );

  -- trust_events 로그 (점수 변동 있을 때만)
  if v_trust_change <> 0 then
    insert into public.trust_events (
      couple_id, actor_id, target_user_id, type, delta, message
    ) values (
      v_couple_id, v_user_id, p_target_user_id, 'pebble_thrown', v_trust_change,
      case when v_outcome = 'hit' then '잠자는 척하던 상대를 명중시켰어요.'
           else '돌멩이를 던졌어요.' end
    );
  end if;

  outcome := v_outcome;
  target_sleep_mode := v_sleep_mode;
  target_active_recently := v_active_recently;
  trust_change := v_trust_change;
  target_trust_score := v_new_score;
  return next;
end;
$$;

grant execute on function public.throw_pebble(uuid) to authenticated;

-- ---------- apology_submissions: status / reviewed_at ----------

alter table public.apology_submissions
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected'));

alter table public.apology_submissions
  add column if not exists reviewed_at timestamptz;

create index if not exists idx_apol_partner_status
  on public.apology_submissions(partner_id, status);

-- ---------- submit_apology: status='pending', 점수 변동 없음 ----------

create or replace function public.submit_apology(p_title text, p_body text, p_ai_score integer)
returns table (
  apology_id uuid,
  trust_delta integer,
  cooldown_remaining_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_partner_id uuid;
  v_last_at timestamptz;
  v_delta integer;
  v_apology_id uuid;
  c_min_ai_score constant integer := 30;
  c_max_delta constant integer := 20;
  c_recovery_ratio constant numeric := 0.3;
  c_cooldown_minutes constant integer := 30;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if length(coalesce(trim(p_body), '')) = 0 then
    raise exception '사과문 본문이 비어 있어요.';
  end if;
  if p_ai_score < c_min_ai_score then
    raise exception '사과문 점수가 % 점 미만이라 등록되지 않아요. 더 다듬어보세요.', c_min_ai_score;
  end if;

  select couple_id into v_couple_id
  from public.couple_members where user_id = v_user_id;
  if v_couple_id is null then raise exception '먼저 커플을 연결해주세요.'; end if;
  select user_id into v_partner_id
  from public.couple_members
  where couple_id = v_couple_id and user_id <> v_user_id limit 1;
  if v_partner_id is null then raise exception '아직 커플 상대가 합류하지 않았어요.'; end if;

  select created_at into v_last_at
  from public.apology_submissions
  where author_id = v_user_id
  order by created_at desc limit 1;
  if v_last_at is not null
     and v_last_at > now() - make_interval(mins => c_cooldown_minutes) then
    cooldown_remaining_seconds :=
      ceil(extract(epoch from (v_last_at + make_interval(mins => c_cooldown_minutes) - now())))::integer;
    raise exception '사과문은 % 분에 한 번만 보낼 수 있어요. 약 % 초 후 다시 시도해 주세요.',
      c_cooldown_minutes, cooldown_remaining_seconds;
  end if;

  v_delta := least(c_max_delta, floor(p_ai_score * c_recovery_ratio)::integer);
  if v_delta <= 0 then raise exception '회복 가능한 점수가 없어요.'; end if;

  -- status='pending' 기본값으로 저장 (점수는 review에서 처리)
  insert into public.apology_submissions (
    couple_id, author_id, partner_id, title, body, ai_score, trust_delta
  ) values (
    v_couple_id, v_user_id, v_partner_id, p_title, p_body, p_ai_score, v_delta
  ) returning id into v_apology_id;

  insert into public.trust_events (
    couple_id, actor_id, target_user_id, type, delta, message
  ) values (
    v_couple_id, v_user_id, v_partner_id, 'apology_submitted', 0,
    '사과문을 작성했어요. 상대 검토를 기다리는 중...'
  );

  apology_id := v_apology_id;
  trust_delta := v_delta;
  cooldown_remaining_seconds := 0;
  return next;
end;
$$;

grant execute on function public.submit_apology(text, text, integer) to authenticated;

-- ---------- review_apology RPC ----------

create or replace function public.review_apology(p_apology_id uuid, p_decision text)
returns table (
  decision text,
  applied_delta integer,
  reviewer_to_author_score integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_apology record;
  v_new_score integer;
  v_applied_delta integer := 0;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_decision not in ('accepted', 'rejected') then
    raise exception 'invalid decision: %', p_decision;
  end if;

  select * into v_apology
  from public.apology_submissions where id = p_apology_id;
  if not found then raise exception '사과문을 찾을 수 없어요.'; end if;
  if v_apology.partner_id <> v_user_id then
    raise exception '본인에게 온 사과문만 처리할 수 있어요.';
  end if;
  if v_apology.status <> 'pending' then
    raise exception '이미 처리된 사과문이에요.';
  end if;

  if p_decision = 'accepted' then
    v_applied_delta := v_apology.trust_delta;
    -- 내가 상대(작성자)를 신뢰하는 점수 회복: from=me(reviewer), to=author
    insert into public.couple_trust_scores (couple_id, from_user_id, to_user_id, score)
    values (v_apology.couple_id, v_user_id, v_apology.author_id, least(100, 70 + v_applied_delta))
    on conflict (couple_id, from_user_id, to_user_id)
    do update set
      score = least(100, public.couple_trust_scores.score + v_applied_delta),
      updated_at = now()
    returning score into v_new_score;
  else
    select score into v_new_score
    from public.couple_trust_scores
    where couple_id = v_apology.couple_id
      and from_user_id = v_user_id
      and to_user_id = v_apology.author_id;
    if v_new_score is null then v_new_score := 70; end if;
  end if;

  update public.apology_submissions
  set status = p_decision, reviewed_at = now()
  where id = p_apology_id;

  insert into public.trust_events (
    couple_id, actor_id, target_user_id, type, delta, message
  ) values (
    v_apology.couple_id, v_user_id, v_apology.author_id,
    case p_decision when 'accepted' then 'apology_accepted' else 'apology_rejected' end,
    v_applied_delta,
    case p_decision
      when 'accepted' then '사과문을 수락했어요. 상대의 신뢰도가 회복됐어요.'
      else '사과문을 거절했어요.' end
  );

  decision := p_decision;
  applied_delta := v_applied_delta;
  reviewer_to_author_score := v_new_score;
  return next;
end;
$$;

grant execute on function public.review_apology(uuid, text) to authenticated;
