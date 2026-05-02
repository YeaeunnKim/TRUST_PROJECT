import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import type { BirdState } from './BirdCharacter';
import EggIcon from './EggIcon';

type NestProps = {
  state: BirdState;
  showEgg?: boolean;
  eggJustLaid?: boolean;
  onEggPress?: () => void;
};

const nestPalette = {
  healthy: {
    base: '#c8a47f',
    twig: '#b68f68',
    paper: '#f2e6d3',
    coin: '#d8c59a',
    note: '#efe2cf',
  },
  uneasy: {
    base: '#b79979',
    twig: '#a78465',
    paper: '#dfd6c7',
    coin: '#ccb995',
    note: '#e2d7c7',
  },
  distorted: {
    base: '#a8876b',
    twig: '#98745a',
    paper: '#d1c6b8',
    coin: '#c3af8d',
    note: '#d6cab9',
  },
  critical: {
    base: '#9d8168',
    twig: '#8f6f59',
    paper: '#c8bfb3',
    coin: '#bba987',
    note: '#cdc3b6',
  },
} as const;

export default function Nest({
  state,
  showEgg = false,
  eggJustLaid = false,
  onEggPress,
}: NestProps) {
  const colors = nestPalette[state];
  const isDistorted = state === 'distorted' || state === 'critical';
  const isCritical = state === 'critical';
  const wobble = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!eggJustLaid) {
      wobble.setValue(0);
      return;
    }

    const sequence = Animated.sequence([
      Animated.timing(wobble, {
        toValue: -2,
        duration: 120,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(wobble, {
        toValue: 2,
        duration: 120,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(wobble, {
        toValue: -1,
        duration: 100,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(wobble, {
        toValue: 0,
        duration: 120,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
    ]);
    sequence.start();
  }, [eggJustLaid, wobble]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: wobble }] }]}>
      <View style={[styles.base, { backgroundColor: colors.base }, state !== 'healthy' && styles.baseUneasy, isDistorted && styles.baseTight]} />
      <View style={[styles.innerSpace, isDistorted && styles.innerSpaceTight]} />
      <View style={styles.innerContactShade} />

      <View style={[styles.twig, styles.twigA, { backgroundColor: colors.twig }]} />
      <View style={[styles.twig, styles.twigB, { backgroundColor: colors.twig }]} />
      <View style={[styles.twig, styles.twigC, { backgroundColor: colors.twig }]} />

      <View style={[styles.paper, styles.paperA, { backgroundColor: colors.paper }]} />
      <View style={[styles.paper, styles.paperB, { backgroundColor: colors.paper }]} />
      <View style={[styles.paper, styles.paperC, { backgroundColor: colors.paper }]} />
      {isDistorted ? <View style={[styles.paper, styles.paperD, { backgroundColor: colors.paper }]} /> : null}

      {state !== 'healthy' ? <View style={[styles.coin, styles.coinA, { backgroundColor: colors.coin }]} /> : null}
      {isDistorted ? <View style={[styles.coin, styles.coinB, { backgroundColor: colors.coin }]} /> : null}
      {state !== 'healthy' ? <View style={[styles.note, styles.noteA, { backgroundColor: colors.note }]} /> : null}
      {isDistorted ? <View style={[styles.note, styles.noteB, { backgroundColor: colors.note }]} /> : null}
      {isCritical ? <View style={[styles.note, styles.noteC, { backgroundColor: colors.note }]} /> : null}
      {isCritical ? <View style={[styles.paper, styles.paperE, { backgroundColor: colors.paper }]} /> : null}

      {showEgg ? (
        <View style={styles.eggPocket}>
          <Pressable
            onPress={onEggPress}
            disabled={!onEggPress}
            hitSlop={10}
            style={styles.eggPressable}
            accessibilityRole="button">
            <EggIcon highlight={eggJustLaid} />
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.frontRim, { backgroundColor: colors.twig }, isDistorted && styles.frontRimTight]} />
      <View style={[styles.frontRimSoft, { backgroundColor: colors.base }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 320,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  base: {
    width: 262,
    height: 78,
    borderRadius: 48,
    opacity: 0.95,
  },
  baseUneasy: {
    width: 274,
    height: 84,
  },
  baseTight: {
    width: 286,
    height: 90,
  },
  innerSpace: {
    position: 'absolute',
    top: 54,
    width: 178,
    height: 34,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 245, 236, 0.42)',
  },
  innerSpaceTight: {
    width: 150,
    height: 30,
    top: 58,
    backgroundColor: 'rgba(255, 245, 236, 0.28)',
  },
  innerContactShade: {
    position: 'absolute',
    top: 68,
    width: 116,
    height: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(108, 88, 71, 0.12)',
  },
  twig: {
    position: 'absolute',
    width: 236,
    height: 10,
    borderRadius: 6,
    opacity: 0.8,
  },
  twigA: {
    top: 42,
    transform: [{ rotate: '7deg' }],
  },
  twigB: {
    top: 64,
    transform: [{ rotate: '-6deg' }],
  },
  twigC: {
    top: 56,
    transform: [{ rotate: '1deg' }],
  },
  paper: {
    position: 'absolute',
    width: 22,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(100, 82, 66, 0.12)',
  },
  paperA: {
    left: 56,
    top: 48,
    transform: [{ rotate: '-14deg' }],
  },
  paperB: {
    right: 50,
    top: 70,
    transform: [{ rotate: '11deg' }],
  },
  paperC: {
    left: 144,
    top: 76,
    transform: [{ rotate: '-8deg' }],
  },
  paperD: {
    right: 102,
    top: 40,
    transform: [{ rotate: '20deg' }],
  },
  paperE: {
    right: 82,
    top: 82,
    transform: [{ rotate: '-14deg' }],
  },
  coin: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(95, 74, 57, 0.14)',
  },
  coinA: {
    left: 88,
    top: 36,
  },
  coinB: {
    right: 92,
    top: 34,
  },
  note: {
    position: 'absolute',
    width: 20,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(95, 74, 57, 0.12)',
  },
  noteA: {
    left: 122,
    top: 30,
    transform: [{ rotate: '-9deg' }],
  },
  noteB: {
    right: 76,
    top: 56,
    transform: [{ rotate: '12deg' }],
  },
  noteC: {
    left: 172,
    top: 48,
    transform: [{ rotate: '8deg' }],
  },
  eggPocket: {
    position: 'absolute',
    right: 64,
    top: 36,
    zIndex: 8,
  },
  eggPressable: {
    padding: 6,
  },
  frontRim: {
    position: 'absolute',
    width: 272,
    height: 30,
    borderRadius: 20,
    bottom: 38,
    zIndex: 3,
    opacity: 0.78,
  },
  frontRimTight: {
    width: 288,
    bottom: 34,
  },
  frontRimSoft: {
    position: 'absolute',
    width: 258,
    height: 20,
    borderRadius: 14,
    bottom: 34,
    zIndex: 4,
    opacity: 0.55,
  },
});
