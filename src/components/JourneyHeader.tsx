import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

import BirdCharacter, { type BirdState } from '@/src/components/BirdCharacter';

const STAGE_LABELS = ['처음', '대화 잦아짐', '공유 많아짐', '주제 변화'] as const;

type JourneyHeaderProps = {
  activeIndex: number;
  caption?: string;
  onRewindPress?: () => void;
  birdState?: BirdState;
};

export default function JourneyHeader({ activeIndex, caption, onRewindPress, birdState = 'healthy' }: JourneyHeaderProps) {
  const [debugOpen, setDebugOpen] = React.useState(false);
  const [debugIndex, setDebugIndex] = React.useState<number | null>(null);
  const maxIndex = STAGE_LABELS.length - 1;
  const resolvedIndex = Math.max(0, Math.min(debugIndex ?? activeIndex, maxIndex));
  const progressRatio = maxIndex <= 0 ? 0 : resolvedIndex / maxIndex;

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.debugButton}
        onPress={() => setDebugOpen(true)}
        accessibilityRole="button">
        <Text style={styles.debugButtonText}>디버그</Text>
      </Pressable>
      <View style={styles.hero}>
        <ImageBackground
          source={require('@/assets/images/timelinebg.png')}
          style={styles.heroImage}
          imageStyle={styles.heroImageInner}
          resizeMode="cover"
        >
          <View style={[styles.trackWrap, styles.trackOverlay]}>
            <View style={styles.labelRow}>
          {STAGE_LABELS.map((label, index) => (
            <Text
              key={label}
              style={[
                styles.stageLabel,
                index > resolvedIndex && styles.stageLabelHidden,
                index < resolvedIndex && styles.stageLabelCompleted,
                index === resolvedIndex && styles.stageLabelActive,
              ]}>
              {label}
            </Text>
          ))}
        </View>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${progressRatio * 100}%` }]} />
          <View style={styles.checkpointRow}>
            {STAGE_LABELS.map((_, index) => (
              <View
                key={`checkpoint-${index}`}
                style={[
                  styles.checkpoint,
                  index > resolvedIndex && styles.checkpointHidden,
                  index < resolvedIndex && styles.checkpointCompleted,
                  index === resolvedIndex ? styles.checkpointActive : styles.checkpointInactive,
                ]}>
                <View style={styles.checkpointCore} />
              </View>
            ))}
          </View>
        </View>
      </View>
          <View style={styles.heroBirdWrap} pointerEvents="none">
            <View style={styles.heroBirdScale}>
              <BirdCharacter state={birdState} />
            </View>
          </View>
        </ImageBackground>
      </View>

      <View style={styles.captionRow}>
        <Text style={styles.captionText}>{caption ?? '처음부터 여기까지, 이렇게 흘러왔어요.'}</Text>
        {onRewindPress ? (
          <Pressable style={styles.rewindButton} onPress={onRewindPress} accessibilityRole="button">
            <Text style={styles.rewindText}>이 흐름을 한 번에 보기</Text>
          </Pressable>
        ) : null}
      </View>
      {debugOpen ? (
        <View style={styles.debugOverlay}>
          <Pressable style={styles.debugBackdrop} onPress={() => setDebugOpen(false)} />
          <View style={styles.debugSheet}>
            <Text style={styles.debugTitle}>단계 선택</Text>
            {STAGE_LABELS.map((label, index) => (
              <Pressable
                key={label}
                style={[
                  styles.debugOption,
                  index === resolvedIndex && styles.debugOptionActive,
                ]}
                onPress={() => {
                  setDebugIndex(index);
                  setDebugOpen(false);
                }}>
                <Text
                  style={[
                    styles.debugOptionText,
                    index === resolvedIndex && styles.debugOptionTextActive,
                  ]}>
                  {label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.debugClear}
              onPress={() => {
                setDebugIndex(null);
                setDebugOpen(false);
              }}>
              <Text style={styles.debugClearText}>자동으로 돌아가기</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    backgroundColor: '#f7eeea',
    padding: 16,
    gap: 14,
    shadowColor: 'rgba(93, 78, 69, 0.18)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 3,
  },
  trackWrap: {
    gap: 8,
  },
  trackOverlay: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stageLabel: {
    fontSize: 11,
    color: '#b1a39a',
  },
  stageLabelHidden: {
    opacity: 0,
  },
  stageLabelCompleted: {
    color: '#9a8b80',
    fontWeight: '500',
  },
  stageLabelActive: {
    color: '#7f7065',
    fontWeight: '600',
  },
  track: {
    position: 'relative',
    height: 14,
    justifyContent: 'center',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(217, 187, 170, 0.8)',
  },
  checkpointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  checkpoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(195, 180, 170, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkpointHidden: {
    opacity: 0,
  },
  checkpointCore: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  checkpointActive: {
    backgroundColor: '#cfae9b',
    transform: [{ scale: 1.05 }],
  },
  checkpointCompleted: {
    backgroundColor: 'rgba(201, 174, 155, 0.75)',
  },
  debugButton: {
    position: 'absolute',
    left: 12,
    top: -18,
    zIndex: 2,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  debugButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7b6c62',
  },
  debugOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(50, 40, 32, 0.25)',
  },
  debugSheet: {
    width: '86%',
    borderRadius: 16,
    backgroundColor: '#f7eeea',
    padding: 16,
    gap: 8,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5f5147',
    marginBottom: 4,
  },
  debugOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  debugOptionActive: {
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
  },
  debugOptionText: {
    fontSize: 13,
    color: '#6f5f55',
  },
  debugOptionTextActive: {
    fontWeight: '600',
    color: '#5d4e45',
  },
  debugClear: {
    paddingVertical: 8,
    alignSelf: 'flex-end',
  },
  debugClearText: {
    fontSize: 12,
    color: '#8b7a6f',
  },
  checkpointInactive: {
    backgroundColor: 'rgba(195, 180, 170, 0.4)',
  },
  hero: {
    height: 170,
    borderRadius: 18,
    backgroundColor: '#f3e7e1',
    overflow: 'hidden',
  },
  heroImage: {
    flex: 1,
  },
  heroImageInner: {
    borderRadius: 18,
    transform: [{ scale: 1.08 }, { translateY: 4 }],
  },
  heroBirdWrap: {
    position: 'absolute',
    right: 20,
    bottom: 26,
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBirdScale: {
    transform: [{ scale: 0.34 }],
  },
  captionRow: {
    gap: 6,
  },
  captionText: {
    fontSize: 12,
    color: '#7b6c62',
  },
  rewindButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  rewindText: {
    fontSize: 12,
    color: '#8b7a6f',
  },
});
