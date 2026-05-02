import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import InlineToast from '@/src/components/InlineToast';
import LearnCard from '@/src/components/LearnCard';
import ProgressDots from '@/src/components/ProgressDots';
import { useDayRecords } from '@/src/context/day-records-context';
import { useTimeline } from '@/src/context/timeline-context';
import type { BirdState } from '@/src/models/bird-state';
import type { DayRecord } from '@/src/models/day-record';
import { formatDateLabel, getSeoulDateKey } from '@/src/utils/date';

type LearnScreenProps = {
  onCompleted?: (record: DayRecord) => void | Promise<void>;
  closeOnComplete?: boolean;
  insightContent?: React.ReactNode;
};

function deriveBirdState(record: DayRecord): BirdState {
  const flags = record.flags;
  const riskyCount = [
    flags.moneyRequest,
    flags.favorRequest,
    flags.excessivePraise,
    flags.linkIncluded,
    flags.imageIncluded,
  ].filter(Boolean).length;

  if (riskyCount >= 2) return 'anxious';
  if (riskyCount === 1) return 'cautious';
  return 'calm';
}

function buildTags(record: DayRecord): string[] {
  const tags: string[] = [];
  if (record.flags.moneyRequest) tags.push('금전');
  if (record.flags.favorRequest) tags.push('부탁');
  if (record.flags.excessivePraise) tags.push('과한 칭찬');
  if (record.flags.linkIncluded) tags.push('링크');
  if (record.flags.imageIncluded) tags.push('이미지');
  return tags;
}

export default function LearnScreen({ onCompleted, closeOnComplete = false, insightContent }: LearnScreenProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);

  const { records, markLearnedToday } = useDayRecords();
  const { addEntry } = useTimeline();
  const todayKey = useMemo(() => getSeoulDateKey(), []);
  const todayRecord = useMemo(
    () => records.find((record) => record.date === todayKey),
    [records, todayKey]
  );

  const demoSentences = [
    '오늘은 조금 천천히 이야기하고 싶어.',
    '이번만 도와주면 꼭 갚을게.',
    '사진을 하나만 더 보내줄 수 있어?',
  ];
  const demoNativeSentences = [
    'I want to talk a little more slowly today.',
    'Could you help me just this once? I will pay you back.',
    'Could you send just one more photo?',
  ];

  const useDemo = !todayRecord || (todayRecord.nativeSentences?.length ?? 0) === 0;
  const sentences = (useDemo ? demoSentences : todayRecord?.extractedSentences ?? []).slice(0, 3);
  const nativeSentences = useDemo ? demoNativeSentences : todayRecord?.nativeSentences ?? [];
  const learned = todayRecord?.learned ?? false;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewed, setViewed] = useState<number[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [completeMessage, setCompleteMessage] = useState('');
  const [carouselWidth, setCarouselWidth] = useState(width - 32);

  const cardWidth = Math.max(240, carouselWidth);

  useEffect(() => {
    if (sentences.length === 0) return;
    setCurrentIndex(0);
    setViewed([0]);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [sentences.length]);

  const progressText = sentences.length > 0 ? `${currentIndex + 1}/${sentences.length}` : '';
  const canComplete = learned || (sentences.length > 0 && viewed.length >= sentences.length);

  const translate = (_sentence: string, index: number) => {
    if (nativeSentences[index]) return nativeSentences[index];
    return '(번역 준비중)';
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1100);
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    showToast('복사했어요');
  };

  const handleComplete = async () => {
    if (!todayRecord) {
      setCompleteMessage('오늘 학습을 마쳤어요.');
      if (closeOnComplete) {
        router.back();
      }
      return;
    }
    const birdState = deriveBirdState(todayRecord);
    const updated = await markLearnedToday(birdState);
    if (!updated) return;
    setCompleteMessage('오늘 학습을 마쳤어요.');

    const summary = todayRecord.extractedSentences?.[0] ?? '오늘의 대화를 기록했어요.';
    await addEntry({
      id: todayKey,
      date: todayKey,
      summary,
      tags: buildTags(todayRecord),
      birdState,
      createdAt: new Date().toISOString(),
      sourceFileName: todayRecord.sourceFileName,
    });

    if (onCompleted) {
      await onCompleted(updated);
    }
    if (closeOnComplete) {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>오늘의 학습</Text>
          <Text style={styles.subtitle}>{useDemo ? '오늘' : formatDateLabel(todayKey)}</Text>
          <Text style={styles.helper}>상대의 말, 상대의 언어로 다시 말해봐요.</Text>
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{progressText}</Text>
          <ProgressDots total={sentences.length} currentIndex={currentIndex} />
        </View>

        <View
          style={styles.carouselWrap}
          onLayout={(event) => setCarouselWidth(event.nativeEvent.layout.width)}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            scrollEnabled={sentences.length > 1}
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth}
            decelerationRate="fast"
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
              setCurrentIndex(nextIndex);
              setViewed((prev) => (prev.includes(nextIndex) ? prev : [...prev, nextIndex]));
            }}
            contentContainerStyle={styles.carousel}>
            {sentences.map((sentence, index) => (
              <View key={`${sentence}-${index}`} style={[styles.cardWrap, { width: cardWidth }]}>
                <LearnCard
                  korean={sentence}
                  nativeText={translate(sentence, index)}
                  onCopy={() => void handleCopy(translate(sentence, index))}
                />
              </View>
            ))}
          </ScrollView>
        </View>

        <InlineToast message={toastMessage} visible={toastVisible} />

        {insightContent ? <View style={styles.insightWrap}>{insightContent}</View> : null}

        <Pressable
          style={[styles.completeButton, (!canComplete || learned) && styles.completeButtonDisabled]}
          onPress={() => void handleComplete()}
          disabled={!canComplete || learned}>
          <Text style={styles.completeText}>{learned ? '완료됨' : '오늘 학습 완료'}</Text>
        </Pressable>

        {completeMessage ? <Text style={styles.completeMessage}>{completeMessage}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 12,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#5f5147',
  },
  subtitle: {
    fontSize: 14,
    color: '#8b7b6e',
  },
  helper: {
    fontSize: 13,
    color: '#807167',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressText: {
    fontSize: 13,
    color: '#7b6c62',
  },
  carousel: {
    paddingVertical: 8,
    paddingBottom: 4,
  },
  carouselWrap: {
    width: '100%',
  },
  cardWrap: {
    paddingHorizontal: 0,
  },
  completeButton: {
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
    marginTop: 6,
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5d4e45',
  },
  completeMessage: {
    fontSize: 13,
    color: '#7b6c62',
  },
  insightWrap: {
    borderRadius: 16,
    backgroundColor: '#f7eeea',
    padding: 12,
  },
});
