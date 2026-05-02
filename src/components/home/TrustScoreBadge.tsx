import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

type Props = {
  score: number;
};

export default function TrustScoreBadge({ score }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevScore = useRef(score);

  useEffect(() => {
    if (prevScore.current === score) return;
    prevScore.current = score;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.22, useNativeDriver: true, speed: 28, bounciness: 6 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 28, bounciness: 4 }),
    ]).start();
  }, [score, scale]);

  return (
    <Animated.View style={[styles.badge, { transform: [{ scale }] }]}>
      <Text style={styles.text}>신뢰도 {score}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 22,
    backgroundColor: 'rgba(248, 240, 235, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(189, 159, 145, 0.45)',
    shadowColor: '#5d4e45',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 7,
    elevation: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b5c52',
    letterSpacing: 0.3,
  },
});
