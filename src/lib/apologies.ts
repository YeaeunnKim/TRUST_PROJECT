import { getSupabaseClient, isSupabaseConfigured } from '@/src/lib/supabaseClient';

export type ApologyStatus = 'pending' | 'accepted' | 'rejected';

export type ApologySubmission = {
  id: string;
  coupleId: string;
  authorId: string;
  partnerId: string;
  authorName: string;
  title: string;
  body: string;
  aiScore: number;
  trustDelta: number;
  status: ApologyStatus;
  createdAt: string;
  reviewedAt?: string | null;
};

type Row = {
  id: string;
  couple_id: string;
  author_id: string;
  partner_id: string;
  title: string;
  body: string;
  ai_score: number;
  trust_delta: number;
  status: ApologyStatus;
  created_at: string;
  reviewed_at: string | null;
};

function rowToApology(row: Row, authorName: string): ApologySubmission {
  return {
    id: row.id,
    coupleId: row.couple_id,
    authorId: row.author_id,
    partnerId: row.partner_id,
    authorName,
    title: row.title,
    body: row.body,
    aiScore: row.ai_score,
    trustDelta: row.trust_delta,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export async function getPendingApologyForReviewer(
  reviewerId: string,
): Promise<{ row: Row } | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('apology_submissions')
    .select('*')
    .eq('partner_id', reviewerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<Row>();
  return data ? { row: data } : null;
}

export async function getRecentReviewedForAuthor(
  authorId: string,
  sinceIso: string,
): Promise<Row[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('apology_submissions')
    .select('*')
    .eq('author_id', authorId)
    .in('status', ['accepted', 'rejected'])
    .gt('reviewed_at', sinceIso)
    .order('reviewed_at', { ascending: false });
  return (data ?? []) as Row[];
}

export async function listMyApologies(authorId: string): Promise<Row[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('apology_submissions')
    .select('*')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false });
  return (data ?? []) as Row[];
}

export async function listPartnerApologies(partnerId: string): Promise<Row[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  // 내가 받은 (내 상대가 쓴) 사과문
  const { data } = await supabase
    .from('apology_submissions')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });
  return (data ?? []) as Row[];
}

export async function reviewApology(
  apologyId: string,
  decision: 'accepted' | 'rejected',
): Promise<{
  decision: 'accepted' | 'rejected';
  appliedDelta: number;
  reviewerToAuthorScore: number;
}> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase가 설정되지 않았어요.');
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .rpc('review_apology', { p_apology_id: apologyId, p_decision: decision })
    .single<{
      decision: 'accepted' | 'rejected';
      applied_delta: number;
      reviewer_to_author_score: number;
    }>();
  if (error || !data) {
    throw new Error(error?.message ?? '사과문 검토에 실패했어요.');
  }
  return {
    decision: data.decision,
    appliedDelta: data.applied_delta,
    reviewerToAuthorScore: data.reviewer_to_author_score,
  };
}

export type { Row as ApologyRow };
export { rowToApology };
