-- Trust score + verification request schema
-- Run in Supabase SQL Editor (Dashboard → SQL → New query → Run).
-- Re-running is safe: each block uses IF NOT EXISTS / OR REPLACE.
--
-- Supabase Storage 설정 (대시보드에서 수동으로):
--   1. Storage → New bucket → Name: verification-photos
--   2. Public: OFF (private 유지)
--   3. Policies: authenticated 사용자가 업로드 가능하도록 추가

-- ---------- verification_requests ----------

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'uploaded', 'accepted', 'rejected', 'expired')),
  image_url text,
  created_at timestamptz not null default now(),
  uploaded_at timestamptz,
  reviewed_at timestamptz
);

create index if not exists idx_vr_requester on public.verification_requests(requester_id);
create index if not exists idx_vr_target on public.verification_requests(target_user_id);
create index if not exists idx_vr_couple on public.verification_requests(couple_id);
create index if not exists idx_vr_status on public.verification_requests(status);

alter table public.verification_requests enable row level security;

-- 두 참가자 모두 조회 가능
drop policy if exists "participants can select requests" on public.verification_requests;
create policy "participants can select requests"
  on public.verification_requests for select
  to authenticated
  using (requester_id = auth.uid() or target_user_id = auth.uid());

-- 요청자만 생성 가능
drop policy if exists "requester can insert requests" on public.verification_requests;
create policy "requester can insert requests"
  on public.verification_requests for insert
  to authenticated
  with check (requester_id = auth.uid());

-- 두 참가자 모두 상태 업데이트 가능 (target: uploaded, requester: accepted/rejected)
drop policy if exists "participants can update requests" on public.verification_requests;
create policy "participants can update requests"
  on public.verification_requests for update
  to authenticated
  using (requester_id = auth.uid() or target_user_id = auth.uid());

-- ---------- couple_trust_scores ----------

create table if not exists public.couple_trust_scores (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null default 70 check (score >= 0 and score <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, from_user_id, to_user_id)
);

create index if not exists idx_cts_from_user on public.couple_trust_scores(from_user_id);
create index if not exists idx_cts_couple on public.couple_trust_scores(couple_id);

alter table public.couple_trust_scores enable row level security;

-- from_user 만 자신의 점수 조회/생성/수정
drop policy if exists "from_user can select score" on public.couple_trust_scores;
create policy "from_user can select score"
  on public.couple_trust_scores for select
  to authenticated
  using (from_user_id = auth.uid());

drop policy if exists "from_user can insert score" on public.couple_trust_scores;
create policy "from_user can insert score"
  on public.couple_trust_scores for insert
  to authenticated
  with check (from_user_id = auth.uid());

drop policy if exists "from_user can update score" on public.couple_trust_scores;
create policy "from_user can update score"
  on public.couple_trust_scores for update
  to authenticated
  using (from_user_id = auth.uid());

-- ---------- trust_events ----------

create table if not exists public.trust_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  delta integer not null default 0,
  message text not null default '',
  related_request_id uuid references public.verification_requests(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_te_couple on public.trust_events(couple_id);
create index if not exists idx_te_actor on public.trust_events(actor_id);

alter table public.trust_events enable row level security;

-- actor 만 생성 가능
drop policy if exists "actor can insert events" on public.trust_events;
create policy "actor can insert events"
  on public.trust_events for insert
  to authenticated
  with check (actor_id = auth.uid());

-- 커플 멤버 전체 조회 가능
drop policy if exists "couple members can select events" on public.trust_events;
create policy "couple members can select events"
  on public.trust_events for select
  to authenticated
  using (couple_id = public.current_user_couple_id());
