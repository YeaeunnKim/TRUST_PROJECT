import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDayRecords } from '@/src/context/day-records-context';

const FLAG_ROWS = [
  { key: 'moneyRequest', label: '금전 관련 표현' },
  { key: 'favorRequest', label: '부탁/도움 요청' },
  { key: 'excessivePraise', label: '과한 칭찬/의존' },
  { key: 'linkIncluded', label: '외부 링크 포함' },
  { key: 'imageIncluded', label: '이미지 포함' },
] as const;

function formatDate(date: string) {
  return date.replace(/-/g, '.');
}

function buildTags(flags: Record<string, boolean>) {
  const tags: string[] = [];
  if (flags.moneyRequest) tags.push('#금전언급');
  if (flags.favorRequest) tags.push('#부담감조성');
  if (flags.excessivePraise) tags.push('#신뢰강조');
  if (flags.linkIncluded) tags.push('#링크포함');
  if (flags.imageIncluded) tags.push('#이미지포함');
  return tags.length > 0 ? tags : ['#일상대화'];
}

export default function TimelineDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { records, markImmediateRiskShown } = useDayRecords();
  const [showOverlay, setShowOverlay] = useState(false);

  const record = useMemo(
    () => records.find((item) => item.id === id),
    [records, id]
  );

  const nativeSentences = record?.nativeSentences ?? [];
  const translate = (sentence: string, index: number) => {
    if (nativeSentences[index]) return nativeSentences[index];
    return '(번역 준비중)';
  };

  const tags = useMemo(() => (record ? buildTags(record.flags) : []), [record]);

  const riskLabels = useMemo(() => {
    if (!record?.immediateRisk) return [];
    return [
      record.immediateRisk.scamUrl ? '신고된 링크' : null,
      record.immediateRisk.reportedAccount ? '신고된 계좌' : null,
      record.immediateRisk.aiImage ? '합성 이미지' : null,
    ].filter(Boolean) as string[];
  }, [record]);

  const shouldShowOverlay =
    record &&
    !record.immediateRiskShown &&
    (record.immediateRisk?.scamUrl ||
      record.immediateRisk?.reportedAccount ||
      record.immediateRisk?.aiImage);

  useMemo(() => {
    if (shouldShowOverlay) {
      setShowOverlay(true);
    }
  }, [shouldShowOverlay]);

  const handleDismiss = async () => {
    if (record) {
      await markImmediateRiskShown(record.date);
    }
    setShowOverlay(false);
  };

  const handleReport = async () => {
    if (record) {
      await markImmediateRiskShown(record.date);
    }
    setShowOverlay(false);
    router.push('/(tabs)/profile/report');
  };

  if (!record) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>해당 날짜의 기록이 없어요</Text>
          <Pressable style={styles.homeButton} onPress={() => router.back()}>
            <Text style={styles.homeButtonText}>뒤로</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>뒤로</Text>
        </Pressable>

        <Text style={styles.title}>{formatDate(record.date)}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 문장</Text>
          <View style={styles.cards}>
            {record.extractedSentences.map((sentence, index) => (
              <View key={`${sentence}-${index}`} style={styles.card}>
                <Text style={styles.cardKorean}>{sentence}</Text>
                <Text style={styles.cardNative}>{translate(sentence, index)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 태그</Text>
          <View style={styles.tagRow}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 체크</Text>
          <View style={styles.flags}>
            {FLAG_ROWS.map((flag) => (
              <View key={flag.key} style={styles.flagRow}>
                <Text style={styles.flagLabel}>{flag.label}</Text>
                <Text style={styles.flagValue}>{record.flags[flag.key] ? '있음' : '없음'}</Text>
              </View>
            ))}
          </View>
        </View>

        {record.immediateRisk && riskLabels.length > 0 ? (
          <View style={styles.riskBox}>
            <Text style={styles.riskTitle}>이미 신고된 정보</Text>
            {riskLabels.map((label) => (
              <Text key={label} style={styles.riskItem}>
                {label}
              </Text>
            ))}
            <Pressable style={styles.riskButton} onPress={() => router.push('/(tabs)/profile/report')}>
              <Text style={styles.riskButtonText}>Report로 이동</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.ctaButton} onPress={() => router.push('/(tabs)/profile')}>
          <Text style={styles.ctaText}>도움이 필요할까요?</Text>
        </Pressable>
      </View>

      {showOverlay ? (
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
              <Pressable style={styles.overlayButtonGhost} onPress={() => void handleDismiss()}>
                <Text style={styles.overlayGhostText}>닫기</Text>
              </Pressable>
              <Pressable style={styles.overlayButton} onPress={() => void handleReport()}>
                <Text style={styles.overlayButtonText}>Report로 이동</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
  },
  container: {
    padding: 16,
    paddingBottom: 120,
    gap: 14,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  backText: {
    fontSize: 12,
    color: '#7b6c62',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#5f5147',
    marginBottom: 4,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6e5f54',
  },
  cards: {
    gap: 12,
  },
  card: {
    borderRadius: 18,
    backgroundColor: '#f7eeea',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardKorean: {
    fontSize: 16,
    lineHeight: 22,
    color: '#5c4e44',
    marginBottom: 8,
  },
  cardNative: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7b6c62',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  tagText: {
    fontSize: 12,
    color: '#7b6c62',
  },
  flags: {
    gap: 6,
    borderRadius: 16,
    backgroundColor: '#f7eeea',
    padding: 14,
  },
  flagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flagLabel: {
    fontSize: 13,
    color: '#7b6c62',
  },
  flagValue: {
    fontSize: 13,
    color: '#5c4e44',
  },
  riskBox: {
    borderRadius: 16,
    backgroundColor: '#f7eeea',
    padding: 14,
    gap: 6,
  },
  riskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6e5f54',
  },
  riskItem: {
    fontSize: 13,
    color: '#7b6c62',
  },
  riskButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
  },
  riskButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5d4e45',
  },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },
  ctaButton: {
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5d4e45',
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
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5f5147',
  },
  homeButton: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
  },
  homeButtonText: {
    fontSize: 13,
    color: '#5d4e45',
  },
});
