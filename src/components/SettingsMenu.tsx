import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, SafeAreaView, StyleSheet, Switch, Text, View } from 'react-native';

import { useAuth } from '@/src/context/auth-context';

type SettingsMenuProps = {
  visible: boolean;
  onClose: () => void;
};

const PANEL_WIDTH = 360;
const VIBRATION_KEY = 'birdguard.settings.vibration';
const NOTIFICATION_KEY = 'birdguard.settings.notification';

export default function SettingsMenu({ visible, onClose }: SettingsMenuProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [vibrationOn, setVibrationOn] = useState(true);
  const [notificationOn, setNotificationOn] = useState(true);
  const slideX = useRef(new Animated.Value(PANEL_WIDTH)).current;

  useEffect(() => {
    let mounted = true;
    if (!visible) {
      slideX.setValue(PANEL_WIDTH);
      return () => {
        mounted = false;
      };
    }
    const load = async () => {
      const [vibrationRaw, notificationRaw] = await Promise.all([
        AsyncStorage.getItem(VIBRATION_KEY),
        AsyncStorage.getItem(NOTIFICATION_KEY),
      ]);
      if (!mounted) return;
      if (vibrationRaw !== null) setVibrationOn(vibrationRaw === 'true');
      if (notificationRaw !== null) setNotificationOn(notificationRaw === 'true');
    };
    void load();
    slideX.setValue(PANEL_WIDTH);
    Animated.timing(slideX, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
    return () => {
      mounted = false;
    };
  }, [slideX, visible]);

  if (!visible) return null;

  const handleProfile = () => {
    onClose();
    router.push('/(tabs)/profile/edit');
  };

  const handleLogout = async () => {
    onClose();
    await signOut();
  };

  const toggleVibration = async (next: boolean) => {
    setVibrationOn(next);
    await AsyncStorage.setItem(VIBRATION_KEY, String(next));
  };

  const toggleNotification = async (next: boolean) => {
    setNotificationOn(next);
    await AsyncStorage.setItem(NOTIFICATION_KEY, String(next));
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.panel, { transform: [{ translateX: slideX }] }]}> 
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.headerRow}>
            <Pressable onPress={onClose} style={styles.backButton} accessibilityRole="button">
              <Ionicons name="chevron-back" size={22} color="#6c5f56" />
            </Pressable>
            <Text style={styles.title}>설정</Text>
          </View>

          <Text style={styles.sectionTitle}>시스템 설정</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>진동</Text>
            <Switch
              value={vibrationOn}
              onValueChange={toggleVibration}
              trackColor={{ false: '#e1d5cd', true: '#d9bda9' }}
              thumbColor="#f7f1ea"
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>알림</Text>
            <Switch
              value={notificationOn}
              onValueChange={toggleNotification}
              trackColor={{ false: '#e1d5cd', true: '#d9bda9' }}
              thumbColor="#f7f1ea"
            />
          </View>

          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>개인/보안</Text>
          <Pressable style={styles.itemButton} onPress={handleProfile} accessibilityRole="button">
            <Text style={styles.itemText}>상대 정보 수정</Text>
          </Pressable>
          <Pressable style={[styles.itemButton, styles.logoutButton]} onPress={() => void handleLogout()} accessibilityRole="button">
            <Text style={styles.logoutText}>로그아웃</Text>
          </Pressable>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(50, 40, 32, 0.18)',
  },
  panel: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    backgroundColor: '#f7eeea',
    paddingTop: 8,
    gap: 14,
    shadowColor: 'rgba(93, 78, 69, 0.18)',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: 360,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5c4e44',
  },
  sectionTitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#6f6258',
  },
  sectionSpacing: {
    marginTop: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLabel: {
    fontSize: 14,
    color: '#5d4e45',
  },
  itemButton: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  itemText: {
    fontSize: 14,
    color: '#5d4e45',
  },
  logoutButton: {
    backgroundColor: 'transparent',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5d4e45',
  },
});
