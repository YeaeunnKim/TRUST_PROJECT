import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import LearnScreen from '@/src/screens/LearnScreen';
import { useDayRecords } from '@/src/context/day-records-context';
import { getSeoulDateKey } from '@/src/utils/date';

export default function LearnNotepadModal() {
  const { records } = useDayRecords();
  const todayKey = useMemo(() => getSeoulDateKey(), []);
  const todayRecord = useMemo(
    () => records.find((record) => record.date === todayKey),
    [records, todayKey]
  );

  const insightLines = useMemo(() => {
    if (!todayRecord) return [];
    const flags = todayRecord.flags;
    const lines: string[] = [];
    if (flags.moneyRequest) lines.push('금전 관련 표현이 있었어요.');
    if (flags.favorRequest) lines.push('부탁/도움 요청이 있었어요.');
    if (flags.excessivePraise) lines.push('과한 칭찬 표현이 있었어요.');
    if (flags.linkIncluded) lines.push('외부 링크가 포함됐어요.');
    if (flags.imageIncluded) lines.push('이미지가 포함됐어요.');
    return lines.slice(0, 3);
  }, [todayRecord]);

  const insightContent = (
    <View>
      <Text style={styles.insightTitle}>오늘의 분석</Text>
      {insightLines.length === 0 ? (
        <Text style={styles.insightBody}>오늘은 특별한 징후 없이 조용히 흘러갔어요.</Text>
      ) : (
        <View style={styles.insightList}>
          {insightLines.map((line) => (
            <Text key={line} style={styles.insightBody}>
              {line}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} />
      <View style={styles.notepad}>
        <View style={styles.notepadHeader}>
          <View style={styles.headerLine} />
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </View>
        <View style={styles.content}>
          <LearnScreen closeOnComplete insightContent={insightContent} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  notepad: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
    borderRadius: 26,
    backgroundColor: '#f8f0eb',
    overflow: 'hidden',
    height: '82%',
    minHeight: 420,
  },
  content: {
    flex: 1,
  },
  notepadHeader: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(232, 202, 191, 0.35)',
  },
  headerLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(160, 132, 112, 0.2)',
    bottom: 8,
  },
  closeButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  closeText: {
    fontSize: 12,
    color: '#7b6c62',
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6e5f54',
    marginBottom: 6,
  },
  insightList: {
    gap: 4,
  },
  insightBody: {
    fontSize: 12,
    color: '#7b6c62',
    lineHeight: 18,
  },
});
