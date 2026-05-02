import type { Couple, CoupleMember } from '@/src/models/couple';
import { loadCoupleStore, saveCoupleStore } from '@/src/storage/couple-storage';

function generateId(): string {
  return `${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function generateCoupleCode(): string {
  // 헷갈리는 문자(I, O, 0, 1) 제외
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function createCoupleInvite(userId: string, username: string): Promise<Couple> {
  // TODO: 백엔드 연동 시 → apiFetch('/couple', { method: 'POST' }) 로 교체
  const store = await loadCoupleStore();
  if (store.userCoupleMap[userId]) {
    throw new Error('이미 커플에 연결되어 있어요.');
  }
  const code = generateCoupleCode();
  const coupleId = generateId();
  const now = new Date().toISOString();
  const member: CoupleMember = {
    id: generateId(),
    coupleId,
    userId,
    username,
    createdAt: now,
  };
  const couple: Couple = {
    id: coupleId,
    inviteCode: code,
    createdBy: userId,
    createdAt: now,
    members: [member],
  };
  store.couples[coupleId] = couple;
  store.userCoupleMap[userId] = coupleId;
  await saveCoupleStore(store);
  return couple;
}

export async function joinCoupleByCode(
  code: string,
  userId: string,
  username: string
): Promise<Couple> {
  // TODO: 백엔드 연동 시 → apiFetch('/couple/join', { method: 'POST', body: JSON.stringify({ code }) }) 로 교체
  const store = await loadCoupleStore();
  if (store.userCoupleMap[userId]) {
    throw new Error('이미 커플에 연결되어 있어요.');
  }
  const normalizedCode = code.trim().toUpperCase();
  const couple = Object.values(store.couples).find((c) => c.inviteCode === normalizedCode);
  if (!couple) {
    throw new Error('유효하지 않은 코드예요.');
  }
  if (couple.members.some((m) => m.userId === userId)) {
    throw new Error('자기 자신의 코드는 입력할 수 없어요.');
  }
  if (couple.members.length >= 2) {
    throw new Error('이미 사용된 코드예요.');
  }
  const member: CoupleMember = {
    id: generateId(),
    coupleId: couple.id,
    userId,
    username,
    createdAt: new Date().toISOString(),
  };
  couple.members.push(member);
  store.userCoupleMap[userId] = couple.id;
  await saveCoupleStore(store);
  return couple;
}

export async function getMyCouple(userId: string): Promise<Couple | null> {
  // TODO: 백엔드 연동 시 → apiFetch<Couple | null>('/couple/me') 로 교체
  const store = await loadCoupleStore();
  const coupleId = store.userCoupleMap[userId];
  if (!coupleId) return null;
  return store.couples[coupleId] ?? null;
}

export async function disconnectCouple(userId: string): Promise<void> {
  // TODO: 백엔드 연동 시 → apiFetch('/couple/disconnect', { method: 'DELETE' }) 로 교체
  const store = await loadCoupleStore();
  const coupleId = store.userCoupleMap[userId];
  if (!coupleId) return;
  const couple = store.couples[coupleId];
  if (couple) {
    couple.members = couple.members.filter((m) => m.userId !== userId);
    if (couple.members.length === 0) {
      delete store.couples[coupleId];
    }
  }
  delete store.userCoupleMap[userId];
  await saveCoupleStore(store);
}
