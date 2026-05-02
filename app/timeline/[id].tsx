import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDayRecords } from '@/src/context/day-records-context';

const FLAG_ROWS = [
  { key: 'moneyRequest', label: '���� ���� ǥ��' },
  { key: 'favorRequest', label: '��Ź/���� ��û' },
  { key: 'excessivePraise', label: '���� Ī��/����' },
  { key: 'linkIncluded', label: '�ܺ� ��ũ ����' },
  { key: 'imageIncluded', label: '�̹��� ����' },
] as const;

function formatDate(date: string) {
  return date.replace(/-/g, '.');
}

function buildTags(flags: Record<string, boolean>) {
  const tags: string[] = [];
  if (flags.moneyRequest) tags.push('#�������');
  if (flags.favorRequest) tags.push('#�δ㰨����');
  if (flags.excessivePraise) tags.push('#�ŷڰ���');
  if (flags.linkIncluded) tags.push('#��ũ����');
  if (flags.imageIncluded) tags.push('#�̹�������');
  return tags.length > 0 ? tags : ['#�ϻ��ȭ'];
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
    return '(���� �غ���)';
  };

  const tags = useMemo(() => (record ? buildTags(record.flags) : []), [record]);

  const riskLabels = useMemo(() => {
    if (!record?.immediateRisk) return [];
    return [
      record.immediateRisk.scamUrl ? '�Ű��� ��ũ' : null,
      record.immediateRisk.reportedAccount ? '�Ű��� ����' : null,
      record.immediateRisk.aiImage ? '�ռ� �̹���' : null,
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
    router.push('/(tabs)');
  };

  if (!record) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>�ش� ��¥�� ����� �����</Text>
          <Pressable style={styles.homeButton} onPress={() => router.back()}>
            <Text style={styles.homeButtonText}>�ڷ�</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>�ڷ�</Text>
        </Pressable>

        <Text style={styles.title}>{formatDate(record.date)}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>������ ����</Text>
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
          <Text style={styles.sectionTitle}>������ �±�</Text>
          <View style={styles.tagRow}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>������ üũ</Text>
          <View style={styles.flags}>
            {FLAG_ROWS.map((flag) => (
              <View key={flag.key} style={styles.flagRow}>
                <Text style={styles.flagLabel}>{flag.label}</Text>
                <Text style={styles.flagValue}>{record.flags[flag.key] ? '����' : '����'}</Text>
              </View>
            ))}
          </View>
        </View>

        {record.immediateRisk && riskLabels.length > 0 ? (
          <View style={styles.riskBox}>
            <Text style={styles.riskTitle}>�̹� �Ű��� ����</Text>
            {riskLabels.map((label) => (
              <Text key={label} style={styles.riskItem}>
                {label}
              </Text>
            ))}
            <Pressable style={styles.riskButton} onPress={() => router.push('/(tabs)')}>
              <Text style={styles.riskButtonText}>Report�� �̵�</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {showOverlay ? (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>�̹� �Ű��� ��� �����Դϴ�.</Text>
            <View style={styles.overlayList}>
              {riskLabels.map((label) => (
                <Text key={label} style={styles.overlayItem}>
                  {label}
                </Text>
              ))}
            </View>
            <View style={styles.overlayActions}>
              <Pressable style={styles.overlayButtonGhost} onPress={() => void handleDismiss()}>
                <Text style={styles.overlayGhostText}>�ݱ�</Text>
              </Pressable>
              <Pressable style={styles.overlayButton} onPress={() => void handleReport()}>
                <Text style={styles.overlayButtonText}>Report�� �̵�</Text>
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
