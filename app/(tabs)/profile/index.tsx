import React, { useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import TopBar from '@/src/components/TopBar';
import SettingsMenu from '@/src/components/SettingsMenu';
import { useProfile } from '@/src/context/profile-context';

export default function ProfileScreen() {
  const { profile } = useProfile();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const hasProfile = Boolean(
    profile && (profile.name || profile.age || profile.job || profile.country || profile.nativeLanguage || profile.howWeMet || profile.photoUri)
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TopBar onPressSettings={() => setSettingsOpen(true)} />

        <Text style={styles.title}>프로필</Text>
        <Text style={styles.subtitle}>상대의 정보를 차분히 기록해두세요.</Text>

        <View style={styles.card}>
          <View style={styles.photoRow}>
            <View style={styles.photoCircle}>
              {profile?.photoUri ? (
                <Image source={{ uri: profile.photoUri }} style={styles.photoImage} />
              ) : (
                <Text style={styles.photoPlaceholder}>사진 없음</Text>
              )}
            </View>
            <View style={styles.infoColumn}>
              <Text style={styles.infoLabel}>이름</Text>
              <Text style={styles.infoValue}>{profile?.name || '—'}</Text>

              <Text style={styles.infoLabel}>나이</Text>
              <Text style={styles.infoValue}>{profile?.age || '—'}</Text>

              <Text style={styles.infoLabel}>직업</Text>
              <Text style={styles.infoValue}>{profile?.job || '—'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>국가</Text>
              <Text style={styles.infoValue}>{profile?.country || '—'}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>모국어</Text>
              <Text style={styles.infoValue}>{profile?.nativeLanguage || '—'}</Text>
            </View>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>어떻게 만났나요?</Text>
            <Text style={styles.infoValue}>{profile?.howWeMet || '—'}</Text>
          </View>
        </View>

        {!hasProfile ? (
          <Text style={styles.emptyText}>설정에서 상대 정보 수정을 선택해 기록을 시작해보세요.</Text>
        ) : (
          <Text style={styles.hintText}>수정은 설정에서 상대 정보 수정으로 진행돼요.</Text>
        )}
      </ScrollView>

      <SettingsMenu visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#5f5147',
  },
  subtitle: {
    fontSize: 14,
    color: '#807167',
  },
  card: {
    borderRadius: 22,
    backgroundColor: '#f7eeea',
    padding: 16,
    gap: 12,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  photoPlaceholder: {
    fontSize: 12,
    color: '#9a8a7d',
  },
  infoColumn: {
    flex: 1,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoBlock: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9b8b80',
  },
  infoValue: {
    fontSize: 14,
    color: '#5d4e45',
  },
  emptyText: {
    fontSize: 12,
    color: '#9a8a7d',
  },
  hintText: {
    fontSize: 12,
    color: '#8b7a6f',
  },
});
