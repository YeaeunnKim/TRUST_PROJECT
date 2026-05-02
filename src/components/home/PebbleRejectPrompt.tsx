import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  onGoThrow: () => void;
  onCancel: () => void;
};

export default function PebbleRejectPrompt({ visible, onGoThrow, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>신뢰가 흔들렸나요?</Text>
          <Text style={styles.body}>
            돌멩이를 던지면 병아리의 신뢰도가 내려가요.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={onGoThrow} accessibilityRole="button">
            <Text style={styles.primaryBtnText}>돌멩이 던지러 가기</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={onCancel} accessibilityRole="button">
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(52, 42, 34, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#f8f0eb',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#5d4e45',
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    color: '#7b6c62',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  primaryBtn: {
    width: '100%',
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5d4e45',
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  cancelText: {
    fontSize: 13,
    color: '#9a8a7d',
  },
});
