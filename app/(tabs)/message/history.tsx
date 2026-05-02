import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ImageBackground, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import TopBar from '@/src/components/TopBar';
import { useAuth } from '@/src/context/auth-context';
import { useCouple } from '@/src/context/couple-context';
import { listMyApologies, listPartnerApologies, type ApologyRow } from '@/src/lib/apologies';

type Tab = 'mine' | 'partner';

const STATUS_LABEL: Record<ApologyRow['status'], string> = {
  pending: '검토 대기',
  accepted: '수락됨',
  rejected: '거절됨',
};

const STATUS_TONE: Record<ApologyRow['status'], { bg: string; fg: string }> = {
  pending: { bg: '#f3e3c7', fg: '#7a5e2c' },
  accepted: { bg: '#dfe9d6', fg: '#4f6042' },
  rejected: { bg: '#ecd2ca', fg: '#7c4a3d' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${month}월 ${day}일 ${hh}:${mm}`;
}

export default function ApologyHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { myCouple } = useCouple();
  const [tab, setTab] = useState<Tab>('mine');
  const [mineRows, setMineRows] = useState<ApologyRow[]>([]);
  const [partnerRows, setPartnerRows] = useState<ApologyRow[]>([]);

  const partnerName = useMemo(() => {
    if (!user || !myCouple) return '상대방';
    return myCouple.members.find((m) => m.userId !== user.id)?.username ?? '상대방';
  }, [user, myCouple]);

  const myName = user?.username ?? '나';

  useEffect(() => {
    if (!user) {
      setMineRows([]);
      setPartnerRows([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const [mine, partner] = await Promise.all([
        listMyApologies(user.id),
        listPartnerApologies(user.id),
      ]);
      if (cancelled) return;
      setMineRows(mine);
      setPartnerRows(partner);
    };
    void load();
    const id = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user]);

  const rows = tab === 'mine' ? mineRows : partnerRows;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TopBar />
        <ImageBackground
          source={require('@/assets/images/mailbox-background.png')}
          resizeMode="cover"
          style={styles.backgroundPanel}
          imageStyle={styles.backgroundImageStyle}
        >
          <Text style={styles.title}>사과문 기록</Text>
          <Text style={styles.subtitle}>주고받은 사과문을 모아봤어요.</Text>

          <View style={styles.tabs}>
            <Pressable
              style={[styles.tabBtn, tab === 'mine' && styles.tabBtnActive]}
              onPress={() => setTab('mine')}>
              <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>
                {myName}이 쓴
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, tab === 'partner' && styles.tabBtnActive]}
              onPress={() => setTab('partner')}>
              <Text style={[styles.tabText, tab === 'partner' && styles.tabTextActive]}>
                {partnerName}이 쓴
              </Text>
            </Pressable>
          </View>

          {rows.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {tab === 'mine'
                  ? '아직 작성한 사과문이 없어요.'
                  : '상대가 보낸 사과문이 없어요.'}
              </Text>
              {tab === 'mine' ? (
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                  <Text style={styles.backButtonText}>사과문 작성하러 가기</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.listContainer}>
              {rows.map((item) => {
                const tone = STATUS_TONE[item.status];
                return (
                  <View key={item.id} style={styles.recordCard}>
                    <View style={styles.pin} />
                    <View style={styles.recordHeader}>
                      <View style={styles.headerRow}>
                        <Text style={styles.recordDate}>{formatDate(item.created_at)}</Text>
                        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                          <Text style={[styles.statusPillText, { color: tone.fg }]}>
                            {STATUS_LABEL[item.status]}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.recordTitle}>{item.title || '(제목 없음)'}</Text>
                    </View>
                    <Text style={styles.recordBody}>{item.body}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>AI 점수 {item.ai_score}</Text>
                      <Text style={styles.metaText}>
                        {item.status === 'accepted'
                          ? `신뢰도 +${item.trust_delta} 회복`
                          : item.status === 'rejected'
                            ? '점수 회복 없음'
                            : `수락 시 +${item.trust_delta}`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ImageBackground>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
  },
  container: {
    padding: 16,
    gap: 16,
  },
  backgroundPanel: {
    width: '100%',
    minHeight: 820,
    overflow: 'hidden',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  backgroundImageStyle: {
    opacity: 0.95,
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#5f5147',
    marginTop: -4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7c6d60',
    marginBottom: 10,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 248, 242, 0.9)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#a66f4e',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7b6c62',
  },
  tabTextActive: {
    color: '#fff8f1',
  },
  emptyCard: {
    marginTop: 32,
    backgroundColor: 'rgba(255, 248, 242, 0.92)',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1dfd3',
  },
  emptyText: {
    fontSize: 14,
    color: '#8e7f73',
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#a66f4e',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 18,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  listContainer: {
    gap: 16,
  },
  recordCard: {
    position: 'relative',
    backgroundColor: 'rgba(255, 251, 245, 0.96)',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#ecd8c7',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    gap: 8,
  },
  pin: {
    position: 'absolute',
    top: -8,
    left: 24,
    width: 16,
    height: 16,
    borderRadius: 10,
    backgroundColor: '#c76b55',
    borderWidth: 2,
    borderColor: '#f8f0eb',
  },
  recordHeader: {
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  recordDate: {
    fontSize: 12,
    color: '#9b8b80',
    letterSpacing: 0.4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recordTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4f3f36',
    lineHeight: 24,
  },
  recordBody: {
    fontSize: 14,
    color: '#5d4e45',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0e0d3',
  },
  metaText: {
    fontSize: 12,
    color: '#8e7f73',
    fontWeight: '500',
  },
});
