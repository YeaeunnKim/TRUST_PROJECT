-- 0008: 신뢰도 점수 양방향 통합
-- 모든 trust 변경 RPC가 couple_trust_scores의 양방향(me→partner, partner→me)을
-- 동시에 동일한 값으로 갱신 → 어느 화면에서 어느 방향을 읽어도 같은 값을 봄.
-- 결과: 돌멩이/염탐/사과문이 모두 단일 점수에 영향을 미친다.

-- ---------- helper RPC: apply_couple_trust_delta ----------
-- 클라이언트에서 호출하는 일반 점수 변동 (예: 사진 인증 수락 +5)

create or replace function public.apply_couple_trust_delta(
  p_other_user_id uuid,
  p_delta integer,
  p_event_type text,
  p_message text default ''
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_couple_id uuid;
  v_in_couple boolean;
  v_new_score integer;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select couple_id into v_couple_id from public.couple_members where user_id = v_user_id;
  if v_couple_id is null then raise exception '먼저 커플을 연결해주세요.'; end if;

  select exists (
    select 1 from public.couple_members
    where couple_id = v_couple_id and user_id = p_other_user_id
  ) into v_in_couple;
  if not v_in_couple then raise exception '같은 커플 상대에게만 적용됩니다.'; end if;

  -- 양방향 동시 갱신
  insert into public.couple_trust_scores (couple_id, from_user_id, to_user_id, score)
  values (v_couple_id, v_user_id, p_other_user_id, greatest(0, least(100, 70 + p_delta)))
  on conflict (couple_id, from_user_id, to_user_id)
  do update set score = greatest(0, least(100, public.couple_trust_scores.score + p_delta)),
                updated_at = now()
  returning score into v_new_score;

  insert into public.couple_trust_scores (couple_id, from_user_id, to_user_id, score)
  values (v_couple_id, p_other_user_id, v_user_id, greatest(0, least(100, 70 + p_delta)))
  on conflict (couple_id, from_user_id, to_user_id)
  do update set score = greatest(0, least(100, public.couple_trust_scores.score + p_delta)),
                updated_at = now();

  -- trust_events 로그
  insert into public.trust_events (couple_id, actor_id, target_user_id, type, delta, message)
  values (v_couple_id, v_user_id, p_other_user_id, p_event_type, p_delta, p_message);

  return v_new_score;
end;
$$;

grant execute on function public.apply_couple_trust_delta(uuid, integer, text, text) to authenticated;

-- ---------- throw_pebble: 양방향 동시 갱신 ----------

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
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if v_user_id = p_target_user_id then raise exception '자기 자신에게는 돌을 던질 수 없어요.'; end if;
  select couple_id into v_couple_id from public.couple_members where user_id = v_user_id;
  if v_couple_id is null then raise exception '먼저 커플을 연결해주세요.'; end if;
  select exists (
    select 1 from public.couple_members
    where couple_id = v_couple_id and user_id = p_target_user_id
  ) into v_target_in_couple;
  if not v_target_in_couple then raise exception '같은 커플에 속한 상대에게만 돌을 던질 수 있어요.'; end if;

  select coalesce(us.sleep_mode, false), us.last_active_at
  into v_sleep_mode, v_last_active
  from auth.users u
  left join public.user_status us on us.user_id = u.id
  where u.id = p_target_user_id;

  v_active_recently := v_last_active is not null
    and v_last_active > now() - make_interval(secs => c_active_window_secs);

  if v_sleep_mode and v_active_recently then
    v_outcome := 'hit'; v_trust_change := -c_hit_penalty;
  elsif v_sleep_mode and not v_active_recently then
    v_outcome := 'bounced'; v_trust_change := 0;
  else
    v_outcome := 'no_op'; v_trust_change := 0;
  end if;

  -- 양방향 동시 갱신
  if v_trust_change <> 0 then
    insert into public.couple_trust_scores (couple_id, from_user_id, to_user_id, score)
    values (v_couple_id, v_user_id, p_target_user_id, greatest(0, least(100, 70 + v_trust_change)))
    on conflict (couple_id, from_user_id, to_user_id)
    do update set score = greatest(0, least(100, public.couple_trust_scores.score + v_trust_change)),
                  updated_at = now()
    returning score into v_new_score;

    insert into public.couple_trust_scores (couple_id, from_user_id, to_user_id, score)
    values (v_couple_id, p_target_user_id, v_user_id, greatest(0, least(100, 70 + v_trust_change)))
    on conflict (couple_id, from_user_id, to_user_id)
    do update set score = greatest(0, least(100, public.couple_trust_scores.score + v_trust_change)),
                  updated_at = now();
  else
    select score into v_new_score from public.couple_trust_scores
      where couple_id = v_couple_id and from_user_id = v_user_id and to_user_id = p_target_user_id;
    if v_new_score is null then v_new_score := 70; end if;
  end if;

  insert into public.pebble_events (
    thrower_id, target_id, outcome, target_sleep_mode, target_active_recently, trust_change
  ) values (
    v_user_id, p_target_user_id, v_outcome, v_sleep_mode, v_active_recently, v_trust_change
  );

  if v_trust_change <> 0 then
    insert into public.trust_events (couple_id, actor_id, target_user_id, type, delta, message)
    values (v_couple_id, v_user_id, p_target_user_id, 'pebble_thrown', v_trust_change,
      case when v_outcome = 'hit' then '잠자는 척하던 상대를 명중시켰어요.' else '돌멩이를 던졌어요.' end);
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

-- ---------- review_apology: 양방향 동시 갱신 ----------

create or replace function public.review_apology(p_apology_id uuid, p_decision text)
returns table (decision text, applied_delta integer, reviewer_to_author_score integer)
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

  select * into v_apology from public.apology_submissions where id = p_apology_id;
  if not found then raise exception '사과문을 찾을 수 없어요.'; end if;
  if v_apology.partner_id <> v_user_id then
    raise exception '본인에게 온 사과문만 처리할 수 있어요.';
  end if;
  if v_apology.status <> 'pending' then
    raise exception '이미 처리된 사과문이에요.';
  end if;

  if p_decision = 'accepted' then
    v_applied_delta := v_apology.trust_delta;
    -- 양방향 동시 갱신
    insert into public.couple_trust_scores (couple_id, from_user_id, to_user_id, score)
    values (v_apology.couple_id, v_user_id, v_apology.author_id, least(100, 70 + v_applied_delta))
    on conflict (couple_id, from_user_id, to_user_id)
    do update set score = least(100, public.couple_trust_scores.score + v_applied_delta),
                  updated_at = now()
    returning score into v_new_score;

    insert into public.couple_trust_scores (couple_id, from_user_id, to_user_id, score)
    values (v_apology.couple_id, v_apology.author_id, v_user_id, least(100, 70 + v_applied_delta))
    on conflict (couple_id, from_user_id, to_user_id)
    do update set score = least(100, public.couple_trust_scores.score + v_applied_delta),
                  updated_at = now();
  else
    select score into v_new_score from public.couple_trust_scores
      where couple_id = v_apology.couple_id
        and from_user_id = v_user_id and to_user_id = v_apology.author_id;
    if v_new_score is null then v_new_score := 70; end if;
  end if;

  update public.apology_submissions
  set status = p_decision, reviewed_at = now()
  where id = p_apology_id;

  insert into public.trust_events (couple_id, actor_id, target_user_id, type, delta, message)
  values (
    v_apology.couple_id, v_user_id, v_apology.author_id,
    case p_decision when 'accepted' then 'apology_accepted' else 'apology_rejected' end,
    v_applied_delta,
    case p_decision
      when 'accepted' then '사과문을 수락했어요. 신뢰도가 회복됐어요.'
      else '사과문을 거절했어요.' end
  );

  decision := p_decision;
  applied_delta := v_applied_delta;
  reviewer_to_author_score := v_new_score;
  return next;
end;
$$;

grant execute on function public.review_apology(uuid, text) to authenticated;
