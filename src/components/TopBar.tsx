import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

type TopBarProps = {
  style?: ViewStyle;
  onPressSettings?: () => void;
  onPressNotifications?: () => void;
};

const logoSource = require('@/assets/images/logo.png');

export default function TopBar({ style, onPressSettings, onPressNotifications }: TopBarProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.sideSpacer} />
      <Image source={logoSource} style={styles.logo} resizeMode="contain" />
      <View style={styles.iconRow}>
        <Pressable
          style={styles.iconButton}
          accessibilityRole="button"
          onPress={onPressNotifications}>
          <Ionicons name="notifications-outline" size={20} color="#7b6e64" />
        </Pressable>
        <Pressable
          style={styles.iconButton}
          accessibilityRole="button"
          onPress={onPressSettings}>
          <Ionicons name="settings-outline" size={20} color="#7b6e64" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideSpacer: {
    width: 80,
  },
  logo: {
    width: 170,
    height: 60,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
});
