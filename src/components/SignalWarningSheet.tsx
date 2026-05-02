import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { DayRecord } from '@/src/models/day-record';

type SignalWarningSheetProps = {
  visible: boolean;
  records: DayRecord[];
  onClose: () => void;
};

type SignalLevel = 'low' | 'mid' | 'high';

type Stage = {
  title: string;
  bullets: string[];
};

const STAGES: Stage[] = [
  {
    title: '준비 단계',
    bullets: ['갑작스러운 친밀감 제안', '대화 속도가 급격히 빨라짐'],
  },
  {
    title: '이야기 구성',
    bullets: ['과장된 상황 설명', '질문에 반복된 답변'],
  },
  {
    title: '관계 밀착',
    bullets: ['감정 표현이 급격히 증가', '다른 채널로 이동 제안'],
  },
  {
    title: '부담 요청',
    bullets: ['도움 요청이 구체화됨', '감정적 설득이 이어짐'],
  },
  {
    title: '금전 언급',
    bullets: ['송금/지원 암시', '긴급 상황을 강조함'],
  },
  {
    title: '정리/이동',
    bullets: ['빠른 처리 요구', '추가 자료 요청'],
  },
];

const EXAMPLE_MAP: Record<string, string> = {
  moneyRequest: '혹시 지금 바로 도와줄 수 있을까?',
  favorRequest: '이번만 잠깐 부탁할게.',
  excessivePraise: '너만 믿을 수 있어.',
  linkIncluded: '이 링크로 확인해볼래?',
  imageIncluded: '이 사진은 너한테만 보여줄게.',
};

const TAG_LABELS: Record<string, string> = {
  moneyRequest: '#금전',
  favorRequest: '#부담요청',
  excessivePraise: '#과한칭찬',
  linkIncluded: '#채널이동',
  imageIncluded: '#이미지',
};

function flagCount(record: DayRecord) {
  return Object.values(record.flags).filter(Boolean).length;
}

function computeLevel(record: DayRecord): SignalLevel {
  if (record.flags.moneyRequest || flagCount(record) >= 2) return 'high';
  if (flagCount(record) === 1) return 'mid';
  return 'low';
}

function computeStageIndex(record: DayRecord) {
  if (record.flags.moneyRequest) return 4;
  if (record.flags.favorRequest) return 3;
  if (record.flags.linkIncluded || record.flags.imageIncluded) return 2;
  if (record.flags.excessivePraise) return 1;
  return 0;
}

function stageFromRecent(records: DayRecord[]) {
  const scores = new Array(STAGES.length).fill(0);
  records.slice(0, 3).forEach((record, idx) => {
    const weight = record.flags.moneyRequest ? 3 : flagCount(record) >= 2 ? 2 : 1;
    const stage = computeStageIndex(record);
    scores[stage] += weight + (2 - idx);
  });
  const maxScore = Math.max(...scores);
  const currentIndex = Math.max(0, scores.findIndex((score) => score === maxScore));
  const nextIndex = Math.min(currentIndex + 1, STAGES.length - 1);
  return { currentIndex, nextIndex };
}

function buildEvidenceTags(record?: DayRecord) {
  if (!record) return [];
  return Object.entries(record.flags)
    .filter(([, value]) => value)
    .map(([key]) => TAG_LABELS[key] ?? `#${key}`)
    .slice(0, 4);
}

export default function SignalWarningSheet({ visible, records, onClose }: SignalWarningSheetProps) {
  const [strongOnly, setStrongOnly] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});
  const [showChecklist, setShowChecklist] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (!visible) {
      fade.setValue(0);
      slide.setValue(40);
      return;
    }
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible, fade, slide]);

  const sorted = useMemo(
    () => [...records].sort((a, b) => b.date.localeCompare(a.date)),
    [records]
  );

  const latest = sorted[0];
  const latestLevel = latest ? computeLevel(latest) : 'low';
  const { currentIndex, nextIndex } = useMemo(() => stageFromRecent(sorted), [sorted]);

  const evidenceQuotes = useMemo(() => {
    if (!latest?.extractedSentences?.length) return [];
    return latest.extractedSentences.slice(0, 2);
  }, [latest]);

  const evidenceTags = useMemo(() => buildEvidenceTags(latest), [latest]);

  const filtered = useMemo(() => {
    const list = sorted.filter((record) => flagCount(record) > 0);
    if (!strongOnly) return list;
    return list.filter((record) => computeLevel(record) === 'high');
  }, [sorted, strongOnly]);

  const grouped = useMemo(() => {
    return filtered.map((record) => {
      const tags = Object.entries(record.flags)
        .filter(([, value]) => value)
        .map(([key]) => TAG_LABELS[key] ?? `#${key}`);
      const examples = record.extractedSentences?.slice(0, 5) ?? [];
      const pattern =
        (record.flags.moneyRequest && EXAMPLE_MAP.moneyRequest) ||
        (record.flags.favorRequest && EXAMPLE_MAP.favorRequest) ||
        (record.flags.excessivePraise && EXAMPLE_MAP.excessivePraise) ||
        (record.flags.linkIncluded && EXAMPLE_MAP.linkIncluded) ||
        (record.flags.imageIncluded && EXAMPLE_MAP.imageIncluded) ||
        '조금 더 천천히 확인해볼까요?';
      return {
        id: record.id,
        date: record.date,
        level: computeLevel(record),
        count: Math.max(examples.length, 1),
        tags,
        examples,
        pattern,
      };
    });
  }, [filtered]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.sheet, { opacity: fade, transform: [{ translateY: slide }] }]}> 
        <View style={styles.scanLine} />
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="alert-circle" size={18} color="#c9a296" />
            <Text style={styles.title}>주의 흐름 모드</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button">
            <Ionicons name="close" size={18} color="#c9b8ae" />
          </Pressable>
        </View>

        <Text style={styles.summary}>최근 대화가 자주 나타나는 흐름과 닮아 보여요.</Text>

        <View style={[styles.banner, styles[`banner_${latestLevel}`]]}>
          <View style={styles.bannerAccent} />
          <View style={styles.bannerContent}>
            <Text style={styles.bannerLabel}>현재 단계</Text>
            <Text style={styles.bannerValue}>{STAGES[currentIndex].title}</Text>
            <Text style={styles.bannerLabel}>다음 흐름</Text>
            <Text style={styles.bannerValue}>{STAGES[nextIndex].title}</Text>
            <Text style={styles.bannerMeta}>신호 강도 • {latestLevel === 'high' ? '강함' : latestLevel === 'mid' ? '중간' : '약함'}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            style={[styles.saveButton, saved && styles.saveButtonDone]}
            onPress={() => setSaved(true)}
            accessibilityRole="button">
            <Text style={styles.saveText}>{saved ? '타임라인에 저장됨' : '이 흐름을 타임라인에 남기기'}</Text>
          </Pressable>
          <Pressable onPress={() => setShowDetails((prev) => !prev)}>
            <Text style={styles.detailsText}>{showDetails ? '상세 닫기' : '상세 보기'}</Text>
          </Pressable>
        </View>

        {showDetails && latest ? (
          <View style={styles.detailBox}>
            <Text style={styles.detailText}>기록 날짜: {latest.date}</Text>
            {latest.sourceFileName ? <Text style={styles.detailText}>파일: {latest.sourceFileName}</Text> : null}
          </View>
        ) : null}

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>현재 흐름 단계</Text>
            <View style={styles.stepper}>
              {STAGES.map((stage, index) => {
                const active = index === currentIndex;
                return (
                  <View key={stage.title} style={styles.stepRow}>
                    <View style={styles.stepLine} />
                    <View style={[styles.stepDot, active && styles.stepDotActive]} />
                    <View style={[styles.stepCard, active && styles.stepCardActive]}>
                      <View style={styles.stepHeader}>
                        <Text style={styles.stepTitle}>{stage.title}</Text>
                        {active ? (
                          <View style={styles.stepBadge}>
                            <Text style={styles.stepBadgeText}>현재 단계</Text>
                          </View>
                        ) : null}
                      </View>
                      {stage.bullets.map((line) => (
                        <Text key={line} style={styles.stepBullet}>
                          • {line}
                        </Text>
                      ))}
                      {active ? (
                        <View style={styles.evidenceWrap}>
                          <Text style={styles.evidenceTitle}>근거</Text>
                          {evidenceQuotes.length > 0 ? (
                            evidenceQuotes.map((line) => (
                              <Text key={line} style={styles.evidenceText}>
                                “{line}”
                              </Text>
                            ))
                          ) : (
                            <Text style={styles.evidenceText}>표시할 문장이 아직 없어요.</Text>
                          )}
                          <View style={styles.tagRow}>
                            {evidenceTags.map((tag) => (
                              <View key={tag} style={styles.tagChip}>
                                <Text style={styles.tagText}>{tag}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>신호가 강했던 날</Text>
              <Pressable
                style={[styles.toggleButton, strongOnly && styles.toggleButtonActive]}
                onPress={() => setStrongOnly((prev) => !prev)}>
                <Text style={styles.toggleText}>{strongOnly ? '강한 신호만' : '모든 신호'}</Text>
              </Pressable>
            </View>

            {grouped.length === 0 ? (
              <Text style={styles.emptyText}>지금은 표시할 신호가 없어요.</Text>
            ) : (
              grouped.map((item) => {
                const expandedNow = expanded === item.id;
                const showMore = expandedMatches[item.id] ?? false;
                const limit = showMore ? 5 : 3;
                return (
                  <View key={item.id} style={styles.accordionCard}>
                    <Pressable
                      onPress={() => setExpanded(expandedNow ? null : item.id)}
                      style={styles.accordionHeader}>
                      <View>
                        <Text style={styles.accordionDate}>{item.date}</Text>
                        <Text style={styles.accordionMeta}>유사 표현 {item.count}개</Text>
                      </View>
                      <View style={styles.levelWrap}>
                        <View style={[styles.levelBar, styles[`level_${item.level}`]]} />
                        <Text style={styles.levelText}>{item.level === 'high' ? '강함' : item.level === 'mid' ? '중간' : '약함'}</Text>
                      </View>
                    </Pressable>
                    {expandedNow ? (
                      <View style={styles.accordionBody}>
                        {item.examples.slice(0, limit).map((line, index) => (
                          <View key={`${line}-${index}`} style={styles.matchRow}>
                            <View style={styles.matchBlock}>
                              <Text style={styles.matchLabel}>대화 문장</Text>
                              <Text style={styles.matchText}>{line}</Text>
                            </View>
                            <View style={styles.matchBlock}>
                              <Text style={styles.matchLabel}>유사 예시</Text>
                              <Text style={styles.matchText}>{item.pattern}</Text>
                            </View>
                            <View style={styles.matchMetaRow}>
                              <Text style={styles.matchMeta}>{item.level === 'high' ? '유사 높음' : '유사 중간'}</Text>
                            </View>
                          </View>
                        ))}
                        {item.examples.length > 3 ? (
                          <Pressable
                            style={styles.moreButton}
                            onPress={() => setExpandedMatches((prev) => ({ ...prev, [item.id]: !showMore }))}>
                            <Text style={styles.moreText}>{showMore ? '접기' : '더 보기'}</Text>
                          </Pressable>
                        ) : null}
                        <View style={styles.tagRow}>
                          {item.tags.slice(0, 4).map((tag) => (
                            <View key={tag} style={styles.tagChip}>
                              <Text style={styles.tagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable style={styles.primaryCta} onPress={() => setShowChecklist((prev) => !prev)}>
            <Text style={styles.primaryText}>안전하게 응답하기</Text>
          </Pressable>
          {showChecklist ? (
            <View style={styles.checklist}>
              <Text style={styles.checkItem}>• 금전 이동은 잠시 멈추기</Text>
              <Text style={styles.checkItem}>• 링크/문서 공유는 보류하기</Text>
              <Text style={styles.checkItem}>• 확인 질문을 하나 더 묻기</Text>
              <Text style={styles.checkItem}>• 믿을 수 있는 사람에게 공유하기</Text>
            </View>
          ) : null}
          <Pressable style={styles.secondaryCta}>
            <Text style={styles.secondaryText}>리포트로 저장하기</Text>
          </Pressable>
          <Pressable>
            <Text style={styles.tertiaryText}>이 흐름이 다르게 느껴지나요? 의견 보내기</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 13, 18, 0.82)',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#0b0d12',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    gap: 12,
  },
  scanLine: {
    height: 2,
    width: '36%',
    borderRadius: 2,
    backgroundColor: 'rgba(201, 162, 150, 0.4)',
    alignSelf: 'center',
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f0e7e0',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  summary: {
    fontSize: 13,
    color: '#cfc2b8',
  },
  banner: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  banner_low: {
    borderColor: 'rgba(154, 145, 137, 0.3)',
    borderWidth: 1,
  },
  banner_mid: {
    borderColor: 'rgba(187, 165, 140, 0.4)',
    borderWidth: 1,
  },
  banner_high: {
    borderColor: 'rgba(196, 139, 111, 0.5)',
    borderWidth: 1,
  },
  bannerAccent: {
    width: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(196, 139, 111, 0.8)',
  },
  bannerContent: {
    flex: 1,
    gap: 4,
  },
  bannerLabel: {
    fontSize: 12,
    color: '#9f9086',
  },
  bannerValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e7d6cc',
    marginRight: 12,
  },
  bannerMeta: {
    fontSize: 12,
    color: '#c9b9af',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  saveButtonDone: {
    backgroundColor: 'rgba(205, 174, 160, 0.2)',
  },
  saveText: {
    fontSize: 12,
    color: '#e0d2c7',
  },
  detailsText: {
    fontSize: 12,
    color: '#a99c93',
  },
  detailBox: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: '#b8a99f',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 120,
    gap: 16,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#efe4dd',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepper: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepLine: {
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 2,
    marginRight: 10,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 10,
    marginTop: 6,
  },
  stepDotActive: {
    backgroundColor: '#c9a296',
    shadowColor: '#c9a296',
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  stepCard: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 4,
  },
  stepCardActive: {
    backgroundColor: 'rgba(201, 162, 150, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 150, 0.3)',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f1e4dd',
  },
  stepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(201, 162, 150, 0.24)',
  },
  stepBadgeText: {
    fontSize: 10,
    color: '#f1e4dd',
  },
  stepBullet: {
    fontSize: 12,
    color: '#cfc2b8',
  },
  evidenceWrap: {
    marginTop: 6,
    gap: 6,
  },
  evidenceTitle: {
    fontSize: 11,
    color: '#b9a9a0',
  },
  evidenceText: {
    fontSize: 12,
    color: '#e7d6cc',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tagText: {
    fontSize: 10,
    color: '#cdbfb4',
  },
  toggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(201, 162, 150, 0.2)',
  },
  toggleText: {
    fontSize: 11,
    color: '#d8c9bf',
  },
  emptyText: {
    fontSize: 12,
    color: '#b8a89f',
  },
  accordionCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 8,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accordionDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#efe4dd',
  },
  accordionMeta: {
    fontSize: 11,
    color: '#b9a9a0',
  },
  levelWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  levelBar: {
    width: 56,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  level_high: {
    backgroundColor: '#c48b6f',
  },
  level_mid: {
    backgroundColor: '#bba58c',
  },
  level_low: {
    backgroundColor: '#9a9189',
  },
  levelText: {
    fontSize: 10,
    color: '#cdbfb4',
  },
  accordionBody: {
    gap: 10,
  },
  matchRow: {
    gap: 8,
  },
  matchBlock: {
    gap: 4,
  },
  matchLabel: {
    fontSize: 11,
    color: '#b9a9a0',
  },
  matchText: {
    fontSize: 12,
    color: '#e7d6cc',
  },
  matchMetaRow: {
    alignItems: 'flex-end',
  },
  matchMeta: {
    fontSize: 10,
    color: '#c9b8ae',
  },
  moreButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  moreText: {
    fontSize: 11,
    color: '#bdaea4',
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
    gap: 8,
  },
  primaryCta: {
    borderRadius: 16,
    backgroundColor: '#c9a296',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2f2622',
  },
  checklist: {
    gap: 6,
  },
  checkItem: {
    fontSize: 12,
    color: '#e7d6cc',
  },
  secondaryCta: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryText: {
    fontSize: 13,
    color: '#d9c9bf',
  },
  tertiaryText: {
    fontSize: 11,
    color: '#a89b92',
    textAlign: 'center',
  },
});
