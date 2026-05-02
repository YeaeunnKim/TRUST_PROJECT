-- 사과문 제출 + 신뢰도 회복
-- 사과문 작성 → AI 채점 → 점수의 일정 비율로 상대→나 trust score 회복

create table if not exists public.apology_submissions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  body text not null,
  ai_score integer not null check (ai_score >= 0 and ai_score <= 100),
  trust_delta integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_apol_author on public.apology_submissions(author_id, created_at desc);
create index if not exists idx_apol_couple on public.apology_submissions(couple_id, created_at desc);

alter table public.apology_submissions enable row level security;

drop policy if exists "couple members read apologies" on public.apology_submissions;
create policy "couple members read apologies"
  on public.apology_submissions for select
  to authenticated
  using (couple_id = public.current_user_couple_id());

-- INSERT는 RPC만

create or replace function public.submit_apology(
  p_title text,
  p_body text,
  p_ai_score integer
) returns table (
  trust_delta integer,
  partner_trust_score integer,
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
  v_new_score integer;
  v_existing_score integer;
  -- 정책 상수
  c_min_ai_score constant integer := 30;
  c_max_delta constant integer := 20;
  c_recovery_ratio constant numeric := 0.3;
  c_cooldown_minutes constant integer := 30;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if length(coalesce(trim(p_body), '')) = 0 then
    raise exception '사과문 본문이 비어 있어요.';
  end if;
  if p_ai_score < c_min_ai_score then
    raise exception '사과문 점수가 % 점 미만이라 신뢰도 회복이 적용되지 않아요. 더 다듬어보세요.',
      c_min_ai_score;
  end if;

  -- 커플 찾기
  select couple_id into v_couple_id
  from public.couple_members where user_id = v_user_id;
  if v_couple_id is null then
    raise exception '먼저 커플을 연결해주세요.';
  end if;

  select user_id into v_partner_id
  from public.couple_members
  where couple_id = v_couple_id and user_id <> v_user_id
  limit 1;
  if v_partner_id is null then
    raise exception '아직 커플 상대가 합류하지 않았어요.';
  end if;

  -- 쿨다운 체크
  select created_at into v_last_at
  from public.apology_submissions
  where author_id = v_user_id
  order by created_at desc
  limit 1;
  if v_last_at is not null
     and v_last_at > now() - make_interval(mins => c_cooldown_minutes) then
    cooldown_remaining_seconds :=
      ceil(extract(epoch from (v_last_at + make_interval(mins => c_cooldown_minutes) - now())))::integer;
    raise exception '사과문은 % 분에 한 번만 보낼 수 있어요. 약 % 초 후 다시 시도해 주세요.',
      c_cooldown_minutes, cooldown_remaining_seconds;
  end if;

  -- 회복량 = AI 점수 × 비율, 최대 c_max_delta
  v_delta := least(c_max_delta, floor(p_ai_score * c_recovery_ratio)::integer);
  if v_delta <= 0 then
    raise exception '회복 가능한 점수가 없어요.';
  end if;

  -- 사과문 저장
  insert into public.apology_submissions (
    couple_id, author_id, partner_id, title, body, ai_score, trust_delta
  ) values (
    v_couple_id, v_user_id, v_partner_id, p_title, p_body, p_ai_score, v_delta
  );

  -- 상대→나 방향의 신뢰 점수 회복
  -- (사과문은 내가 미안하다고 함 → 상대가 나를 신뢰하는 점수가 회복됨)
  select score into v_existing_score
  from public.couple_trust_scores
  where couple_id = v_couple_id
    and from_user_id = v_partner_id
    and to_user_id = v_user_id;

  if v_existing_score is null then
    insert into public.couple_trust_scores (
      couple_id, from_user_id, to_user_id, score
    ) values (
      v_couple_id, v_partner_id, v_user_id, least(100, 70 + v_delta)
    )
    returning score into v_new_score;
  else
    update public.couple_trust_scores
    set score = least(100, score + v_delta), updated_at = now()
    where couple_id = v_couple_id
      and from_user_id = v_partner_id
      and to_user_id = v_user_id
    returning score into v_new_score;
  end if;

  -- trust_events 로그
  insert into public.trust_events (
    couple_id, actor_id, target_user_id, type, delta, message
  ) values (
    v_couple_id, v_user_id, v_partner_id, 'apology_submitted', v_delta,
    '사과문 작성으로 신뢰도가 회복됐어요.'
  );

  trust_delta := v_delta;
  partner_trust_score := v_new_score;
  cooldown_remaining_seconds := 0;
  return next;
end;
$$;

grant execute on function public.submit_apology(text, text, integer) to authenticated;
