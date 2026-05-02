import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import BirdCharacter, { type BirdState } from '@/src/components/BirdCharacter';

export type TimelineStatus = 'learned' | 'pending';

export type TimelineCardItem = {
  id: string;
  dateLabel: string;
  groupLabel: string;
  title: string;
  subtitle: string;
  tags: string[];
  status: TimelineStatus;
  birdState?: BirdState;
  score?: number;
};

type TimelineCardProps = {
  item: TimelineCardItem;
  onPress: () => void;
};

export default function TimelineCard({ item, onPress }: TimelineCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.groupRow}>
        <Text style={styles.groupLabel}>{item.groupLabel}</Text>
        <Text style={styles.dateLabel}>{item.dateLabel}</Text>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.iconWrap}>
          <View style={styles.birdMiniWrap} pointerEvents="none">
            <View style={styles.birdMiniScale}>
              <BirdCharacter state={item.birdState ?? 'healthy'} />
            </View>
          </View>
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
          <View style={styles.tagRow}>
            {item.tags.map((tag) => (
              <View key={`${item.id}-${tag}`} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {item.score !== undefined && (
          <Text style={styles.scoreText}>{item.score}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: '#f7eeea',
    padding: 14,
    gap: 10,
    shadowColor: 'rgba(93, 78, 69, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 2,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5f5147',
  },
  dateLabel: {
    fontSize: 12,
    color: '#9a8a7d',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  birdMiniWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  birdMiniScale: {
    transform: [{ scale: 0.28 }],
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5d4e45',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7b6c62',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  tagText: {
    fontSize: 11,
    color: '#8a7a6f',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#d9534f',
  },
});
