import { getSupabaseClient, isSupabaseConfigured } from '@/src/lib/supabaseClient';

export type SpyAction = 'my_confirmed' | 'my_rejected' | 'opp_sent' | 'opp_rejected';

export type ActivityRecord = {
  id: string;
  type: 'stone' | 'spy' | 'apology';
  date: string; // ISO
  dateLabel: string; // "5월 2일 14:32"
  groupLabel: string; // "오늘" / "어제" / "Day N"
  score?: number;
  isUsing?: boolean; // stone: 상대 폰 사용 여부
  spyAction?: SpyAction;
  apologyFrom?: 'me' | 'opponent';
  apologyContent?: string;
};

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${month}월 ${day}일 ${hh}:${mm}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function groupLabelOf(iso: string, now: Date): string {
  const eventStart = startOfDay(new Date(iso));
  const todayStart = startOfDay(now);
  const diffDays = Math.round((todayStart.getTime() - eventStart.getTime()) / 86400000);
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  return `Day ${diffDays}`;
}

type PebbleEventRow = {
  id: string;
  thrower_id: string;
  target_id: string;
  outcome: 'bounced' | 'hit' | 'no_op';
  target_sleep_mode: boolean;
  target_active_recently: boolean;
  trust_change: number;
  created_at: string;
};

type TrustEventRow = {
  id: string;
  couple_id: string;
  actor_id: string;
  target_user_id: string;
  type: string;
  delta: number;
  message: string;
  created_at: string;
};

type ApologyRow = {
  id: string;
  author_id: string;
  partner_id: string;
  title: string;
  body: string;
  ai_score: number;
  trust_delta: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
};

export async function fetchActivityFeed(
  coupleId: string,
  userId: string,
): Promise<ActivityRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const now = new Date();

  const [{ data: pebRows }, { data: teRows }, { data: apolRows }] = await Promise.all([
    supabase
      .from('pebble_events')
      .select('*')
      .or(`thrower_id.eq.${userId},target_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('trust_events')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('apology_submissions')
      .select('id,author_id,partner_id,title,body,ai_score,trust_delta,status,created_at')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const items: ActivityRecord[] = [];

  for (const r of (pebRows ?? []) as PebbleEventRow[]) {
    if (r.thrower_id !== userId) continue; // 내가 던진 것만 stone 로그로 표시
    items.push({
      id: `peb-${r.id}`,
      type: 'stone',
      date: r.created_at,
      dateLabel: formatDateLabel(r.created_at),
      groupLabel: groupLabelOf(r.created_at, now),
      isUsing: r.target_active_recently,
      score: r.trust_change !== 0 ? r.trust_change : undefined,
    });
  }

  for (const r of (teRows ?? []) as TrustEventRow[]) {
    if (r.type === 'pebble_thrown' && r.actor_id === userId) {
      items.push({
        id: `te-${r.id}`,
        type: 'stone',
        date: r.created_at,
        dateLabel: formatDateLabel(r.created_at),
        groupLabel: groupLabelOf(r.created_at, now),
        score: r.delta !== 0 ? r.delta : undefined,
      });
      continue;
    }
    if (r.type === 'verification_accepted' && r.actor_id === userId) {
      items.push({
        id: `te-${r.id}`,
        type: 'spy',
        date: r.created_at,
        dateLabel: formatDateLabel(r.created_at),
        groupLabel: groupLabelOf(r.created_at, now),
        spyAction: 'my_confirmed',
        score: r.delta !== 0 ? r.delta : undefined,
      });
      continue;
    }
    if (r.type === 'verification_rejected' && r.actor_id === userId) {
      items.push({
        id: `te-${r.id}`,
        type: 'spy',
        date: r.created_at,
        dateLabel: formatDateLabel(r.created_at),
        groupLabel: groupLabelOf(r.created_at, now),
        spyAction: 'my_rejected',
        score: r.delta !== 0 ? r.delta : undefined,
      });
      continue;
    }
    if (r.type === 'verification_uploaded' && r.target_user_id === userId) {
      items.push({
        id: `te-${r.id}`,
        type: 'spy',
        date: r.created_at,
        dateLabel: formatDateLabel(r.created_at),
        groupLabel: groupLabelOf(r.created_at, now),
        spyAction: 'opp_sent',
      });
      continue;
    }
    if (r.type === 'verification_rejected' && r.actor_id !== userId && r.target_user_id === userId) {
      items.push({
        id: `te-${r.id}`,
        type: 'spy',
        date: r.created_at,
        dateLabel: formatDateLabel(r.created_at),
        groupLabel: groupLabelOf(r.created_at, now),
        spyAction: 'opp_rejected',
        score: r.delta !== 0 ? r.delta : undefined,
      });
    }
  }

  for (const r of (apolRows ?? []) as ApologyRow[]) {
    // pending은 타임라인에 노출하지 않음 (수락 후에만 표시)
    if (r.status === 'pending') continue;
    items.push({
      id: `apol-${r.id}`,
      type: 'apology',
      date: r.created_at,
      dateLabel: formatDateLabel(r.created_at),
      groupLabel: groupLabelOf(r.created_at, now),
      apologyFrom: r.author_id === userId ? 'me' : 'opponent',
      apologyContent: r.body,
      // score는 수락된 경우에만 (실제 점수가 변동된 경우)
      score: r.status === 'accepted' && r.trust_delta !== 0 ? r.trust_delta : undefined,
    });
  }

  items.sort((a, b) => b.date.localeCompare(a.date));
  return items;
}
