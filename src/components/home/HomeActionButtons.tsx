import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import CameraCaptureModal from '@/src/components/camera/CameraCaptureModal';
import PebbleAnimation from '@/src/components/animation/PebbleAnimation';
import { createVerificationRequest } from '@/src/lib/verificationRequests';

// TODO: Replace with real current user ID from auth context once verification backend is ready.
const MOCK_REQUESTER_ID = 'user_me';
const MOCK_TARGET_ID = 'user_partner';

type ToastState = { message: string; key: number } | null;

function InlineToast({ toast }: { toast: ToastState }) {
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [toast, opacity]);

  if (!toast) return null;
  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Text style={styles.toastText}>{toast.message}</Text>
    </Animated.View>
  );
}

/** Sends a pebble/nudge notification to the partner. */
async function sendPebbleNotification(_targetUserId: string): Promise<void> {
  // TODO: POST /api/notifications/pebble with { targetUserId } once notification backend is ready.
  console.log('[sendPebbleNotification] nudge sent to', _targetUserId);
}

export default function HomeActionButtons() {
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState('');
  const [isPebbleAnimating, setIsPebbleAnimating] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = useCallback((message: string) => {
    setToast({ message, key: Date.now() });
  }, []);

  // ── 염탐하기 ──────────────────────────────────────────────────────────────

  const handleSpyPress = useCallback(async () => {
    try {
      const req = await createVerificationRequest('mock_couple', MOCK_REQUESTER_ID, MOCK_TARGET_ID);
      setCurrentRequestId(req.id);
      setCameraModalOpen(true);
    } catch {
      showToast('요청을 만들 수 없어요. 다시 시도해 주세요.');
    }
  }, [showToast]);

  const handleCameraClose = useCallback(() => {
    setCameraModalOpen(false);
  }, []);

  const handleUploaded = useCallback(
    (imageUrl: string) => {
      console.log('[HomeActionButtons] photo uploaded:', imageUrl);
      showToast('사진이 전달됐어요!');
    },
    [showToast]
  );

  // ── 돌맹이 ────────────────────────────────────────────────────────────────

  const handlePebblePress = useCallback(async () => {
    if (isPebbleAnimating) return;
    setIsPebbleAnimating(true);
    await sendPebbleNotification(MOCK_TARGET_ID);
  }, [isPebbleAnimating]);

  const handlePebbleAnimationEnd = useCallback(() => {
    setIsPebbleAnimating(false);
    showToast('상대 병아리에게 콕 알림을 보냈어요.');
  }, [showToast]);

  // ── 보내기 ────────────────────────────────────────────────────────────────

  const handleSendClick = useCallback(() => {
    showToast('우편함 기능은 곧 추가될 예정이에요.');
  }, [showToast]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        {/* 염탐하기 */}
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          onPress={handleSpyPress}
          accessibilityRole="button"
          accessibilityLabel="염탐하기 — 상대방에게 사진 인증 요청 보내기">
          <View style={styles.iconCircle}>
            <Ionicons name="eye-outline" size={24} color="#5d4e45" />
          </View>
          <Text style={styles.label}>염탐하기</Text>
        </Pressable>

        {/* 돌맹이 */}
        <View style={styles.pebbleBtnWrapper}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && styles.actionBtnPressed,
              isPebbleAnimating && styles.actionBtnDisabled,
            ]}
            onPress={handlePebblePress}
            disabled={isPebbleAnimating}
            accessibilityRole="button"
            accessibilityLabel="돌맹이 던지기 — 상대 병아리에게 콕 알림 보내기">
            <View style={styles.iconCircle}>
              <Ionicons name="radio-button-off-outline" size={24} color="#5d4e45" />
            </View>
            <Text style={styles.label}>돌맹이</Text>
          </Pressable>
          <PebbleAnimation
            isAnimating={isPebbleAnimating}
            onAnimationEnd={handlePebbleAnimationEnd}
          />
        </View>

        {/* 보내기 */}
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          onPress={handleSendClick}
          accessibilityRole="button"
          accessibilityLabel="보내기 — 우편함 기능 (준비 중)">
          <View style={styles.iconCircle}>
            <Ionicons name="paper-plane-outline" size={24} color="#5d4e45" />
          </View>
          <Text style={styles.label}>보내기</Text>
        </Pressable>
      </View>

      <InlineToast toast={toast} />

      <CameraCaptureModal
        visible={cameraModalOpen}
        requestId={currentRequestId}
        onClose={handleCameraClose}
        onUploaded={handleUploaded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: 4,
  },
  actionBtnPressed: {
    opacity: 0.7,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(232, 202, 191, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(80, 64, 48, 0.15)',
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7b6c62',
    textAlign: 'center',
  },
  pebbleBtnWrapper: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  toast: {
    alignSelf: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(95, 74, 57, 0.12)',
  },
  toastText: {
    fontSize: 12,
    color: '#7b6c62',
    textAlign: 'center',
  },
});
