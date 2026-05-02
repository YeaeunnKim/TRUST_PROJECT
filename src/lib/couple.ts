import { getSupabaseClient, isSupabaseConfigured } from '@/src/lib/supabaseClient';
import type { Couple } from '@/src/models/couple';

type CoupleRow = {
  id: string;
  invite_code: string;
  created_by: string;
  created_at: string;
};

type CoupleMemberRow = {
  id: string;
  couple_id: string;
  user_id: string;
  username: string;
  joined_at: string;
};

function rowsToCouple(coupleRow: CoupleRow, memberRows: CoupleMemberRow[]): Couple {
  return {
    id: coupleRow.id,
    inviteCode: coupleRow.invite_code,
    createdBy: coupleRow.created_by,
    createdAt: coupleRow.created_at,
    members: memberRows.map((m) => ({
      id: m.id,
      coupleId: m.couple_id,
      userId: m.user_id,
      username: m.username,
      createdAt: m.joined_at,
    })),
  };
}

function ensureConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase가 설정되지 않았어요. 설정 안내에 따라 .env.local을 채운 뒤 dev 서버를 재시작해 주세요.',
    );
  }
}

export async function createCoupleInvite(username: string): Promise<Couple> {
  ensureConfigured();
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('create_couple_invite', {
    p_username: username,
  });
  if (error) throw new Error(error.message);
  const couple = await getMyCouple();
  if (!couple) throw new Error('커플 정보를 불러오지 못했어요.');
  return couple;
}

export async function joinCoupleByCode(code: string, username: string): Promise<Couple> {
  ensureConfigured();
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('join_couple_by_code', {
    p_code: code,
    p_username: username,
  });
  if (error) throw new Error(error.message);
  const couple = await getMyCouple();
  if (!couple) throw new Error('커플 정보를 불러오지 못했어요.');
  return couple;
}

export async function getMyCouple(): Promise<Couple | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: myMembership } = await supabase
    .from('couple_members')
    .select('couple_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!myMembership) return null;

  const { data: coupleRow } = await supabase
    .from('couples')
    .select('*')
    .eq('id', myMembership.couple_id)
    .maybeSingle<CoupleRow>();
  if (!coupleRow) return null;

  const { data: memberRows } = await supabase
    .from('couple_members')
    .select('*')
    .eq('couple_id', coupleRow.id);
  return rowsToCouple(coupleRow, (memberRows ?? []) as CoupleMemberRow[]);
}

export async function disconnectCouple(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('disconnect_couple');
  if (error) throw new Error(error.message);
}
