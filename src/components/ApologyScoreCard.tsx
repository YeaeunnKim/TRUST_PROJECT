import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  APOLOGY_BREAKDOWN_MAX,
  type ApologyBreakdown,
  type ApologyScoreResult,
} from '@/src/utils/apologyScoring';

type RowKey = keyof ApologyBreakdown;

const ROW_LABEL: Record<RowKey, string> = {
  responsibility: '책임 인정',
  specificity: '구체성',
  empathy: '공감',
  noExcuse: '변명 없음',
  prevention: '재발 방지',
};

const ROW_KEYS: RowKey[] = [
  'responsibility',
  'specificity',
  'empathy',
  'noExcuse',
  'prevention',
];

type Tone = 'success' | 'warn' | 'danger';

function getTone(total: number): Tone {
  if (total >= 80) return 'success';
  if (total >= 50) return 'warn';
  return 'danger';
}

const TONE_COLOR: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: '#dfe9d6', fg: '#4f6042' },
  warn: { bg: '#f3e3c7', fg: '#7a5e2c' },
  danger: { bg: '#ecd2ca', fg: '#7c4a3d' },
};

type ApologyScoreCardProps = {
  result: ApologyScoreResult;
};

export default function ApologyScoreCard({ result }: ApologyScoreCardProps) {
  const tone = getTone(result.totalScore);
  const toneColor = TONE_COLOR[tone];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>채점 결과</Text>
        <View style={[styles.scoreBadge, { backgroundColor: toneColor.bg }]}>
          <Text style={[styles.scoreValue, { color: toneColor.fg }]}>
            {result.totalScore}
          </Text>
          <Text style={[styles.scoreMax, { color: toneColor.fg }]}> / 100</Text>
        </View>
      </View>

      <View style={styles.rowList}>
        {ROW_KEYS.map((key) => {
          const value = result.breakdown[key];
          const max = APOLOGY_BREAKDOWN_MAX[key];
          const ratio = Math.max(0, Math.min(1, value / max));
          return (
            <View key={key} style={styles.row}>
              <View style={styles.rowMeta}>
                <Text style={styles.rowLabel}>{ROW_LABEL[key]}</Text>
                <Text style={styles.rowValue}>
                  {value} / {max}
                </Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${ratio * 100}%` }]} />
              </View>
            </View>
          );
        })}
      </View>

      {result.summary ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>요약</Text>
          <Text style={styles.bodyText}>{result.summary}</Text>
        </View>
      ) : null}

      {result.weakPoints.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>직접 다시 살펴볼 점</Text>
          <View>
            {result.weakPoints.map((w, i) => (
              <View key={`${i}-${w.slice(0, 8)}`} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>·</Text>
                <Text style={styles.bulletText}>{w}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: '#fdf6f1',
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5d4e45',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreMax: {
    fontSize: 11,
    opacity: 0.75,
  },
  rowList: {
    gap: 8,
  },
  row: {
    gap: 4,
  },
  rowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 12,
    color: '#8a7b6f',
  },
  rowValue: {
    fontSize: 12,
    color: '#5d4e45',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#efe2d8',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#c79b86',
  },
  section: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8a7b6f',
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#5d4e45',
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  bulletDot: {
    color: '#c79b86',
    fontWeight: '700',
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#5d4e45',
  },
});
