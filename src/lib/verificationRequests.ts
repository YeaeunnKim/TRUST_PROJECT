import { getSupabaseClient, isSupabaseConfigured } from '@/src/lib/supabaseClient';

export type VerificationStatus = 'pending' | 'uploaded' | 'accepted' | 'rejected' | 'expired';

export interface VerificationRequest {
  id: string;
  coupleId: string;
  requesterId: string;
  targetUserId: string;
  status: VerificationStatus;
  imageUrl?: string;
  createdAt: string;
  uploadedAt?: string;
  reviewedAt?: string;
}

function rowToRequest(row: Record<string, unknown>): VerificationRequest {
  return {
    id: row.id as string,
    coupleId: row.couple_id as string,
    requesterId: row.requester_id as string,
    targetUserId: row.target_user_id as string,
    status: row.status as VerificationStatus,
    imageUrl: (row.image_url as string | null) ?? undefined,
    createdAt: row.created_at as string,
    uploadedAt: (row.uploaded_at as string | null) ?? undefined,
    reviewedAt: (row.reviewed_at as string | null) ?? undefined,
  };
}

export async function createVerificationRequest(
  coupleId: string,
  requesterId: string,
  targetUserId: string,
): Promise<VerificationRequest> {
  if (!isSupabaseConfigured()) {
    return {
      id: `req_${Date.now()}`,
      coupleId,
      requesterId,
      targetUserId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }
  const supabase = getSupabaseClient();

  const { data: existing } = await supabase
    .from('verification_requests')
    .select('id')
    .eq('couple_id', coupleId)
    .eq('requester_id', requesterId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) throw new Error('이미 대기 중인 사진 요청이 있어요.');

  const { data, error } = await supabase
    .from('verification_requests')
    .insert({ couple_id: coupleId, requester_id: requesterId, target_user_id: targetUserId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToRequest(data as Record<string, unknown>);
}

/** target 사용자에게 온 pending 요청 중 가장 최신 1건 */
export async function getPendingRequestForTarget(
  targetUserId: string,
): Promise<VerificationRequest | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();

  const { data } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('target_user_id', targetUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? rowToRequest(data as Record<string, unknown>) : null;
}

/** requester가 보낸 요청 중 uploaded 상태인 가장 최신 1건 */
export async function getUploadedRequestForRequester(
  requesterId: string,
): Promise<VerificationRequest | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();

  const { data } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('requester_id', requesterId)
    .eq('status', 'uploaded')
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? rowToRequest(data as Record<string, unknown>) : null;
}

/**
 * target 사용자가 사진을 업로드하고 상태를 'uploaded'로 변경한다.
 * Storage bucket 이름: verification-photos (Supabase 대시보드에서 사전 생성 필요)
 */
export async function uploadVerificationPhoto(
  requestId: string,
  imageBlob: Blob,
): Promise<{ imageUrl: string }> {
  if (!isSupabaseConfigured()) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const mockUrl = `https://example.com/mock/${requestId}.jpg`;
    return { imageUrl: mockUrl };
  }
  const supabase = getSupabaseClient();

  const storagePath = `${requestId}/${Date.now()}.jpg`;

  const { error: storageError } = await supabase.storage
    .from('verification-photos')
    .upload(storagePath, imageBlob, { contentType: 'image/jpeg', upsert: false });

  if (storageError) throw new Error('사진 업로드에 실패했어요. 다시 시도해주세요.');

  // 7일짜리 서명 URL 생성 (bucket 이 public 이 아닌 경우 대비)
  const { data: signedData, error: signedError } = await supabase.storage
    .from('verification-photos')
    .createSignedUrl(storagePath, 7 * 24 * 60 * 60);

  if (signedError || !signedData?.signedUrl) throw new Error('사진 URL 생성에 실패했어요.');

  const imageUrl = signedData.signedUrl;

  const { error: dbError } = await supabase
    .from('verification_requests')
    .update({
      status: 'uploaded',
      image_url: imageUrl,
      uploaded_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (dbError) throw new Error(dbError.message);

  return { imageUrl };
}

/** requester 가 사진을 수락 또는 거절한다. */
export async function reviewVerificationRequest(
  requestId: string,
  decision: 'accepted' | 'rejected',
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('verification_requests')
    .update({ status: decision, reviewed_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) throw new Error(error.message);
}
