import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import BirdCharacter, { type BirdState } from '@/src/components/BirdCharacter';
import DraggablePebble from '@/src/components/home/DraggablePebble';
import FloatingActionButtons from '@/src/components/home/FloatingActionButtons';
import MailboxModal from '@/src/components/home/MailboxModal';
import PebbleRejectPrompt from '@/src/components/home/PebbleRejectPrompt';
import TrustScoreBadge from '@/src/components/home/TrustScoreBadge';
import VerificationReviewModal from '@/src/components/home/VerificationReviewModal';
import VerificationUploadModal from '@/src/components/home/VerificationUploadModal';
import Nest from '@/src/components/Nest';
import SettingsMenu from '@/src/components/SettingsMenu';
import SleepModeToggle from '@/src/components/home/SleepModeToggle';
import TopBar from '@/src/components/TopBar';
import { useAuth } from '@/src/context/auth-context';
import { useCouple } from '@/src/context/couple-context';
import { useDayRecords } from '@/src/context/day-records-context';
import { usePresence } from '@/src/context/presence-context';
import ApologyReviewModal from '@/src/components/home/ApologyReviewModal';
import {
  getPendingApologyForReviewer,
  getRecentReviewedForAuthor,
  reviewApology,
  type ApologyRow,
} from '@/src/lib/apologies';
import { addTrustEvent, getTrustScore, INITIAL_TRUST_SCORE } from '@/src/lib/trustScore';
import { getSupabaseClient } from '@/src/lib/supabaseClient';
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
  const { throwPebble } = usePresence();

  // partner 파생
  const partnerId = useMemo(() => {
    if (!myCouple || !user) return null;
    return myCouple.members.find((m) => m.userId !== user.id)?.userId ?? null;
  }, [myCouple, user]);

  // ── Trust score ────────────────────────────────────────────────────────────

  const [trustScore, setTrustScore] = useState(INITIAL_TRUST_SCORE);

  // 홈 점수 = "상대가 나를 신뢰하는 정도" (partner→me 방향)
  // 사과문이 수락되면 이 점수가 회복되고, 상대가 던진 돌에 명중되면 떨어짐
  useEffect(() => {
    if (!user || !myCouple || !partnerId) {
      setTrustScore(INITIAL_TRUST_SCORE);
      return;
    }
    getTrustScore(myCouple.id, partnerId, user.id)
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

  // 사과문 리뷰 모달 (내가 받은 pending 사과문)
  const [pendingApology, setPendingApology] = useState<ApologyRow | null>(null);
  // 우체통 모달
  const [mailboxOpen, setMailboxOpen] = useState(false);
  const apologyNotifySinceRef = useRef<string>(new Date().toISOString());
  const apologyShownIdsRef = useRef<Set<string>>(new Set());

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

  // ── Polling: 사과문 검토 (내가 받은) + 검토 결과 알림 ─────────────────────

  const refreshTrustScore = useCallback(() => {
    if (!user || !myCouple || !partnerId) return;
    getTrustScore(myCouple.id, partnerId, user.id)
      .then(setTrustScore)
      .catch(() => {});
  }, [user, myCouple, partnerId]);

  const checkApologies = useCallback(async () => {
    if (!user || !myCouple) return;
    try {
      // 1) 내가 받은 pending 사과문 (없으면 모달 닫기)
      if (!pendingApology) {
        const result = await getPendingApologyForReviewer(user.id);
        if (result) {
          setPendingApology(result.row);
        }
      }

      // 2) 내가 쓴 사과문이 검토된 결과 알림
      const since = apologyNotifySinceRef.current;
      const reviewed = await getRecentReviewedForAuthor(user.id, since);
      let newestReviewedAt = since;
      for (const r of reviewed) {
        if (apologyShownIdsRef.current.has(r.id)) continue;
        apologyShownIdsRef.current.add(r.id);
        if (r.status === 'accepted') {
          showHeroToast(`사과문이 수락됐어요. 신뢰도 +${r.trust_delta}`);
          refreshTrustScore();
        } else if (r.status === 'rejected') {
          showHeroToast('사과문이 거절됐어요.');
        }
        if (r.reviewed_at && r.reviewed_at > newestReviewedAt) {
          newestReviewedAt = r.reviewed_at;
        }
      }
      apologyNotifySinceRef.current = newestReviewedAt;
    } catch {
      // 무시
    }
  }, [user, myCouple, pendingApology, showHeroToast, refreshTrustScore]);

  useEffect(() => {
    if (!user || !myCouple) return;
    void checkApologies();
    const id = setInterval(() => void checkApologies(), 10_000);
    return () => clearInterval(id);
  }, [user, myCouple, checkApologies]);

  const handleApologyDecision = useCallback(
    async (decision: 'accepted' | 'rejected') => {
      if (!pendingApology) return;
      const id = pendingApology.id;
      setPendingApology(null);
      try {
        const result = await reviewApology(id, decision);
        if (result.decision === 'accepted') {
          // 수락은 me→partner 방향의 점수를 회복시킴.
          // 내 홈 점수(partner→me)는 변동 없고, 상대 홈에서 점수가 오른다.
          showHeroToast(`사과문을 수락했어요. 상대 신뢰도 +${result.appliedDelta}`);
        } else {
          showHeroToast('사과문을 거절했어요.');
        }
      } catch (e) {
        showHeroToast(e instanceof Error ? e.message : '검토에 실패했어요.');
      }
    },
    [pendingApology, showHeroToast],
  );

  const apologyAuthorName = useMemo(() => {
    if (!pendingApology || !myCouple) return '';
    return (
      myCouple.members.find((m) => m.userId === pendingApology.author_id)?.username ??
      '상대방'
    );
  }, [pendingApology, myCouple]);

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

  // ── 사진 수락 (+5, 양방향 동시 갱신) ─────────────────────────────────────

  const handlePhotoAccepted = useCallback(async () => {
    if (!reviewRequest || !user || !myCouple || !partnerId) return;
    try {
      await reviewVerificationRequest(reviewRequest.id, 'accepted');
      const supabase = getSupabaseClient();
      const { data: newScore, error } = await supabase.rpc('apply_couple_trust_delta', {
        p_other_user_id: partnerId,
        p_delta: 5,
        p_event_type: 'verification_accepted',
        p_message: '사진을 수락해서 신뢰도가 올라갔어요.',
      });
      if (error) throw error;
      if (typeof newScore === 'number') setTrustScore(newScore);
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

  // ── 돌멩이 throw 시 throw_pebble RPC 경유 (잠자기 모드 판정) ──────────────

  const handlePebbleThrow = useCallback(() => {
    triggerChickReaction();
    setPebbleHighlighted(false);

    if (!user || !myCouple || !partnerId) {
      showHeroToast('먼저 커플을 연결해주세요.');
      return;
    }
    void (async () => {
      try {
        const result = await throwPebble(partnerId);
        if (result.outcome === 'hit') {
          showHeroToast(`잠자는 척하고 있었어요! 신뢰도 ${result.trustChange}`);
          // 홈 점수는 partner→me 방향이므로 내가 던진 돌은 화면 점수와 무관.
          // 상대 화면의 점수가 떨어지는 거라 여기 setTrustScore 갱신할 필요 없음.
        } else if (result.outcome === 'bounced') {
          showHeroToast('자고 있어 돌이 튕겨나갔어요.');
        } else {
          showHeroToast('돌멩이를 던졌어요. 상대는 잠자기 모드가 아니에요.');
        }
      } catch (e) {
        showHeroToast(e instanceof Error ? e.message : '돌을 던지지 못했어요.');
      }
    })();
  }, [triggerChickReaction, user, myCouple, partnerId, throwPebble, showHeroToast]);

  // ── Render ────────────────────────────────────────────────────────────────

  const chickStatusLabel = `${CHICK_STATUS_BY_MOOD[displayedMood]} · ${CHICK_LABEL_BY_MOOD[displayedMood]}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.roomLayer}>
          <TopBar style={styles.topBarAdjust} onPressSettings={() => setSettingsOpen(true)} />

          <View style={styles.sleepToggleRow}>
            <SleepModeToggle />
          </View>

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
              onMailboxPress={() => setMailboxOpen(true)}
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
      {reviewRequest?.imagePath && (
        <VerificationReviewModal
          visible={reviewModalOpen}
          imagePath={reviewRequest.imagePath}
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

      {/* 상대가 보낸 사과문 검토 */}
      {pendingApology ? (
        <ApologyReviewModal
          visible
          authorName={apologyAuthorName}
          title={pendingApology.title}
          body={pendingApology.body}
          aiScore={pendingApology.ai_score}
          trustDelta={pendingApology.trust_delta}
          onAccept={() => void handleApologyDecision('accepted')}
          onReject={() => void handleApologyDecision('rejected')}
          onClose={() => setPendingApology(null)}
        />
      ) : null}

      <SettingsMenu visible={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <MailboxModal visible={mailboxOpen} onClose={() => setMailboxOpen(false)} />
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
  sleepToggleRow: {
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 4,
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
