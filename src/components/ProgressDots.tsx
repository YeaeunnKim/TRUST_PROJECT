import React from 'react';
import { StyleSheet, View } from 'react-native';

type ProgressDotsProps = {
  total: number;
  currentIndex: number;
};

export default function ProgressDots({ total, currentIndex }: ProgressDotsProps) {
  if (total <= 0) return null;

  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={`dot-${index}`}
          style={[styles.dot, index === currentIndex ? styles.dotActive : styles.dotInactive]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#7f7065',
  },
  dotInactive: {
    backgroundColor: 'rgba(127, 112, 101, 0.35)',
  },
});
