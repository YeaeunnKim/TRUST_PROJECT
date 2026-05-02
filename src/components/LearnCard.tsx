import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type LearnCardProps = {
  korean: string;
  nativeText: string;
  onCopy: () => void;
};

export default function LearnCard({ korean, nativeText, onCopy }: LearnCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>한국어</Text>
      <Text style={styles.koreanText}>{korean}</Text>

      <Text style={styles.sectionLabel}>상대 모국어로</Text>
      <View style={styles.nativeRow}>
        <Text style={styles.nativeText}>{nativeText}</Text>
        <Pressable style={styles.copyButton} onPress={onCopy}>
          <Text style={styles.copyText}>복사</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: '#f7eeea',
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#9a8a7d',
  },
  koreanText: {
    fontSize: 17,
    lineHeight: 24,
    color: '#5c4e44',
  },
  nativeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nativeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: '#7b6c62',
  },
  copyButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  copyText: {
    fontSize: 12,
    color: '#6f6258',
  },
});
