import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import FilterChips, { type FilterKey } from '@/src/components/FilterChips';
import TopBar from '@/src/components/TopBar';
import JourneyHeader from '@/src/components/JourneyHeader';
import TimelineCard, { type TimelineCardItem } from '@/src/components/TimelineCard';
import SettingsMenu from '@/src/components/SettingsMenu';
import SignalWarningSheet from '@/src/components/SignalWarningSheet';
import { useDayRecords } from '@/src/context/day-records-context';
import type { BirdState as ModelBirdState } from '@/src/models/bird-state';
import type { BirdState as VisualBirdState } from '@/src/components/BirdCharacter';
import { getSeoulDateKey } from '@/src/utils/date';

const FILTER_FLAG_MAP: Record<Exclude<FilterKey, 'all'>, keyof ReturnType<typeof useDayRecords>['records'][0]['flags']> = {
  money: 'moneyRequest',
  favor: 'favorRequest',
  praise: 'excessivePraise',
  link: 'linkIncluded',
  image: 'imageIncluded',
};

const TAG_MAP = {
  moneyRequest: '#금전언급',
  favorRequest: '#부담감조성',
  excessivePraise: '#신뢰강조',
  linkIncluded: '#링크포함',
  imageIncluded: '#이미지포함',
};

const STAGE_TAGS = {
  stage2: ['#비밀공유', '#개인사', '#신뢰강조'],
  stage3: ['#부담감조성', '#금전언급', '#링크포함', '#이미지포함'],
};

const MOCK_ITEMS: TimelineCardItem[] = [
  {
    id: 'mock-0',
    groupLabel: '오늘',
    dateLabel: '4월 24일',
    title: '처음 인사',
    subtitle: '최근 도움·부담과 관련된 이야기가 등장했어요.',
    tags: ['#부담감조성', '#금전언급'],
    status: 'pending',
    birdState: 'healthy',
  },
  {
    id: 'mock-1',
    groupLabel: 'Day 5',
    dateLabel: '4월 16일',
    title: '신뢰를 강조하는 말이 많아졌어요',
    subtitle: '개인적인 사연이 조금씩 더 공유되었어요.',
    tags: ['#비밀공유', '#신뢰강조'],
    status: 'learned',
    birdState: 'uneasy',
  },
  {
    id: 'mock-2',
    groupLabel: 'Day 1',
    dateLabel: '4월 12일',
    title: '처음 인사를 나눴어요',
    subtitle: '조용히 관계가 시작되었어요.',
    tags: ['#첫인사'],
    status: 'learned',
    birdState: 'healthy',
  },
];

function formatMonthDay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  if (!month || !day) return date;
  return `${month}월 ${day}일`;
}

function buildTagsFromFlags(flags: ReturnType<typeof useDayRecords>['records'][0]['flags']) {
  const tags: string[] = [];
  if (flags.moneyRequest) tags.push(TAG_MAP.moneyRequest);
  if (flags.favorRequest) tags.push(TAG_MAP.favorRequest);
  if (flags.excessivePraise) tags.push(TAG_MAP.excessivePraise);
  if (flags.linkIncluded) tags.push(TAG_MAP.linkIncluded);
  if (flags.imageIncluded) tags.push(TAG_MAP.imageIncluded);
  return tags.length > 0 ? tags : ['#일상대화'];
}

function buildTitleSubtitle(flags: ReturnType<typeof useDayRecords>['records'][0]['flags']) {
  if (flags.moneyRequest) {
    return {
      title: '금전과 관련된 말이 있었어요',
      subtitle: '부담으로 느껴질 수 있는 표현이 등장했어요.',
    };
  }
  if (flags.favorRequest) {
    return {
      title: '도움 요청이 등장했어요',
      subtitle: '부탁이 이어지기 시작했어요.',
    };
  }
  if (flags.excessivePraise) {
    return {
      title: '칭찬이 잦아졌어요',
      subtitle: '신뢰를 강조하는 말이 늘어났어요.',
    };
  }
  if (flags.linkIncluded) {
    return {
      title: '외부 링크가 포함됐어요',
      subtitle: '링크를 주고받는 대화가 있었어요.',
    };
  }
  if (flags.imageIncluded) {
    return {
      title: '이미지가 포함됐어요',
      subtitle: '사진을 공유하는 흐름이 있었어요.',
    };
  }
  return {
    title: '오늘의 대화',
    subtitle: '차분한 흐름으로 이어졌어요.',
  };
}

function deriveStage(tags: string[], totalCount: number) {
  if (tags.some((tag) => STAGE_TAGS.stage3.includes(tag))) return 3;
  if (tags.some((tag) => STAGE_TAGS.stage2.includes(tag))) return 2;
  if (totalCount >= 3) return 1;
  return 0;
}

function mapBirdState(state?: ModelBirdState): VisualBirdState {
  if (!state) return 'healthy';
  if (state === 'calm') return 'healthy';
  if (state === 'cautious') return 'uneasy';
  if (state === 'anxious') return 'distorted';
  if (state === 'relieved') return 'healthy';
  if (state === 'growing') return 'healthy';
  return 'healthy';
}

const WARNING_MESSAGE = '이 기록은 잠시 멈춰 다시 살펴볼 만한 부분이 있어요.';

export default function TimelineScreen() {
  const router = useRouter();
  const { records, markImmediateRiskShown } = useDayRecords();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [riskTargetId, setRiskTargetId] = useState<string | null>(null);
  const [warningTarget, setWarningTarget] = useState<TimelineCardItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const todayKey = useMemo(() => getSeoulDateKey(), []);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => b.date.localeCompare(a.date)),
    [records]
  );

  const items = useMemo(() => {
    if (sortedRecords.length === 0) return MOCK_ITEMS;
    return sortedRecords.map((record, index) => {
      const tags = buildTagsFromFlags(record.flags);
      const titles = buildTitleSubtitle(record.flags);
      const isToday = record.date === todayKey;
      const groupLabel = isToday ? '오늘' : `Day ${index + 1}`;

      return {
        id: record.id,
        groupLabel,
        dateLabel: formatMonthDay(record.date),
        title: titles.title,
        subtitle: titles.subtitle,
        tags,
        status: record.learned ? 'learned' : 'pending',
        birdState: mapBirdState(record.birdState),
        __flags: record.flags,
      } as TimelineCardItem & { __flags: typeof record.flags };
    });
  }, [sortedRecords, todayKey]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    const flagKey = FILTER_FLAG_MAP[filter];
    return items.filter((item) => {
      const flags = (item as TimelineCardItem & { __flags?: ReturnType<typeof useDayRecords>['records'][0]['flags'] }).__flags;
      return flags ? flags[flagKey] : item.tags.join(' ').includes(CHIP_LABELS[filter]);
    });
  }, [filter, items]);

  const recentTags = useMemo(() => {
    return items.slice(0, 3).flatMap((item) => item.tags);
  }, [items]);

  const stageIndex = useMemo(() => deriveStage(recentTags, items.length), [recentTags, items.length]);

  const last7Count = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return sortedRecords.filter((record) => {
      const date = new Date(record.date + 'T00:00:00');
      const hasSignal = Object.values(record.flags).some(Boolean);
      return hasSignal && date >= cutoff;
    }).length;
  }, [sortedRecords]);

  const highSignalToday = useMemo(() => {
    const today = sortedRecords[0];
    if (!today) return false;
    const count = Object.values(today.flags).filter(Boolean).length;
    return today.flags.moneyRequest || count >= 2;
  }, [sortedRecords]);

  useEffect(() => {
    const candidate = records.find(
      (record) =>
        !record.immediateRiskShown &&
        ((record.immediateRisk?.scamUrl ?? false) ||
          (record.immediateRisk?.reportedAccount ?? false) ||
          (record.immediateRisk?.aiImage ?? false)),
    );
    if (candidate) {
      setRiskTargetId(candidate.id);
    }
  }, [records]);

  const riskLabels = useMemo(() => {
    if (!riskTargetId) return [];
    const target = records.find((record) => record.id === riskTargetId);
    if (!target || !target.immediateRisk) return [];
    return [
      target.immediateRisk.scamUrl ? '신고된 링크' : null,
      target.immediateRisk.reportedAccount ? '신고된 계좌' : null,
      target.immediateRisk.aiImage ? '합성 이미지' : null,
    ].filter(Boolean) as string[];
  }, [records, riskTargetId]);

  const handleRiskDismiss = async () => {
    if (riskTargetId) {
      const target = records.find((record) => record.id === riskTargetId);
      if (target) {
        await markImmediateRiskShown(target.date);
      }
    }
    setRiskTargetId(null);
  };

  const handleRiskReport = async () => {
    if (riskTargetId) {
      const target = records.find((record) => record.id === riskTargetId);
      if (target) {
        await markImmediateRiskShown(target.date);
      }
    }
    setRiskTargetId(null);
    router.push('/(tabs)/profile/report');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <TopBar onPressSettings={() => setSettingsOpen(true)} />

            <JourneyHeader activeIndex={stageIndex} birdState="healthy" onRewindPress={() => { /* TODO: rewind modal */ }} />

            <Pressable style={styles.warningButton} onPress={() => setWarningOpen(true)} accessibilityRole="button">
              <View style={styles.warningButtonLeft}>
                <Ionicons name="alert-circle" size={16} color="#6c5f56" />
                <Text style={styles.warningButtonText}>주의 흐름 살펴보기</Text>
              </View>
              <View style={styles.warningBadge}>
                <Text style={styles.warningBadgeText}>
                  {highSignalToday ? '오늘 강한 신호' : `최근 7일 ${last7Count}개 신호`}
                </Text>
              </View>
            </Pressable>

            <FilterChips selected={filter} onSelect={setFilter} />
          </View>
        }
        renderItem={({ item }) => (
          <TimelineCard
            item={item}
            onPress={() =>
              router.push({
                pathname: '/timeline/[id]',
                params: { id: item.id },
              })
            }
            onWarningPress={() => setWarningTarget(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {warningTarget ? (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>확인해 볼까요?</Text>
            <Text style={styles.overlayItem}>{WARNING_MESSAGE}</Text>
            <View style={styles.overlayActions}>
              <Pressable style={styles.overlayButton} onPress={() => setWarningTarget(null)}>
                <Text style={styles.overlayButtonText}>닫기</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {riskTargetId ? (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>이미 신고된 사기 정보입니다.</Text>
            <View style={styles.overlayList}>
              {riskLabels.map((label) => (
                <Text key={label} style={styles.overlayItem}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.overlayActions}>
              <Pressable style={styles.overlayButtonGhost} onPress={() => void handleRiskDismiss()}>
                <Text style={styles.overlayGhostText}>닫기</Text>
              </Pressable>
              <Pressable style={styles.overlayButton} onPress={() => void handleRiskReport()}>
                <Text style={styles.overlayButtonText}>Report로 이동</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <SettingsMenu visible={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <SignalWarningSheet visible={warningOpen} records={sortedRecords} onClose={() => setWarningOpen(false)} />
    </SafeAreaView>
  );
}

const CHIP_LABELS: Record<FilterKey, string> = {
  all: '전체',
  money: '금전',
  favor: '부탁',
  praise: '과한칭찬',
  link: '링크',
  image: '이미지',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerWrap: {
    gap: 16,
    paddingBottom: 8,
  },
  warningButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warningButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningButtonText: {
    fontSize: 13,
    color: '#5d4e45',
    fontWeight: '600',
  },
  warningBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(215, 191, 176, 0.5)',
  },
  warningBadgeText: {
    fontSize: 11,
    color: '#6d5f55',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 64,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5f5147',
  },
  iconRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  separator: {
    height: 12,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(50, 40, 32, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  overlayCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#f7eeea',
    padding: 18,
    gap: 10,
  },
  overlayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5c4e44',
  },
  overlayList: {
    gap: 6,
  },
  overlayItem: {
    fontSize: 13,
    color: '#7b6c62',
  },
  overlayActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  overlayButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
  },
  overlayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5d4e45',
  },
  overlayButtonGhost: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  overlayGhostText: {
    fontSize: 13,
    color: '#7b6c62',
  },
});



