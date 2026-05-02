-- 0001의 RLS 정책에서 무한 재귀(`couple_members` 정책이 `couple_members`를 다시 쿼리)가 발생.
-- security definer 헬퍼 함수로 해결.

create or replace function public.current_user_couple_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select couple_id from public.couple_members where user_id = auth.uid() limit 1;
$$;

grant execute on function public.current_user_couple_id() to authenticated;

-- couples 정책 재정의
drop policy if exists "members can read their couple" on public.couples;
create policy "members can read their couple"
  on public.couples for select
  to authenticated
  using (id = public.current_user_couple_id());

-- couple_members 정책 재정의
drop policy if exists "members can read peers" on public.couple_members;
create policy "members can read peers"
  on public.couple_members for select
  to authenticated
  using (couple_id = public.current_user_couple_id());
