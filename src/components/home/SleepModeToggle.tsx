import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePresence } from '@/src/context/presence-context';

export default function SleepModeToggle() {
  const { myStatus, isToggling, setSleepMode } = usePresence();
  const enabled = myStatus?.sleepMode ?? false;

  const onPress = () => {
    if (isToggling) return;
    void setSleepMode(!enabled);
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isToggling}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled, disabled: isToggling }}
      style={({ pressed }) => [
        styles.chip,
        enabled ? styles.chipOn : styles.chipOff,
        pressed && styles.chipPressed,
        isToggling && styles.chipDisabled,
      ]}>
      <Ionicons
        name={enabled ? 'moon' : 'moon-outline'}
        size={16}
        color={enabled ? '#f7eeea' : '#7b6c62'}
      />
      <Text style={[styles.label, enabled ? styles.labelOn : styles.labelOff]}>
        {enabled ? '잠자는 중' : '잠자기 모드'}
      </Text>
      <View style={[styles.dot, enabled ? styles.dotOn : styles.dotOff]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    alignSelf: 'flex-start',
  },
  chipOn: {
    backgroundColor: '#5c4e44',
  },
  chipOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(155, 139, 128, 0.32)',
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipDisabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelOn: {
    color: '#f7eeea',
  },
  labelOff: {
    color: '#5d4e45',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOn: {
    backgroundColor: '#f7c280',
  },
  dotOff: {
    backgroundColor: 'transparent',
  },
});
