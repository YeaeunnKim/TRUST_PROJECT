import React from 'react';
import { StyleSheet, View } from 'react-native';

export type BirdState = 'healthy' | 'uneasy' | 'distorted' | 'critical';

type BirdCharacterProps = {
  state: BirdState;
  mouthOpen?: boolean;
};

const cfgByState = {
  healthy: {
    headColor: '#FBE9A6',
    bodyColor: '#F7E7A3',
    wingColor: '#EEDB8A',
    bodyShade: '#D9C066',
    eyeColor: '#4A3E35',
    beakColor: '#D9A067',
    blushColor: '#EDB9B1',
    eyeShape: 'round' as const,
    eyeR: 8,
    eyeLineWidth: 18,
    eyeLineHeight: 4,
    eyelidOpacity: 0,
    blushOpacity: 0.25,
    dirtOverlayOpacity: 0,
    postureY: 0,
    headTilt: 0,
    nestClutterOpacity: 0,
  },
  uneasy: {
    headColor: '#EEDFB0',
    bodyColor: '#E7D39F',
    wingColor: '#DAC387',
    bodyShade: '#C8B07A',
    eyeColor: '#50453D',
    beakColor: '#C59666',
    blushColor: '#E3B5AF',
    eyeShape: 'round' as const,
    eyeR: 6,
    eyeLineWidth: 18,
    eyeLineHeight: 4,
    eyelidOpacity: 0.16,
    blushOpacity: 0.18,
    dirtOverlayOpacity: 0.06,
    postureY: 6,
    headTilt: -6,
    nestClutterOpacity: 0.2,
  },
  distorted: {
    headColor: '#DED3B6',
    bodyColor: '#D4C7AE',
    wingColor: '#C7B99E',
    bodyShade: '#B8AB93',
    eyeColor: '#575048',
    beakColor: '#B78B64',
    blushColor: '#DAB2AB',
    eyeShape: 'round' as const,
    eyeR: 4.5,
    eyeLineWidth: 18,
    eyeLineHeight: 4,
    eyelidOpacity: 0.24,
    blushOpacity: 0.12,
    dirtOverlayOpacity: 0.12,
    postureY: 12,
    headTilt: -12,
    nestClutterOpacity: 0.42,
  },
  critical: {
    headColor: '#D5CCB8',
    bodyColor: '#CBC1AE',
    wingColor: '#BEB39F',
    bodyShade: '#B0A48F',
    eyeColor: '#59534C',
    beakColor: '#AD8460',
    blushColor: '#D4ACA5',
    eyeShape: 'line' as const,
    eyeR: 3.5,
    eyeLineWidth: 18,
    eyeLineHeight: 4,
    eyelidOpacity: 0.32,
    blushOpacity: 0.08,
    dirtOverlayOpacity: 0.18,
    postureY: 18,
    headTilt: -18,
    nestClutterOpacity: 0.58,
  },
} as const;

export default function BirdCharacter({ state, mouthOpen = false }: BirdCharacterProps) {
  const cfg = cfgByState[state];
  const isCritical = cfg.eyeShape === 'line';
  const eyeSize = cfg.eyeR * 2;
  const eyeHighlightSize = Math.max(3, cfg.eyeR * 0.55);
  const eyelidHeight = Math.max(2, cfg.eyeR * 0.75);

  return (
    <View style={[styles.container, { transform: [{ translateY: cfg.postureY }] }]}>
      <View style={[styles.body, { backgroundColor: cfg.bodyColor }]}>
        <View style={[styles.bodyShade, { backgroundColor: cfg.bodyShade }]} />
        <View style={[styles.bodyNestBlend, { backgroundColor: cfg.bodyShade }]} />
        <View style={[styles.wingLeft, { backgroundColor: cfg.wingColor }]} />
        <View style={[styles.wingRight, { backgroundColor: cfg.wingColor }]} />

        <View style={[styles.bodyDirtA, { opacity: cfg.dirtOverlayOpacity }]} />
        <View style={[styles.bodyDirtB, { opacity: cfg.dirtOverlayOpacity * 0.9 }]} />
      </View>

      <View style={[styles.neckGap, { backgroundColor: cfg.bodyColor }]} />

      <View
        style={[
          styles.head,
          {
            backgroundColor: cfg.headColor,
            transform: [{ rotate: `${cfg.headTilt}deg` }, { translateX: cfg.postureY * -0.15 }],
          },
        ]}>
        <View style={[styles.headDirtA, { opacity: cfg.dirtOverlayOpacity * 0.95 }]} />
        <View style={[styles.headDirtB, { opacity: cfg.dirtOverlayOpacity * 0.8 }]} />

        <View style={[styles.eyeRow, isCritical && styles.eyeRowCritical]}>
          {isCritical ? (
            <>
              <View
                style={[
                  styles.eyeLine,
                  {
                    width: cfg.eyeLineWidth,
                    height: cfg.eyeLineHeight,
                    borderRadius: 2,
                    backgroundColor: cfg.eyeColor,
                  },
                ]}
              />
              <View
                style={[
                  styles.eyeLine,
                  {
                    width: cfg.eyeLineWidth,
                    height: cfg.eyeLineHeight,
                    borderRadius: 2,
                    backgroundColor: cfg.eyeColor,
                  },
                ]}
              />
            </>
          ) : (
            <>
              <View
                style={[
                  styles.eye,
                  {
                    width: eyeSize,
                    height: eyeSize,
                    borderRadius: cfg.eyeR,
                    backgroundColor: cfg.eyeColor,
                  },
                ]}>
                <View
                  style={[
                    styles.eyeHighlight,
                    {
                      width: eyeHighlightSize,
                      height: eyeHighlightSize,
                      borderRadius: eyeHighlightSize / 2,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.eyelid,
                    {
                      height: eyelidHeight,
                      opacity: cfg.eyelidOpacity,
                    },
                  ]}
                />
              </View>

              <View
                style={[
                  styles.eye,
                  {
                    width: eyeSize,
                    height: eyeSize,
                    borderRadius: cfg.eyeR,
                    backgroundColor: cfg.eyeColor,
                  },
                ]}>
                <View
                  style={[
                    styles.eyeHighlight,
                    {
                      width: eyeHighlightSize,
                      height: eyeHighlightSize,
                      borderRadius: eyeHighlightSize / 2,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.eyelid,
                    {
                      height: eyelidHeight,
                      opacity: cfg.eyelidOpacity,
                    },
                  ]}
                />
              </View>
            </>
          )}
        </View>

        <View style={[styles.beak, { backgroundColor: cfg.beakColor }, mouthOpen && styles.beakOpen]} />
        {mouthOpen ? <View style={styles.mouthInner} /> : null}

        <View style={styles.blushRow}>
          <View style={[styles.blush, { backgroundColor: cfg.blushColor, opacity: cfg.blushOpacity }]} />
          <View style={[styles.blush, { backgroundColor: cfg.blushColor, opacity: cfg.blushOpacity }]} />
        </View>
      </View>

      <View style={[styles.clutterA, { opacity: cfg.nestClutterOpacity }]} />
      <View style={[styles.clutterB, { opacity: cfg.nestClutterOpacity * 0.92 }]} />
      <View style={[styles.clutterC, { opacity: cfg.nestClutterOpacity * 0.7 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 220,
    height: 210,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  body: {
    position: 'absolute',
    bottom: 24,
    width: 94,
    height: 80,
    borderTopLeftRadius: 44,
    borderTopRightRadius: 46,
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  bodyShade: {
    position: 'absolute',
    left: 9,
    right: 9,
    bottom: 8,
    height: 22,
    borderRadius: 12,
    opacity: 0.2,
  },
  bodyNestBlend: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 2,
    height: 14,
    borderRadius: 9,
    opacity: 0.14,
  },
  wingLeft: {
    position: 'absolute',
    left: -7,
    top: 33,
    width: 15,
    height: 22,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 7,
    transform: [{ rotate: '-18deg' }],
    opacity: 0.95,
  },
  wingRight: {
    position: 'absolute',
    right: -7,
    top: 33,
    width: 15,
    height: 22,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 8,
    transform: [{ rotate: '18deg' }],
    opacity: 0.95,
  },
  bodyDirtA: {
    position: 'absolute',
    left: 16,
    top: 24,
    width: 18,
    height: 11,
    borderRadius: 8,
    backgroundColor: 'rgba(110, 96, 80, 0.55)',
  },
  bodyDirtB: {
    position: 'absolute',
    right: 18,
    top: 40,
    width: 14,
    height: 9,
    borderRadius: 7,
    backgroundColor: 'rgba(110, 96, 80, 0.5)',
  },
  neckGap: {
    position: 'absolute',
    bottom: 92,
    width: 16,
    height: 8,
    borderRadius: 4,
    opacity: 0.95,
  },
  head: {
    position: 'absolute',
    bottom: 92,
    width: 94,
    height: 86,
    borderTopLeftRadius: 46,
    borderTopRightRadius: 44,
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headDirtA: {
    position: 'absolute',
    left: 20,
    top: 18,
    width: 14,
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(108, 95, 82, 0.55)',
  },
  headDirtB: {
    position: 'absolute',
    right: 20,
    top: 30,
    width: 10,
    height: 6,
    borderRadius: 5,
    backgroundColor: 'rgba(108, 95, 82, 0.48)',
  },
  eyeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 0,
  },
  eyeRowCritical: {
    gap: 6,
    marginTop: 2,
  },
  eye: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingLeft: 3,
    paddingTop: 3,
    overflow: 'hidden',
  },
  eyeLine: {
    marginTop: 6,
  },
  eyeHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
  },
  eyelid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: 'rgba(94, 82, 73, 0.55)',
  },
  beak: {
    marginTop: 7,
    width: 11,
    height: 11,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  beakOpen: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  mouthInner: {
    position: 'absolute',
    top: 56,
    width: 12,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(96, 74, 60, 0.6)',
  },
  blushRow: {
    position: 'absolute',
    top: 46,
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  blush: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  clutterA: {
    position: 'absolute',
    bottom: 30,
    left: 92,
    width: 10,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(142, 123, 106, 0.9)',
    transform: [{ rotate: '-15deg' }],
  },
  clutterB: {
    position: 'absolute',
    bottom: 28,
    right: 92,
    width: 8,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(142, 123, 106, 0.9)',
    transform: [{ rotate: '13deg' }],
  },
  clutterC: {
    position: 'absolute',
    bottom: 36,
    right: 106,
    width: 10,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(142, 123, 106, 0.82)',
    transform: [{ rotate: '-10deg' }],
  },
});
