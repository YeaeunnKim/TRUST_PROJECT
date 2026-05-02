import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  imageUrl: string;
  onAccepted: () => void;
  onRejected: () => void;
  onClose: () => void;
};

export default function VerificationReviewModal({
  visible,
  imageUrl,
  onAccepted,
  onRejected,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="닫기">
            <Ionicons name="close" size={22} color="#7b6c62" />
          </Pressable>

          <View style={styles.section}>
            <Ionicons name="image-outline" size={36} color="#c4a882" />
            <Text style={styles.title}>사진이 도착했어요</Text>
            <Text style={styles.body}>상대방이 보낸 사진을 확인해주세요.</Text>

            {Platform.OS === 'web' ? (
              <img
                src={imageUrl}
                style={styles.previewImg as unknown as React.CSSProperties}
                alt="상대방 사진"
              />
            ) : (
              <Image source={{ uri: imageUrl }} style={styles.previewImgNative} resizeMode="cover" />
            )}

            <View style={styles.row}>
              <Pressable
                style={[styles.halfBtn, styles.ghostBtn]}
                onPress={onRejected}
                accessibilityLabel="거절">
                <Text style={styles.ghostBtnText}>거절</Text>
              </Pressable>
              <Pressable
                style={[styles.halfBtn, styles.primaryBtn]}
                onPress={onAccepted}
                accessibilityLabel="수락">
                <Text style={styles.primaryBtnText}>수락</Text>
              </Pressable>
            </View>
          </View>
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
  sheet: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#f8f0eb',
    borderRadius: 28,
    padding: 28,
    paddingTop: 36,
  } as const,
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  section: { alignItems: 'center', gap: 12 },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#5d4e45',
    textAlign: 'center',
    marginTop: 4,
  },
  body: { fontSize: 13, color: '#7b6c62', textAlign: 'center', lineHeight: 20 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 18,
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
    paddingHorizontal: 28,
    width: '100%',
    marginTop: 4,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '600', color: '#5d4e45' },
  ghostBtn: {
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(189, 159, 145, 0.5)',
    width: '100%',
  },
  ghostBtnText: { fontSize: 13, color: '#9a8a7d' },
  row: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  halfBtn: { flex: 1 },
  previewImg: {
    width: '100%',
    maxWidth: 340,
    height: 240,
    borderRadius: 14,
    objectFit: 'cover',
  },
  previewImgNative: {
    width: '100%',
    height: 240,
    borderRadius: 14,
  },
});
