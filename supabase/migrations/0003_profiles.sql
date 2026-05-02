-- 사용자별 프로필 테이블 (이름/나이/연애 시작일/사진).
-- 본인은 자기 프로필 read/write, 같은 커플 상대는 read만.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  age text not null default '',
  relationship_start_date date,
  photo_uri text,
  updated_at timestamptz not null default now()
);

-- 자동 updated_at
create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch
  before update on public.profiles
  for each row
  execute function public.touch_profile_updated_at();

alter table public.profiles enable row level security;

-- 본인 read/write
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 같은 커플 멤버끼리 서로 프로필 read 가능
drop policy if exists "couple peers read profile" on public.profiles;
create policy "couple peers read profile"
  on public.profiles for select
  to authenticated
  using (
    user_id in (
      select cm.user_id
      from public.couple_members cm
      where cm.couple_id = public.current_user_couple_id()
    )
  );
