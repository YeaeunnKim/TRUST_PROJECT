import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DayRecord } from '@/src/models/day-record';

type DayRecordCardProps = {
  record: DayRecord;
  onPress: () => void;
};

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

export default function DayRecordCard({ record, onPress }: DayRecordCardProps) {
  const activeFlags = FLAG_ROWS.filter((row) => record.flags[row.key]);
  const preview = record.extractedSentences[0];

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <Text style={styles.date}>{formatDate(record.date)}</Text>
        <Text style={record.learned ? styles.statusDone : styles.statusPending}>
          {record.learned ? '학습 완료' : '미완료'}
        </Text>
      </View>

      {activeFlags.length > 0 ? (
        <View style={styles.flags}>
          {activeFlags.map((flag) => (
            <Text key={flag.key} style={styles.flagText}>
              • {flag.label}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.flagEmpty}>오늘은 특별한 항목이 없었어요.</Text>
      )}

      {preview ? (
        <Text style={styles.preview} numberOfLines={1}>
          {preview}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: '#f7eeea',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5c4e44',
  },
  statusDone: {
    fontSize: 12,
    color: '#7b6c62',
  },
  statusPending: {
    fontSize: 12,
    color: 'rgba(123, 108, 98, 0.7)',
  },
  flags: {
    gap: 4,
  },
  flagText: {
    fontSize: 13,
    color: '#7b6c62',
  },
  flagEmpty: {
    fontSize: 13,
    color: '#8c7d72',
  },
  preview: {
    fontSize: 12,
    color: '#9a8a7d',
  },
});
