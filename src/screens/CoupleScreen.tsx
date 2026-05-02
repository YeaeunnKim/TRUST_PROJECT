import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import CoupleCodeCard from '@/src/components/couple/CoupleCodeCard';
import JoinCoupleCard from '@/src/components/couple/JoinCoupleCard';
import { useCouple } from '@/src/context/couple-context';

export default function CoupleScreen() {
  const { myCouple, isLoading, error, createInvite, joinByCode, disconnect, clearError } =
    useCouple();

  const handleJoin = (code: string) => {
    clearError();
    void joinByCode(code);
  };

  const handleCreate = () => {
    clearError();
    void createInvite();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>커플 연결</Text>
          <Text style={styles.headerSubtitle}>상대방과 코드를 공유해서 연결해요</Text>
        </View>

        {myCouple ? (
          <CoupleCodeCard
            couple={myCouple}
            onDisconnect={() => void disconnect()}
            isLoading={isLoading}
          />
        ) : (
          <JoinCoupleCard
            onCreateInvite={handleCreate}
            onJoin={handleJoin}
            isLoading={isLoading}
            error={error}
          />
        )}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3a2e26',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#9a8a7d',
  },
});
