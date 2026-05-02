import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import TopBar from '@/src/components/TopBar';
import { loadApology, saveApology } from '@/src/storage/apology-storage';
import { formatDateLabel, getSeoulDateKey } from '@/src/utils/date';

const APOLOGY_HINT = '사과의 진심을 담아, 어떤 점이 잘못됐는지, 왜 미안한지, 앞으로 어떻게 바꿀지 적어보세요.';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function assessApology(apology: string) {
  const text = apology.trim();
  const normalized = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const hasSorry = /미안|사과|죄송|정말로|송구/.test(normalized);
  const hasResponsibility = /제가|내가|제 잘못|제 실수|제 탓/.test(normalized);
  const hasHurtDescription = /기분|상처|불편|마음|서운|속상/.test(normalized);
  const hasRepair = /앞으로|다음부터|노력|변화|보답|정비|개선|바꾸/.test(normalized);
  const hasBut = /하지만/.test(normalized);
  const hasQuestion = /\?/.test(text);

  const lengthScore = clamp(Math.min(wordCount, 70) * 1.1, 0, 30);
  const sorryScore = hasSorry ? 20 : 0;
  const responsibilityScore = hasResponsibility ? 20 : 0;
  const hurtScore = hasHurtDescription ? 15 : 0;
  const repairScore = hasRepair ? 15 : 0;
  const honestScore = hasBut ? -15 : 0;
  const balanceScore = hasQuestion ? -5 : 0;

  const score = clamp(
    10 + lengthScore + sorryScore + responsibilityScore + hurtScore + repairScore + honestScore + balanceScore,
    0,
    100,
  );

  const suggestions: string[] = [];
  if (!hasSorry) suggestions.push('더 분명한 사과 표현을 넣어보세요. 예: 미안합니다, 죄송합니다.');
  if (!hasResponsibility) suggestions.push('내 잘못을 분명히 인정하는 문장을 추가해보세요.');
  if (!hasHurtDescription) suggestions.push('상대의 무엇이 상처받았는지 조금 더 구체적으로 적어보세요.');
  if (!hasRepair) suggestions.push('앞으로 어떻게 바꿀지, 어떤 노력을 할지를 명시해보세요.');
  if (hasBut) suggestions.push('"하지만" 같은 변명 표현은 사과문에서 줄이세요.');
  if (wordCount < 20) suggestions.push('진심은 짧아도 좋지만, 조금 더 내용을 채워서 감정을 전달해보세요.');

  if (suggestions.length === 0) {
    suggestions.push('잘 쓰셨어요. 진심을 담아 구체적으로 표현한 사과문입니다.');
  }

  return {
    score,
    summary:
      score >= 85
        ? '매우 진정성 있는 사과문이에요. 핵심이 잘 담겨 있습니다.'
        : score >= 65
        ? '좋은 사과문이에요. 조금 더 책임과 개선 의지를 보이면 완벽해집니다.'
        : '좀 더 구체적이고 책임감 있는 표현을 담으면 좋겠습니다.',
    suggestions,
  };
}

export default function MessageScreen() {
  const router = useRouter();
  const todayKey = getSeoulDateKey();
  const todayLabel = formatDateLabel(todayKey);

  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState('');
  const [analysis, setAnalysis] = useState<ReturnType<typeof assessApology> | null>(null);
  const [notice, setNotice] = useState<string>('');

  useEffect(() => {
    async function load() {
      const loaded = await loadApology(todayKey);
      if (loaded) {
        setTitle(loaded.title);
        setDraft(loaded.body);
      }
    }
    load();
  }, [todayKey]);

  const buttonDisabled = title.trim().length === 0 || draft.trim().length === 0;

  const scoreLabel = analysis ? `${analysis.score} / 100` : '아직 평가되지 않음';

  const handleEvaluate = () => {
    setAnalysis(assessApology(draft));
    setNotice('AI가 사과문을 점검했습니다. 아래 제안을 확인해 보세요.');
  };

  const handleRegister = async () => {
    const record = { title: title.trim(), body: draft.trim() };
    await saveApology(todayKey, record);
    setNotice('사과문이 등록되었습니다. 사과문 기록 페이지로 이동합니다.');
    router.push('/(tabs)/message/history');
  };

  const evaluationCard = useMemo(() => {
    if (!analysis) return null;
    return (
      <View style={styles.feedbackCard}>
        <Text style={styles.feedbackTitle}>AI 평가 결과</Text>
        <Text style={styles.feedbackScore}>{scoreLabel}</Text>
        <Text style={styles.feedbackSummary}>{analysis.summary}</Text>
        {analysis.suggestions.map((item, index) => (
          <Text key={index} style={styles.feedbackItem}>• {item}</Text>
        ))}
      </View>
    );
  }, [analysis, scoreLabel]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TopBar />
        <Text style={styles.title}>사과문</Text>
        <Text style={styles.centerDate}>{todayLabel}</Text>

        <View style={styles.editorCard}>
          <Text style={styles.editorLabel}>제목</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="사과문 제목을 입력하세요"
            placeholderTextColor="#b79c87"
            style={styles.titleInput}
          />
          <Text style={[styles.editorLabel, styles.editorLabelSpacing]}>사과글</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder={APOLOGY_HINT}
            placeholderTextColor="#a48f80"
            style={styles.textInput}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, buttonDisabled && styles.buttonDisabled]} disabled={buttonDisabled} onPress={handleEvaluate}>
            <Text style={styles.buttonText}>AI 평가하기</Text>
          </Pressable>
          <Pressable style={[styles.button, buttonDisabled && styles.buttonDisabled]} disabled={buttonDisabled} onPress={handleRegister}>
            <Text style={styles.buttonText}>사과문 등록</Text>
          </Pressable>
        </View>

        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
        {evaluationCard}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
  },
  container: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#5f5147',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#807167',
  },
  centerDate: {
    fontSize: 14,
    color: '#7c6d60',
    textAlign: 'center',
    marginBottom: 16,
  },
  editorCard: {
    backgroundColor: '#fff8f2',
    borderRadius: 22,
    padding: 16,
    minHeight: 260,
  },
  editorLabel: {
    fontSize: 14,
    color: '#8d7e73',
    marginBottom: 10,
  },
  editorLabelSpacing: {
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 220,
    fontSize: 16,
    color: '#4a3f36',
    lineHeight: 24,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#fff7f1',
    borderWidth: 1,
    borderColor: '#efdfd3',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  titleInput: {
    height: 44,
    fontSize: 16,
    color: '#4a3f36',
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#fffdf9',
    borderWidth: 1,
    borderColor: '#ead7c7',
    marginBottom: 12,
  },
  editorLabelSpacing: {
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: '#a66f4e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#d8c4b4',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  noticeText: {
    fontSize: 12,
    color: '#7d6c5f',
    lineHeight: 18,
  },
  feedbackCard: {
    backgroundColor: '#fff7f0',
    borderRadius: 22,
    padding: 16,
    gap: 10,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5f5147',
  },
  feedbackScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8b5b38',
  },
  feedbackSummary: {
    fontSize: 14,
    color: '#716255',
  },
  feedbackItem: {
    fontSize: 13,
    color: '#6a574b',
    lineHeight: 20,
  },
  savedCard: {
    backgroundColor: '#fbf1ea',
    borderRadius: 22,
    padding: 16,
    gap: 8,
  },
  savedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5f5147',
  },
  savedText: {
    fontSize: 14,
    color: '#5d4e45',
    lineHeight: 22,
  },
});
