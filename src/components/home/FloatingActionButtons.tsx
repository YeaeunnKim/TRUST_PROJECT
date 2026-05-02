import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onToast: (message: string) => void;
  onSpyPress?: () => void | Promise<void>;
  onMailboxPress?: () => void;
};

export default function FloatingActionButtons({ onSpyPress, onMailboxPress }: Props) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        onPress={onSpyPress}
        accessibilityRole="button"
        accessibilityLabel="염탐하기 — 상대방에게 사진 인증 요청 보내기">
        <Image
          source={require('../../../assets/images/spy-icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.label}>염탐하기</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        onPress={onMailboxPress}
        accessibilityRole="button"
        accessibilityLabel="우체통 — 사과문 기록 보기">
        <Image
          source={require('../../../assets/images/mailbox-icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.label}>우체통</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 18,
    top: 28,
    alignItems: 'flex-start',
    gap: 22,
    zIndex: 15,
    elevation: 15,
  },
  btn: {
    alignItems: 'center',
    gap: 5,
    padding: 8,
  },
  btnPressed: {
    opacity: 0.68,
  },
  icon: {
    width: 44,
    height: 44,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#7b6c62',
    textAlign: 'center',
  },
});
