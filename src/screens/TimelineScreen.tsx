import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BirdCharacter from '@/src/components/BirdCharacter';
import Nest from '@/src/components/Nest';
import TopBar from '@/src/components/TopBar';

// 돌 던지기 기록 타입 (상대방 폰 사용 여부 확인)
type StoneRecord = {
  id: string;
  time: string;
  isUsing: boolean;
};

// 염탐하기 기록 타입 (실시간 사진 요청)
type SpyRecord = {
  id: string;
  time: string;
  status: '수락' | '거절' | '대기중';
};

const STONE_RECORDS: StoneRecord[] = [];
const SPY_RECORDS: SpyRecord[] = [];

const BIRD_SCALE = 0.5;
const BIRD_W = 220;
const BIRD_H = 210;
const SCALED_W = BIRD_W * BIRD_SCALE;   // 110
const SCALED_H = BIRD_H * BIRD_SCALE;   // 105
const OFFSET_L = (BIRD_W / 2) * (BIRD_SCALE - 1); // -55
const OFFSET_T = (BIRD_H / 2) * (BIRD_SCALE - 1); // -52.5

export default function TimelineScreen() {
  const stoneStatusColor = (isUsing: boolean) => (isUsing ? '#d9534f' : '#5cb85c');

  const spyStatusColor = (status: SpyRecord['status']) => {
    if (status === '수락') return '#5cb85c';
    if (status === '거절') return '#d9534f';
    return '#999';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 둥지 카드 */}
        <View style={styles.nestCard}>
          <View style={styles.nestScene}>
            {/* 둥지 그림 배경 — scaleX로 가로를 카드 전체 폭으로 늘림 */}
            <View style={styles.nestGraphic}>
              <View style={styles.nestScaleX}>
                <Nest state="healthy" />
              </View>
            </View>

            {/* 새들 — birdsRow bottom 값으로 둥지 안에 정확히 앉힘 */}
            <View style={styles.birdsRow}>
              <View style={styles.birdSlot}>
                <View style={styles.birdClip}>
                  <View style={[styles.birdInner, { left: OFFSET_L, top: OFFSET_T }]}>
                    <BirdCharacter state="healthy" />
                  </View>
                </View>
                <Text style={styles.birdLabel}>내 병아리</Text>
              </View>

              <View style={styles.birdSlot}>
                <View style={styles.birdClip}>
                  <View style={[styles.birdInner, { left: OFFSET_L, top: OFFSET_T }]}>
                    <BirdCharacter state="uneasy" />
                  </View>
                </View>
                <Text style={styles.birdLabel}>상대방 병아리</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 돌 던지기 기록 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>돌 던지기 기록</Text>
          <Text style={styles.sectionDesc}>상대방이 지금 휴대폰을 사용 중인지 확인한 내역이에요.</Text>

          {STONE_RECORDS.length === 0 ? (
            <Text style={styles.emptyText}>아직 기록이 없어요</Text>
          ) : (
            STONE_RECORDS.map((record) => (
              <View key={record.id} style={styles.recordRow}>
                <Text style={styles.recordTime}>{record.time}</Text>
                <Text style={[styles.recordStatus, { color: stoneStatusColor(record.isUsing) }]}>
                  {record.isUsing ? '사용 중' : '미사용'}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* 염탐하기 기록 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>염탐하기 기록</Text>
          <Text style={styles.sectionDesc}>상대방에게 실시간 사진 전송을 요청한 내역이에요.</Text>

          {SPY_RECORDS.length === 0 ? (
            <Text style={styles.emptyText}>아직 기록이 없어요</Text>
          ) : (
            SPY_RECORDS.map((record) => (
              <View key={record.id} style={styles.recordRow}>
                <Text style={styles.recordTime}>{record.time}</Text>
                <Text style={[styles.recordStatus, { color: spyStatusColor(record.status) }]}>
                  {record.status}
                </Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  // 둥지 카드
  nestCard: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  // 새 + 둥지를 겹치는 고정 높이 컨테이너
  nestScene: {
    width: '100%',
    height: 210,
  },
  // 둥지 그래픽 — 카드 하단에 absolute, overflow:hidden으로 scaleX 클립
  nestGraphic: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    alignItems: 'center',
  },
  // Nest를 가로로 늘려 카드 폭을 채움
  nestScaleX: {
    transform: [{ scaleX: 1.25 }],
  },
  // 새들 — bottom 값으로 둥지 안쪽에 앉힘
  birdsRow: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
  },
  birdSlot: {
    alignItems: 'center',
    gap: 4,
  },
  birdClip: {
    width: SCALED_W,
    height: SCALED_H,
    overflow: 'hidden',
  },
  birdInner: {
    position: 'absolute',
    width: BIRD_W,
    height: BIRD_H,
    transform: [{ scale: BIRD_SCALE }],
  },
  birdLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5d4e45',
  },

  // 공통 섹션
  section: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5d4e45',
  },
  sectionDesc: {
    fontSize: 12,
    color: '#9c8c84',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#b8a89e',
    textAlign: 'center',
    paddingVertical: 12,
  },

  // 기록 행
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  recordTime: {
    fontSize: 13,
    color: '#7b6c62',
  },
  recordStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
});
