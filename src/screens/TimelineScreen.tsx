import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import BirdCharacter from '@/src/components/BirdCharacter';
import Nest from '@/src/components/Nest';
import TimelineCard, { type TimelineCardItem } from '@/src/components/TimelineCard';
import TopBar from '@/src/components/TopBar';

// ─── 타입 ─────────────────────────────────────────────────
type ActivityFilter = 'all' | 'stone' | 'spy' | 'apology';
type SelectedBird = null | 'mine' | 'opponent';

type SpyAction =
  | 'my_confirmed'    // 내가 받은 사진 확인
  | 'my_rejected'     // 내가 받은 사진 거절
  | 'opp_sent'        // 상대방이 사진 전송
  | 'opp_rejected';   // 상대방이 요청 거절

type ActivityRecord = {
  id: string;
  type: 'stone' | 'spy' | 'apology';
  date: string;
  dateLabel: string;
  groupLabel: string;
  score?: number;
  isUsing?: boolean;
  spyAction?: SpyAction;
  apologyFrom?: 'me' | 'opponent';
  apologyContent?: string;
};

type LogEntry = {
  id: string;
  time: string;
  description: string;
  score?: number;
  type: ActivityRecord['type'];
};

// ─── 목업 데이터 ──────────────────────────────────────────
const MOCK_ACTIVITIES: ActivityRecord[] = [
  { id: 'a1', type: 'stone',   date: '2026-05-02 14:32', dateLabel: '5월 2일 14:32',  groupLabel: '오늘',  isUsing: true, score: -5 },
  { id: 'a2', type: 'spy',     date: '2026-05-02 13:20', dateLabel: '5월 2일 13:20',  groupLabel: '오늘',  spyAction: 'my_confirmed' },
  { id: 'a3', type: 'stone',   date: '2026-05-01 20:15', dateLabel: '5월 1일 20:15',  groupLabel: 'Day 1', isUsing: false },
  { id: 'a4', type: 'spy',     date: '2026-04-30 11:00', dateLabel: '4월 30일 11:00', groupLabel: 'Day 2', spyAction: 'my_rejected', score: -5 },
  { id: 'a5', type: 'spy',     date: '2026-04-29 18:00', dateLabel: '4월 29일 18:00', groupLabel: 'Day 3', spyAction: 'opp_sent' },
  { id: 'a6', type: 'spy',     date: '2026-04-28 15:00', dateLabel: '4월 28일 15:00', groupLabel: 'Day 4', spyAction: 'opp_rejected', score: -5 },
  { id: 'a7', type: 'apology', date: '2026-04-28 10:00', dateLabel: '4월 28일 10:00', groupLabel: 'Day 4', apologyFrom: 'opponent', apologyContent: '어제 연락 못 해서 미안해.' },
  { id: 'a8', type: 'apology', date: '2026-04-27 09:30', dateLabel: '4월 27일 09:30', groupLabel: 'Day 5', apologyFrom: 'me', apologyContent: '늦게 답장해서 미안해.' },
];

// ─── 로그 분리 ────────────────────────────────────────────
// 상대방 병아리: 돌 던지기 결과 + 상대방 spy 행동
function getOpponentLogs(records: ActivityRecord[]): LogEntry[] {
  return records.flatMap<LogEntry>((r) => {
    if (r.type === 'stone') return [{
      id: r.id, time: r.dateLabel, type: 'stone',
      description: r.isUsing ? '폰을 사용 중이었어요' : '폰을 사용하지 않았어요',
      score: r.score,
    }];
    if (r.type === 'spy' && r.spyAction === 'opp_sent') return [{
      id: r.id, time: r.dateLabel, type: 'spy',
      description: '사진을 전송했어요',
    }];
    if (r.type === 'spy' && r.spyAction === 'opp_rejected') return [{
      id: r.id, time: r.dateLabel, type: 'spy',
      description: '사진 요청을 거절했어요',
      score: r.score,
    }];
    if (r.type === 'apology' && r.apologyFrom === 'opponent') return [{
      id: r.id, time: r.dateLabel, type: 'apology',
      description: `사과문을 보냈어요 — "${r.apologyContent}"`,
    }];
    return [];
  });
}

// 내 병아리: 내가 받은 사진에 대해 확인/거절한 행동만
function getMyLogs(records: ActivityRecord[]): LogEntry[] {
  return records.flatMap<LogEntry>((r) => {
    if (r.type === 'spy' && r.spyAction === 'my_confirmed') return [{
      id: r.id, time: r.dateLabel, type: 'spy',
      description: '전송된 사진을 확인했어요',
    }];
    if (r.type === 'spy' && r.spyAction === 'my_rejected') return [{
      id: r.id, time: r.dateLabel, type: 'spy',
      description: '전송된 사진을 거절했어요',
      score: r.score,
    }];
    if (r.type === 'apology' && r.apologyFrom === 'me') return [{
      id: r.id, time: r.dateLabel, type: 'apology',
      description: `사과문을 전송했어요 — "${r.apologyContent}"`,
    }];
    return [];
  });
}

// ─── 메인 타임라인 카드 변환 ─────────────────────────────
const SPY_LABELS: Record<SpyAction, string> = {
  my_confirmed:  '전송된 사진을 확인했어요',
  my_rejected:   '전송된 사진을 거절했어요',
  opp_sent:      '상대방이 사진을 전송했어요',
  opp_rejected:  '상대방이 요청을 거절했어요',
};
const SPY_TAGS: Record<SpyAction, string> = {
  my_confirmed: '#사진확인', my_rejected: '#사진거절',
  opp_sent: '#사진전송', opp_rejected: '#요청거절',
};

function toCardItem(r: ActivityRecord): TimelineCardItem {
  if (r.type === 'stone') return {
    id: r.id, groupLabel: r.groupLabel, dateLabel: r.dateLabel,
    title: r.isUsing ? '상대방이 폰을 사용 중이었어요' : '상대방이 폰을 사용하지 않았어요',
    subtitle: '돌 던지기로 확인한 결과예요.',
    tags: ['#돌던지기', r.isUsing ? '#사용중' : '#미사용'],
    status: 'learned', birdState: 'healthy', score: r.score,
  };
  if (r.type === 'spy') return {
    id: r.id, groupLabel: r.groupLabel, dateLabel: r.dateLabel,
    title: r.spyAction ? SPY_LABELS[r.spyAction] : '염탐하기 기록',
    subtitle: '염탐하기 관련 기록이에요.',
    tags: ['#염탐하기', r.spyAction ? SPY_TAGS[r.spyAction] : ''],
    status: 'learned', birdState: 'uneasy', score: r.score,
  };
  return {
    id: r.id, groupLabel: r.groupLabel, dateLabel: r.dateLabel,
    title: r.apologyFrom === 'opponent' ? '상대방이 사과문을 보냈어요' : '사과문을 전송했어요',
    subtitle: r.apologyContent ?? '',
    tags: ['#사과문', r.apologyFrom === 'opponent' ? '#수신' : '#발신'],
    status: 'learned', birdState: 'healthy',
  };
}

const FILTER_LABELS: Record<ActivityFilter, string> = {
  all: '전체', stone: '돌 던지기', spy: '염탐하기', apology: '사과문',
};
const FILTER_KEYS = Object.keys(FILTER_LABELS) as ActivityFilter[];

// ─── 로그 행 컴포넌트 ─────────────────────────────────────
function LogRow({ entry }: { entry: LogEntry }) {
  return (
    <View style={logStyles.row}>
      <View style={logStyles.left}>
        <Text style={logStyles.time}>{entry.time}</Text>
        <Text style={logStyles.desc}>{entry.description}</Text>
      </View>
      {entry.score !== undefined && (
        <Text style={logStyles.score}>{entry.score}</Text>
      )}
    </View>
  );
}

const logStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f7eeea', borderRadius: 16, padding: 14, marginBottom: 10,
  },
  left: { flex: 1, gap: 4 },
  time: { fontSize: 11, color: '#9a8a7d' },
  desc: { fontSize: 14, fontWeight: '500', color: '#5d4e45' },
  score: { fontSize: 20, fontWeight: '700', color: '#d9534f', marginLeft: 12 },
});

// ─── 새 상수 ──────────────────────────────────────────────
const BIRD_SCALE = 0.5;
const BIRD_W = 220;
const BIRD_H = 210;
const SCALED_W = BIRD_W * BIRD_SCALE;
const SCALED_H = BIRD_H * BIRD_SCALE;
const OFFSET_L = (BIRD_W / 2) * (BIRD_SCALE - 1);
const OFFSET_T = (BIRD_H / 2) * (BIRD_SCALE - 1);

// ─── 메인 화면 ────────────────────────────────────────────
export default function TimelineScreen() {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [selectedBird, setSelectedBird] = useState<SelectedBird>(null);
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 1.15, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(heartScale, { toValue: 1, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(800),
      ])
    ).start();
  }, [heartScale]);

  // 병아리 클릭: 같은 병아리 재클릭 시 메인 타임라인으로 복귀
  const handleBirdPress = (bird: 'mine' | 'opponent') => {
    setSelectedBird((prev) => (prev === bird ? null : bird));
    setFilter('all');
  };

  const sorted = useMemo(
    () => [...MOCK_ACTIVITIES].sort((a, b) => b.date.localeCompare(a.date)),
    []
  );

  // 메인 타임라인 카드
  const cardItems = useMemo(() => {
    const base = filter === 'all' ? sorted : sorted.filter((r) => r.type === filter);
    return base.map(toCardItem);
  }, [filter, sorted]);

  // 병아리 로그
  const opponentLogs = useMemo(() => getOpponentLogs(sorted), [sorted]);
  const myLogs = useMemo(() => getMyLogs(sorted), [sorted]);

  const activeLogs = useMemo(() => {
    const base = selectedBird === 'mine' ? myLogs : opponentLogs;
    if (filter === 'all') return base;
    return base.filter((e) => e.type === filter);
  }, [selectedBird, myLogs, opponentLogs, filter]);

  const NestHeader = (
    <View style={styles.nestCard}>
      <View style={styles.nestScene}>
        <View style={styles.nestGraphic}>
          <View style={styles.nestScaleX}><Nest state="healthy" /></View>
        </View>

        <View style={styles.heartWrap}>
          <Animated.View style={[styles.heartContainer, { transform: [{ scale: heartScale }] }]}>
            <Ionicons name="heart" size={72} color="#fac5bc" />
            <Text style={styles.heartScore}>87</Text>
          </Animated.View>
        </View>

        <View style={styles.birdsRow}>
          {/* 내 병아리 */}
          <Pressable
            style={styles.birdSlot}
            onPress={() => handleBirdPress('mine')}
            accessibilityRole="button"
          >
            {selectedBird === 'mine' && <View style={styles.birdSelectedRing} />}
            <View style={styles.birdClip}>
              <View style={[styles.birdInner, { left: OFFSET_L, top: OFFSET_T }]}>
                <BirdCharacter state="healthy" />
              </View>
            </View>
            <Text style={[styles.birdLabel, selectedBird === 'mine' && styles.birdLabelActive]}>
              내 병아리
            </Text>
          </Pressable>

          {/* 상대방 병아리 */}
          <Pressable
            style={styles.birdSlot}
            onPress={() => handleBirdPress('opponent')}
            accessibilityRole="button"
          >
            {selectedBird === 'opponent' && <View style={styles.birdSelectedRing} />}
            <View style={styles.birdClip}>
              <View style={[styles.birdInner, { left: OFFSET_L, top: OFFSET_T }]}>
                <BirdCharacter state="uneasy" />
              </View>
            </View>
            <Text style={[styles.birdLabel, selectedBird === 'opponent' && styles.birdLabelActive]}>
              상대방 병아리
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopBar />
      <FlatList
        keyExtractor={(item) => (selectedBird ? (item as LogEntry).id : (item as TimelineCardItem).id)}
        data={(selectedBird ? activeLogs : cardItems) as (LogEntry | TimelineCardItem)[]}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            {NestHeader}
            {/* 필터 칩 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {FILTER_KEYS.map((key) => (
                <Pressable
                  key={key}
                  style={[styles.chip, filter === key && styles.chipActive]}
                  onPress={() => setFilter(key)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>
                    {FILTER_LABELS[key]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>아직 기록이 없어요</Text>}
        renderItem={({ item }) =>
          selectedBird
            ? <LogRow entry={item as LogEntry} />
            : <TimelineCard item={item as TimelineCardItem} onPress={() => {}} />
        }
        ItemSeparatorComponent={() => selectedBird ? null : <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

// ─── 스타일 ──────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f0eb' },
  listContent: { padding: 16, paddingBottom: 40 },
  headerWrap: { gap: 16, marginBottom: 16 },

  nestCard: { backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 20, overflow: 'hidden' },
  nestScene: { width: '100%', height: 210 },
  nestGraphic: { position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden', alignItems: 'center' },
  nestScaleX: { transform: [{ scaleX: 1.25 }] },

  birdsRow: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-end' },
  birdSlot: { alignItems: 'center', gap: 4 },
  birdSelectedRing: {
    position: 'absolute', top: -6, left: -6, right: -6, bottom: 20,
    borderRadius: 70, borderWidth: 2, borderColor: '#e05040', zIndex: 4,
  },
  birdClip: { width: SCALED_W, height: SCALED_H, overflow: 'hidden' },
  birdInner: { position: 'absolute', width: BIRD_W, height: BIRD_H, transform: [{ scale: BIRD_SCALE }] },
  birdLabel: { fontSize: 13, fontWeight: '600', color: '#5d4e45' },
  birdLabelActive: { color: '#e05040' },

  heartWrap: { position: 'absolute', top: 6, left: 0, right: 0, alignItems: 'center', zIndex: 3 },
  heartContainer: { width: 150, height: 82, alignItems: 'center', justifyContent: 'center' },
  heartScore: { position: 'absolute', top: 22, fontSize: 24, fontWeight: '800', color: '#e05040' },

  filterRow: { gap: 8, paddingRight: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(210,190,175,0.6)' },
  chipActive: { backgroundColor: 'rgba(232,202,191,0.9)', borderColor: 'transparent' },
  chipText: { fontSize: 12, color: '#7b6c62' },
  chipTextActive: { fontWeight: '600', color: '#5d4e45' },

  separator: { height: 12 },
  emptyText: { fontSize: 13, color: '#b8a89e', textAlign: 'center', paddingVertical: 24 },
});
