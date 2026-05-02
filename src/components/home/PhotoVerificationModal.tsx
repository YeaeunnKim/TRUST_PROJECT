import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  onAccepted: () => void;
  onRejected: () => void;
  onClose: () => void;
};

type Phase = 'idle' | 'preview';

export default function PhotoVerificationModal({ visible, onAccepted, onRejected, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setPhase('idle');
      setImageUri(null);
    }
  }, [visible]);

  const pickFromCamera = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setPhase('preview');
    }
  }, []);

  const pickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setPhase('preview');
    }
  }, []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="닫기">
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>

          <Text style={styles.title}>사진 확인 요청</Text>
          <Text style={styles.description}>
            {'현재는 커플 연결 전이라 직접 사진을\n업로드하고 확인하는 방식으로 동작해요.'}
          </Text>

          {phase === 'idle' && (
            <View style={styles.section}>
              <Pressable style={styles.primaryBtn} onPress={pickFromCamera} accessibilityRole="button">
                <Text style={styles.primaryBtnText}>카메라로 촬영</Text>
              </Pressable>
              <Pressable style={styles.ghostBtn} onPress={pickFromLibrary} accessibilityRole="button">
                <Text style={styles.ghostBtnText}>갤러리에서 선택</Text>
              </Pressable>
            </View>
          )}

          {phase === 'preview' && imageUri && (
            <View style={styles.section}>
              <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
              <Pressable onPress={pickFromLibrary} style={styles.rePickBtn}>
                <Text style={styles.rePickText}>다시 선택하기</Text>
              </Pressable>
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.halfBtn, styles.ghostBtn]}
                  onPress={onRejected}
                  accessibilityRole="button">
                  <Text style={styles.ghostBtnText}>거절</Text>
                </Pressable>
                <Pressable
                  style={[styles.halfBtn, styles.primaryBtn]}
                  onPress={onAccepted}
                  accessibilityRole="button">
                  <Text style={styles.primaryBtnText}>수락</Text>
                </Pressable>
              </View>
            </View>
          )}
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
    gap: 10,
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
  closeBtnText: {
    fontSize: 16,
    color: '#7b6c62',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#5d4e45',
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: '#7b6c62',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: '#e8d5c8',
  },
  rePickBtn: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  rePickText: {
    fontSize: 12,
    color: '#9a8a7d',
    textDecorationLine: 'underline',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfBtn: {
    flex: 1,
  },
  primaryBtn: {
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
  ghostBtn: {
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(189, 159, 145, 0.5)',
  },
  ghostBtnText: {
    fontSize: 14,
    color: '#9a8a7d',
  },
});
