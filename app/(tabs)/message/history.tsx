import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ImageBackground, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import TopBar from '@/src/components/TopBar';
import { loadAllApologies, type ApologyHistoryItem } from '@/src/storage/apology-storage';
import { formatDateLabel } from '@/src/utils/date';

export default function ApologyHistoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ApologyHistoryItem[]>([]);

  useEffect(() => {
    async function load() {
      const loaded = await loadAllApologies();
      setItems(loaded);
    }
    load();
  }, []);

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
          <Text style={styles.subtitle}>작성한 사과문을 날짜 순으로 확인할 수 있어요.</Text>

          {items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>아직 등록된 사과문이 없습니다.</Text>
              <Pressable style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>사과문 작성하러 가기</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {items.map((item) => (
                <View key={item.dateKey} style={styles.recordCard}>
                  <View style={styles.pin} />
                  <View style={styles.recordHeader}>
                    <Text style={styles.recordDate}>{formatDateLabel(item.dateKey)}</Text>
                    <Text style={styles.recordTitle}>{item.title}</Text>
                  </View>
                  <Text style={styles.recordBody}>{item.body}</Text>
                </View>
              ))}
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
    marginTop: 0,
    marginBottom: 0,
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
    padding: 24,
    borderWidth: 1,
    borderColor: '#ecd8c7',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
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
    gap: 8,
  },
  recordDate: {
    fontSize: 12,
    color: '#9b8b80',
    letterSpacing: 0.4,
  },
  recordTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4f3f36',
    textDecorationLine: 'underline',
    textDecorationColor: '#d7b29a',
    textDecorationStyle: 'solid',
    lineHeight: 28,
  },
  recordBody: {
    marginTop: 10,
    fontSize: 15,
    color: '#5d4e45',
    lineHeight: 24,
  },
});
