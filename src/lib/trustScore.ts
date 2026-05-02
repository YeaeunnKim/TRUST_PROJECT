import { getSupabaseClient, isSupabaseConfigured } from '@/src/lib/supabaseClient';

export const INITIAL_TRUST_SCORE = 70;
const MIN_SCORE = 0;
const MAX_SCORE = 100;

export function clampTrustScore(score: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
}

export async function getTrustScore(
  coupleId: string,
  fromUserId: string,
  toUserId: string,
): Promise<number> {
  if (!isSupabaseConfigured()) return INITIAL_TRUST_SCORE;
  const supabase = getSupabaseClient();

  const { data } = await supabase
    .from('couple_trust_scores')
    .select('score')
    .eq('couple_id', coupleId)
    .eq('from_user_id', fromUserId)
    .eq('to_user_id', toUserId)
    .maybeSingle();

  if (!data) {
    await initTrustScoreIfMissing(coupleId, fromUserId, toUserId);
    return INITIAL_TRUST_SCORE;
  }
  return data.score as number;
}

export async function initTrustScoreIfMissing(
  coupleId: string,
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();

  await supabase.from('couple_trust_scores').upsert(
    {
      couple_id: coupleId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      score: INITIAL_TRUST_SCORE,
    },
    { onConflict: 'couple_id,from_user_id,to_user_id', ignoreDuplicates: true },
  );
}

export async function updateTrustScore(
  coupleId: string,
  fromUserId: string,
  toUserId: string,
  delta: number,
): Promise<number> {
  if (!isSupabaseConfigured()) return INITIAL_TRUST_SCORE;
  const supabase = getSupabaseClient();

  const current = await getTrustScore(coupleId, fromUserId, toUserId);
  const next = clampTrustScore(current + delta);

  const { error } = await supabase.from('couple_trust_scores').upsert(
    {
      couple_id: coupleId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      score: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'couple_id,from_user_id,to_user_id' },
  );

  if (error) throw new Error('신뢰도 업데이트에 실패했어요.');
  return next;
}

export type TrustEventType =
  | 'verification_requested'
  | 'verification_uploaded'
  | 'verification_accepted'
  | 'verification_rejected'
  | 'pebble_thrown';

export async function addTrustEvent(params: {
  coupleId: string;
  actorId: string;
  targetUserId: string;
  type: TrustEventType;
  delta: number;
  message: string;
  relatedRequestId?: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();

  await supabase.from('trust_events').insert({
    couple_id: params.coupleId,
    actor_id: params.actorId,
    target_user_id: params.targetUserId,
    type: params.type,
    delta: params.delta,
    message: params.message,
    related_request_id: params.relatedRequestId ?? null,
  });
}
