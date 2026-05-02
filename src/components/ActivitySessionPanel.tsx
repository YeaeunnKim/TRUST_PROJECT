import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  type ActivityEvent,
  type ActivityEventType,
  useActivitySession,
  type UseActivitySessionOptions,
} from '@/src/hooks/useActivitySession';

const EVENT_LABEL: Record<ActivityEventType, string> = {
  SESSION_STARTED: '세션 시작',
  SESSION_ENDED: '세션 종료',
  APP_BACKGROUND: '백그라운드 진입',
  APP_INACTIVE: '비활성 (전환 중)',
  APP_FOREGROUND: '포그라운드 복귀',
  RETURN_FROM_HIDDEN: '장시간 후 복귀',
};

const EVENT_TONE: Record<ActivityEventType, { bg: string; fg: string }> = {
  SESSION_STARTED: { bg: '#dfe9d6', fg: '#4f6042' },
  SESSION_ENDED: { bg: '#ecd2ca', fg: '#7c4a3d' },
  APP_BACKGROUND: { bg: '#e3dcef', fg: '#5e4e7a' },
  APP_INACTIVE: { bg: '#efe6dc', fg: '#7b6c62' },
  APP_FOREGROUND: { bg: '#dfe9d6', fg: '#4f6042' },
  RETURN_FROM_HIDDEN: { bg: '#f3e3c7', fg: '#7a5e2c' },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

type ActivitySessionPanelProps = {
  hiddenReturnThresholdSec?: number;
  maxEvents?: number;
  onEvent?: UseActivitySessionOptions['onEvent'];
  onLongReturn?: UseActivitySessionOptions['onLongReturn'];
};

export default function ActivitySessionPanel(props: ActivitySessionPanelProps) {
  const { session, events, start, stop, clearEvents } = useActivitySession({
    hiddenReturnThresholdSec: props.hiddenReturnThresholdSec,
    maxEvents: props.maxEvents,
    onEvent: props.onEvent,
    onLongReturn: props.onLongReturn,
  });

  const isRunning = !!session;

  const reversedEvents = useMemo(() => events.slice().reverse(), [events]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>화면 복귀 감지</Text>
          <Text style={styles.subtitle}>
            앱이 백그라운드/잠금 상태에 들어갔다가 돌아올 때 이벤트를 기록합니다.
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isRunning ? '#dfe9d6' : '#efe2d8' },
          ]}>
          <Text
            style={[
              styles.statusText,
              { color: isRunning ? '#4f6042' : '#8a7b6f' },
            ]}>
            {isRunning ? '감지 중' : '대기'}
          </Text>
        </View>
      </View>

      <View style={styles.controlRow}>
        {isRunning ? (
          <Pressable
            onPress={stop}
            style={[styles.button, styles.buttonSecondary]}
            accessibilityRole="button">
            <Text style={[styles.buttonText, styles.buttonSecondaryText]}>
              감지 종료
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={start}
            style={[styles.button, styles.buttonPrimary]}
            accessibilityRole="button">
            <Text style={[styles.buttonText, styles.buttonPrimaryText]}>
              감지 시작
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={clearEvents}
          style={[styles.button, styles.buttonGhost]}
          accessibilityRole="button">
          <Text style={[styles.buttonText, styles.buttonGhostText]}>
            이벤트 비우기
          </Text>
        </Pressable>
      </View>

      <View style={styles.eventListWrap}>
        <Text style={styles.sectionLabel}>이벤트 타임라인 · {events.length}건</Text>
        {events.length === 0 ? (
          <Text style={styles.emptyText}>
            세션을 시작한 뒤 앱을 잠그거나 다른 앱으로 전환해보세요.
          </Text>
        ) : (
          <ScrollView style={styles.eventScroll} nestedScrollEnabled>
            {reversedEvents.map((ev) => (
              <EventRow key={ev.id} event={ev} />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function EventRow({ event }: { event: ActivityEvent }) {
  const tone = EVENT_TONE[event.type];
  return (
    <View style={styles.eventRow}>
      <Text style={styles.eventTime}>{formatTime(event.timestamp)}</Text>
      <View style={[styles.eventTag, { backgroundColor: tone.bg }]}>
        <Text style={[styles.eventTagText, { color: tone.fg }]}>
          {EVENT_LABEL[event.type]}
        </Text>
      </View>
      {typeof event.hiddenDurationSec === 'number' ? (
        <Text style={styles.eventMeta}>{event.hiddenDurationSec}초</Text>
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5d4e45',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8a7b6f',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  controlRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttonPrimary: {
    backgroundColor: '#c79b86',
  },
  buttonPrimaryText: {
    color: '#fff8f3',
  },
  buttonSecondary: {
    backgroundColor: '#efe2d8',
  },
  buttonSecondaryText: {
    color: '#5d4e45',
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e6d6cb',
  },
  buttonGhostText: {
    color: '#8a7b6f',
  },
  eventListWrap: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8a7b6f',
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#9a8a7d',
  },
  eventScroll: {
    maxHeight: 220,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  eventTime: {
    width: 64,
    fontSize: 11,
    color: '#9a8a7d',
    fontVariant: ['tabular-nums'],
  },
  eventTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  eventTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  eventMeta: {
    fontSize: 11,
    color: '#7b6c62',
  },
});
