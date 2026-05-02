import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import CameraCaptureModal from '@/src/components/camera/CameraCaptureModal';
import { createVerificationRequest } from '@/src/lib/verificationRequests';

// TODO: Replace with real user IDs from auth context once backend is ready.
const MOCK_REQUESTER_ID = 'user_me';
const MOCK_TARGET_ID = 'user_partner';

type Props = {
  onToast: (message: string) => void;
};

export default function FloatingActionButtons({ onToast }: Props) {
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState('');

  const handleSpyPress = useCallback(async () => {
    try {
      const req = await createVerificationRequest(MOCK_REQUESTER_ID, MOCK_TARGET_ID);
      setCurrentRequestId(req.id);
      setCameraModalOpen(true);
    } catch {
      onToast('요청을 만들 수 없어요. 다시 시도해 주세요.');
    }
  }, [onToast]);

  const handleSendClick = useCallback(() => {
    onToast('우편함 기능은 곧 추가될 예정이에요.');
  }, [onToast]);

  return (
    <>
      <View style={styles.container} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={handleSpyPress}
          accessibilityRole="button"
          accessibilityLabel="염탐하기 — 상대방에게 사진 인증 요청 보내기">
          <View style={styles.circle}>
            <Ionicons name="eye-outline" size={22} color="#5d4e45" />
          </View>
          <Text style={styles.label}>염탐하기</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={handleSendClick}
          accessibilityRole="button"
          accessibilityLabel="보내기 — 우편함 기능 (준비 중)">
          <View style={styles.circle}>
            <Ionicons name="paper-plane-outline" size={22} color="#5d4e45" />
          </View>
          <Text style={styles.label}>보내기</Text>
        </Pressable>
      </View>

      <CameraCaptureModal
        visible={cameraModalOpen}
        requestId={currentRequestId}
        onClose={() => setCameraModalOpen(false)}
        onUploaded={(url) => {
          console.log('[FloatingActionButtons] photo uploaded:', url);
          setCameraModalOpen(false);
          onToast('사진이 전달됐어요!');
        }}
      />
    </>
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
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#7b6c62',
    textAlign: 'center',
  },
});
