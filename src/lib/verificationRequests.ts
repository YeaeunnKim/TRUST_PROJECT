// TODO: Replace mock implementations with real backend calls once API is ready.
// The API client is at src/api/client.ts and uses EXPO_PUBLIC_API_BASE_URL.

export type VerificationStatus =
  | 'pending'
  | 'capturing'
  | 'uploaded'
  | 'rejected'
  | 'expired';

export interface VerificationRequest {
  id: string;
  requesterId: string;
  targetUserId: string;
  status: VerificationStatus;
  imageUrl?: string;
  createdAt: string;
  uploadedAt?: string;
}

/**
 * TODO: POST /api/verification-requests
 * Creates a new spy photo request from the current user to targetUserId.
 */
export async function createVerificationRequest(
  _requesterId: string,
  _targetUserId: string
): Promise<VerificationRequest> {
  // Mock: generate a local request object
  return {
    id: `req_${Date.now()}`,
    requesterId: _requesterId,
    targetUserId: _targetUserId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

/**
 * TODO: PATCH /api/verification-requests/:id
 * Updates the status of an existing request.
 */
export async function updateVerificationRequest(
  id: string,
  updates: Partial<Pick<VerificationRequest, 'status' | 'imageUrl' | 'uploadedAt'>>
): Promise<void> {
  // TODO: call apiFetch(`/api/verification-requests/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
  console.log('[verificationRequests] updateVerificationRequest', id, updates);
}

/**
 * TODO: POST /api/verification-requests/:id/photo (multipart/form-data)
 * Uploads the captured photo to backend storage.
 * Storage path: verification-photos/{requestId}/{timestamp}.jpg
 */
export async function uploadVerificationPhoto(
  requestId: string,
  imageBlob: Blob
): Promise<{ imageUrl: string }> {
  // TODO: use apiUpload from src/api/client.ts
  // const formData = new FormData();
  // formData.append('photo', imageBlob, `${Date.now()}.jpg`);
  // return apiUpload(`/api/verification-requests/${requestId}/photo`, formData);

  // Mock: simulate upload delay and return a fake URL
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const mockUrl = `https://example.com/verification-photos/${requestId}/${Date.now()}.jpg`;
  return { imageUrl: mockUrl };
}
