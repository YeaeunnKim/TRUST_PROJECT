import { getSupabaseClient, isSupabaseConfigured } from '@/src/lib/supabaseClient';

export type VerificationStatus = 'pending' | 'uploaded' | 'accepted' | 'rejected' | 'expired';

export interface VerificationRequest {
  id: string;
  coupleId: string;
  requesterId: string;
  targetUserId: string;
  status: VerificationStatus;
  /** 표시용 signed URL — 런타임에만 생성, DB에는 저장하지 않음 */
  imageUrl?: string;
  /** Storage 경로 — DB의 image_url 컬럼에 저장 */
  imagePath?: string;
  createdAt: string;
  uploadedAt?: string;
  reviewedAt?: string;
}

const BUCKET = 'verification-photos';

function rowToRequest(row: Record<string, unknown>): VerificationRequest {
  return {
    id: row.id as string,
    coupleId: row.couple_id as string,
    requesterId: row.requester_id as string,
    targetUserId: row.target_user_id as string,
    status: row.status as VerificationStatus,
    // DB image_url 컬럼에는 Storage path 가 저장됨
    imagePath: (row.image_url as string | null) ?? undefined,
    createdAt: row.created_at as string,
    uploadedAt: (row.uploaded_at as string | null) ?? undefined,
    reviewedAt: (row.reviewed_at as string | null) ?? undefined,
  };
}

/** Storage path → 1시간짜리 signed URL. 실패 시 undefined. */
async function toSignedUrl(path: string): Promise<string | undefined> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return undefined;
  return data.signedUrl;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * A가 B에게 사진 인증 요청을 생성한다.
 * pending 또는 uploaded 상태의 진행 중 요청이 있으면 중복 생성하지 않는다.
 */
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
    .in('status', ['pending', 'uploaded'])
    .maybeSingle();

  if (existing) throw new Error('이미 진행 중인 사진 요청이 있어요.');

  const { data, error } = await supabase
    .from('verification_requests')
    .insert({
      couple_id: coupleId,
      requester_id: requesterId,
      target_user_id: targetUserId,
      status: 'pending',
    })
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

/**
 * requester가 보낸 uploaded 요청 중 가장 최신 1건.
 * imagePath → fresh signed URL(1h)을 생성해 imageUrl 에 담아 반환한다.
 */
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

  if (!data) return null;

  const req = rowToRequest(data as Record<string, unknown>);

  if (req.imagePath) {
    req.imageUrl = await toSignedUrl(req.imagePath);
  }

  return req;
}

/**
 * B(target)가 사진을 찍어 Storage에 업로드하고 요청 상태를 'uploaded'로 변경한다.
 * DB의 image_url 컬럼에는 signed URL 대신 Storage path 를 저장한다.
 */
export async function uploadVerificationPhoto(
  requestId: string,
  imageBlob: Blob,
  fileName?: string,
): Promise<{ imagePath: string }> {
  if (!isSupabaseConfigured()) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { imagePath: `mock/${requestId}.jpg` };
  }
  const supabase = getSupabaseClient();

  const ext = fileName ? (fileName.split('.').pop() ?? 'jpg') : 'jpg';
  const storagePath = `verification-requests/${requestId}/${Date.now()}.${ext}`;

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, imageBlob, {
      contentType: imageBlob.type || 'image/jpeg',
      upsert: false,
    });

  if (storageError) throw new Error('사진 업로드에 실패했어요. 다시 시도해주세요.');

  const { error: dbError } = await supabase
    .from('verification_requests')
    .update({
      status: 'uploaded',
      image_url: storagePath,       // path 저장
      uploaded_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (dbError) throw new Error(dbError.message);

  return { imagePath: storagePath };
}

/** requester가 사진을 수락 또는 거절한다. */
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
