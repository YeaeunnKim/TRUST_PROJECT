import React, { useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onToast: (message: string) => void;
  onSpyPress?: () => void | Promise<void>;
};

export default function FloatingActionButtons({ onToast, onSpyPress }: Props) {
  const handleSendClick = useCallback(() => {
    onToast('우편함 기능은 곧 추가될 예정이에요.');
  }, [onToast]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        onPress={onSpyPress}
        accessibilityRole="button"
        accessibilityLabel="염탐하기 — 상대방에게 사진 인증 요청 보내기">
        <View style={styles.circle}>
          <Image
            source={require('../../../assets/images/spy-icon.png')}
            style={styles.icon}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.label}>염탐하기</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        onPress={handleSendClick}
        accessibilityRole="button"
        accessibilityLabel="우체통 — 우편함 기능 (준비 중)">
        <View style={styles.circle}>
          <Image
            source={require('../../../assets/images/mailbox-icon.png')}
            style={styles.icon}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.label}>우체통</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 18,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 22,
    zIndex: 15,
    elevation: 15,
  },
  btn: {
    alignItems: 'center',
    gap: 5,
  },
  btnPressed: {
    opacity: 0.68,
  },
  circle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(248, 240, 235, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5d4e45',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(189, 159, 145, 0.35)',
  },
  icon: {
    width: 24,
    height: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#7b6c62',
    textAlign: 'center',
  },
});
