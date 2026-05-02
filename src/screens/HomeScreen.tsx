import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import BirdCharacter, { type BirdState } from '@/src/components/BirdCharacter';
import DraggablePebble from '@/src/components/home/DraggablePebble';
import FloatingActionButtons from '@/src/components/home/FloatingActionButtons';
import PebbleRejectPrompt from '@/src/components/home/PebbleRejectPrompt';
import TrustScoreBadge from '@/src/components/home/TrustScoreBadge';
import VerificationReviewModal from '@/src/components/home/VerificationReviewModal';
import VerificationUploadModal from '@/src/components/home/VerificationUploadModal';
import Nest from '@/src/components/Nest';
import SettingsMenu from '@/src/components/SettingsMenu';
import TopBar from '@/src/components/TopBar';
import { useAuth } from '@/src/context/auth-context';
import { useCouple } from '@/src/context/couple-context';
import { useDayRecords } from '@/src/context/day-records-context';
import {
  clampTrustScore,
  getTrustScore,
  INITIAL_TRUST_SCORE,
  updateTrustScore,
  addTrustEvent,
} from '@/src/lib/trustScore';
import {
  createVerificationRequest,
  getPendingRequestForTarget,
  getUploadedRequestForRequester,
  reviewVerificationRequest,
  type VerificationRequest,
} from '@/src/lib/verificationRequests';
import { getSeoulDateKey } from '@/src/utils/date';

// ── Chick mood ────────────────────────────────────────────────────────────────

type ChickMood = 'healthy' | 'normal' | 'anxious' | 'critical';

function getChickMood(score: number): ChickMood {
  if (score >= 76) return 'healthy';
  if (score >= 51) return 'normal';
  if (score >= 26) return 'anxious';
  return 'critical';
}

const BIRD_STATE_BY_MOOD: Record<ChickMood, BirdState> = {
  healthy: 'healthy',
  normal: 'uneasy',
  anxious: 'distorted',
  critical: 'critical',
};

const CHICK_LABEL_BY_MOOD: Record<ChickMood, string> = {
  healthy: '병아리가 편안해 보여요.',
  normal: '병아리가 조용히 지켜보고 있어요.',
  anxious: '병아리가 조금 불안해 보여요.',
  critical: '병아리가 많이 지쳐 있어요.',
};

const CHICK_STATUS_BY_MOOD: Record<ChickMood, string> = {
  healthy: '건강함',
  normal: '보통',
  anxious: '불안함',
  critical: '위기',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();
  const { myCouple } = useCouple();
  const { records } = useDayRecords();

  // partner 파생
  const partnerId = useMemo(() => {
    if (!myCouple || !user) return null;
    return myCouple.members.find((m) => m.userId !== user.id)?.userId ?? null;
  }, [myCouple, user]);

  // ── Trust score ────────────────────────────────────────────────────────────

  const [trustScore, setTrustScore] = useState(INITIAL_TRUST_SCORE);

  useEffect(() => {
    if (!user || !myCouple || !partnerId) {
      setTrustScore(INITIAL_TRUST_SCORE);
      return;
    }
    getTrustScore(myCouple.id, user.id, partnerId)
      .then(setTrustScore)
      .catch(() => {});
  }, [user, myCouple, partnerId]);

  // ── Modal / prompt states ─────────────────────────────────────────────────

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pebblePromptOpen, setPebblePromptOpen] = useState(false);
  const [pebbleHighlighted, setPebbleHighlighted] = useState(false);

  // target 용: 상대방이 사진 찍어 전송하는 모달
  const [uploadRequest, setUploadRequest] = useState<VerificationRequest | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // requester 용: 상대방이 보낸 사진을 수락/거절하는 모달
  const [reviewRequest, setReviewRequest] = useState<VerificationRequest | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // ── Toast ────────────────────────────────────────────────────────────────

  const [heroToast, setHeroToast] = useState<string | null>(null);
  const heroToastOpacity = useRef(new Animated.Value(0)).current;

  const showHeroToast = useCallback(
    (msg: string) => {
      setHeroToast(msg);
      heroToastOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(heroToastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(heroToastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setHeroToast(null));
    },
    [heroToastOpacity],
  );

  // ── Polling: pending(target용) / uploaded(requester용) 요청 확인 ──────────

  const shownRequestIds = useRef<Set<string>>(new Set());
  const isPolling = useRef(false);

  const checkRequests = useCallback(async () => {
    if (!user || !partnerId || isPolling.current) return;
    isPolling.current = true;
    try {
      // 내가 target인 pending 요청
      const pending = await getPendingRequestForTarget(user.id);
      if (pending && !shownRequestIds.current.has(pending.id)) {
        shownRequestIds.current.add(pending.id);
        setUploadRequest(pending);
        setUploadModalOpen(true);
        return;
      }

      // 내가 requester이고 상대방이 업로드한 요청
      const uploaded = await getUploadedRequestForRequester(user.id);
      if (uploaded && !shownRequestIds.current.has(uploaded.id)) {
        shownRequestIds.current.add(uploaded.id);
        setReviewRequest(uploaded);
        setReviewModalOpen(true);
      }
    } catch {
      // 네트워크 오류는 조용히 무시 (다음 폴링에서 재시도)
    } finally {
      isPolling.current = false;
    }
  }, [user, partnerId]);

  useEffect(() => {
    if (!user || !partnerId) return;
    void checkRequests();
    const interval = setInterval(() => void checkRequests(), 10_000);
    return () => clearInterval(interval);
  }, [user, partnerId, checkRequests]);

  // ── Chick mood & crossfade animation ─────────────────────────────────────

  const chickMood = getChickMood(trustScore);
  const visualState = BIRD_STATE_BY_MOOD[chickMood];

  const [displayedMood, setDisplayedMood] = useState<ChickMood>(chickMood);
  const birdFade = useRef(new Animated.Value(1)).current;
  const labelOpacity = useRef(new Animated.Value(1)).current;
  const prevMoodRef = useRef<ChickMood | null>(null);

  useEffect(() => {
    if (prevMoodRef.current === null || prevMoodRef.current === chickMood) {
      prevMoodRef.current = chickMood;
      setDisplayedMood(chickMood);
      return;
    }
    prevMoodRef.current = chickMood;

    Animated.parallel([
      Animated.timing(birdFade, { toValue: 0.45, duration: 160, useNativeDriver: true }),
      Animated.timing(labelOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setDisplayedMood(chickMood);
      Animated.parallel([
        Animated.timing(birdFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(labelOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    });
  }, [chickMood, birdFade, labelOpacity]);

  // ── Shake animation ───────────────────────────────────────────────────────

  const birdShake = useRef(new Animated.Value(0)).current;

  const triggerChickReaction = useCallback(() => {
    birdShake.setValue(0);
    Animated.sequence([
      Animated.timing(birdShake, { toValue: 7, duration: 55, useNativeDriver: true }),
      Animated.timing(birdShake, { toValue: -7, duration: 55, useNativeDriver: true }),
      Animated.timing(birdShake, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(birdShake, { toValue: -3, duration: 50, useNativeDriver: true }),
      Animated.timing(birdShake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [birdShake]);

  // ── Day record (TopBar 필요) ──────────────────────────────────────────────

  const todayKey = useMemo(() => getSeoulDateKey(), []);
  void useMemo(() => records.find((r) => r.date === todayKey), [records, todayKey]);

  // ── 염탐하기: partner에게 사진 인증 요청 ─────────────────────────────────

  const handleSpyPress = useCallback(async () => {
    if (!user || !myCouple || !partnerId) {
      showHeroToast('커플을 먼저 연결해주세요.');
      return;
    }
    try {
      await createVerificationRequest(myCouple.id, user.id, partnerId);
      showHeroToast('사진 인증 요청을 보냈어요.');
    } catch (err) {
      showHeroToast(err instanceof Error ? err.message : '요청을 보내지 못했어요.');
    }
  }, [user, myCouple, partnerId, showHeroToast]);

  // ── 사진 업로드 완료 (target → requester에게 전달됨) ─────────────────────

  const handleUploadDone = useCallback(() => {
    setUploadModalOpen(false);
    showHeroToast('사진을 전송했어요.');
  }, [showHeroToast]);

  // ── 사진 수락 (+5) ────────────────────────────────────────────────────────

  const handlePhotoAccepted = useCallback(async () => {
    if (!reviewRequest || !user || !myCouple || !partnerId) return;
    try {
      await reviewVerificationRequest(reviewRequest.id, 'accepted');
      const newScore = await updateTrustScore(myCouple.id, user.id, partnerId, 5);
      await addTrustEvent({
        coupleId: myCouple.id,
        actorId: user.id,
        targetUserId: partnerId,
        type: 'verification_accepted',
        delta: 5,
        message: '사진을 수락해서 신뢰도가 올라갔어요.',
        relatedRequestId: reviewRequest.id,
      });
      setTrustScore(newScore);
      setReviewModalOpen(false);
      showHeroToast('사진을 수락했어요. 신뢰도가 올라갔어요.');
    } catch {
      showHeroToast('신뢰도 업데이트에 실패했어요.');
    }
  }, [reviewRequest, user, myCouple, partnerId, showHeroToast]);

  // ── 사진 거절 → 돌멩이 유도 팝업 ────────────────────────────────────────

  const handlePhotoRejected = useCallback(async () => {
    if (!reviewRequest || !user || !myCouple || !partnerId) return;
    try {
      await reviewVerificationRequest(reviewRequest.id, 'rejected');
      await addTrustEvent({
        coupleId: myCouple.id,
        actorId: user.id,
        targetUserId: partnerId,
        type: 'verification_rejected',
        delta: 0,
        message: '사진을 거절했어요.',
        relatedRequestId: reviewRequest.id,
      });
    } catch {
      // 거절 기록 실패는 UI 흐름을 막지 않음
    }
    setReviewModalOpen(false);
    setPebblePromptOpen(true);
  }, [reviewRequest, user, myCouple, partnerId]);

  // ── 돌멩이 던지러 가기 ────────────────────────────────────────────────────

  const handleGoThrowPebble = useCallback(() => {
    setPebblePromptOpen(false);
    setPebbleHighlighted(true);
  }, []);

  // ── 돌멩이 실제 throw 성공 시 (-10) ──────────────────────────────────────

  const handlePebbleThrow = useCallback(() => {
    triggerChickReaction();
    setPebbleHighlighted(false);
    showHeroToast('돌멩이를 던졌어요. 신뢰도가 내려갔어요.');

    if (user && myCouple && partnerId) {
      updateTrustScore(myCouple.id, user.id, partnerId, -10)
        .then(setTrustScore)
        .catch(() => setTrustScore((prev) => clampTrustScore(prev - 10)));

      void addTrustEvent({
        coupleId: myCouple.id,
        actorId: user.id,
        targetUserId: partnerId,
        type: 'pebble_thrown',
        delta: -10,
        message: '돌멩이를 던져 신뢰도가 내려갔어요.',
      });
    } else {
      setTrustScore((prev) => clampTrustScore(prev - 10));
    }
  }, [triggerChickReaction, user, myCouple, partnerId, showHeroToast]);

  // ── Render ────────────────────────────────────────────────────────────────

  const chickStatusLabel = `${CHICK_STATUS_BY_MOOD[displayedMood]} · ${CHICK_LABEL_BY_MOOD[displayedMood]}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.roomLayer}>
          <TopBar style={styles.topBarAdjust} onPressSettings={() => setSettingsOpen(true)} />

          <View style={styles.heroArea} pointerEvents="box-none">
            <View style={styles.sceneWrap}>
              <Animated.View
                style={[
                  styles.birdWrap,
                  { transform: [{ translateX: birdShake }], opacity: birdFade },
                ]}>
                <BirdCharacter state={visualState} />
                <View style={styles.trustBadgeAnchor} pointerEvents="none">
                  <TrustScoreBadge score={trustScore} />
                </View>
              </Animated.View>

              <View style={styles.nestWrap}>
                <Nest state={visualState} />
              </View>

              <Animated.View
                style={[styles.chickLabelWrap, { opacity: labelOpacity }]}
                pointerEvents="none">
                <Text style={styles.chickLabel}>{chickStatusLabel}</Text>
              </Animated.View>
            </View>

            <FloatingActionButtons
              onToast={showHeroToast}
              onSpyPress={() => void handleSpyPress()}
            />
            <DraggablePebble onThrow={handlePebbleThrow} highlighted={pebbleHighlighted} />

            {heroToast ? (
              <Animated.View
                style={[styles.heroToast, { opacity: heroToastOpacity }]}
                pointerEvents="none">
                <Text style={styles.heroToastText}>{heroToast}</Text>
              </Animated.View>
            ) : null}
          </View>
        </View>
      </View>

      {/* target 사용자: 사진 촬영 후 전송 */}
      {uploadRequest && (
        <VerificationUploadModal
          visible={uploadModalOpen}
          requestId={uploadRequest.id}
          onUploaded={handleUploadDone}
          onDismiss={() => setUploadModalOpen(false)}
        />
      )}

      {/* requester: 상대방 사진 수락/거절 */}
      {reviewRequest?.imageUrl && (
        <VerificationReviewModal
          visible={reviewModalOpen}
          imageUrl={reviewRequest.imageUrl}
          onAccepted={() => void handlePhotoAccepted()}
          onRejected={() => void handlePhotoRejected()}
          onClose={() => setReviewModalOpen(false)}
        />
      )}

      <PebbleRejectPrompt
        visible={pebblePromptOpen}
        onGoThrow={handleGoThrowPebble}
        onCancel={() => setPebblePromptOpen(false)}
      />

      <SettingsMenu visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  roomLayer: {
    flex: 1,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    backgroundColor: '#f7eeea',
  },
  topBarAdjust: {
    marginHorizontal: -14,
    marginTop: -14,
  },
  heroArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(241, 220, 229, 0.45)',
    borderRadius: 26,
    overflow: 'visible',
  },
  sceneWrap: {
    alignItems: 'center',
  },
  birdWrap: {
    zIndex: 6,
    elevation: 6,
  },
  trustBadgeAnchor: {
    position: 'absolute',
    top: -26,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
  nestWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: -80,
    zIndex: 3,
    elevation: 3,
  },
  chickLabelWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  chickLabel: {
    fontSize: 12,
    color: '#907f73',
    letterSpacing: 0.1,
  },
  heroToast: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(58, 46, 36, 0.84)',
    zIndex: 40,
    elevation: 40,
  },
  heroToastText: {
    fontSize: 12,
    color: '#f8f0eb',
    textAlign: 'center',
  },
});
