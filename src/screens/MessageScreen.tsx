import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import ApologyScoreCard from '@/src/components/ApologyScoreCard';
import TopBar from '@/src/components/TopBar';
import { loadApology, saveApology } from '@/src/storage/apology-storage';
import { type ApologyScoreResult, scoreApology } from '@/src/utils/apologyScoring';
import { formatDateLabel, getSeoulDateKey } from '@/src/utils/date';

const APOLOGY_HINT = '사과의 진심을 담아, 어떤 점이 잘못됐는지, 왜 미안한지, 앞으로 어떻게 바꿀지 적어보세요.';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_MODEL = process.env.EXPO_PUBLIC_OPENAI_MODEL;

export default function MessageScreen() {
  const router = useRouter();
  const todayKey = getSeoulDateKey();
  const todayLabel = formatDateLabel(todayKey);

  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState('');
  const [analysis, setAnalysis] = useState<ApologyScoreResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
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
  const evaluateDisabled = buttonDisabled || evaluating;

  const handleEvaluate = async () => {
    if (evaluating) return;
    setEvaluating(true);
    try {
      const result = await scoreApology(
        draft,
        OPENAI_API_KEY
          ? { openAI: { apiKey: OPENAI_API_KEY, model: OPENAI_MODEL } }
          : undefined,
      );
      setAnalysis(result);
      setNotice(
        OPENAI_API_KEY
          ? 'AI 평가가 완료되었어요. 위 결과를 보고 직접 사과문을 다시 다듬어보세요.'
          : 'AI 키가 설정되지 않아 기본 채점기로 평가했습니다. 위 결과를 참고해 직접 다듬어보세요.',
      );
    } finally {
      setEvaluating(false);
    }
  };

  const handleRegister = async () => {
    const record = { title: title.trim(), body: draft.trim() };
    await saveApology(todayKey, record);
    setTitle('');
    setDraft('');
    setAnalysis(null);
    setNotice('사과문이 등록되었습니다. 사과문 기록 페이지로 이동합니다.');
    router.push('/(tabs)/message/history');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TopBar />
        <Text style={styles.title}>사과문</Text>
        <Text style={styles.centerDate}>{todayLabel}</Text>

        {analysis ? <ApologyScoreCard result={analysis} /> : null}

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
          <Pressable
            style={[styles.button, evaluateDisabled && styles.buttonDisabled]}
            disabled={evaluateDisabled}
            onPress={handleEvaluate}>
            <Text style={styles.buttonText}>{evaluating ? '채점 중…' : 'AI 평가하기'}</Text>
          </Pressable>
          <Pressable
            style={[styles.button, buttonDisabled && styles.buttonDisabled]}
            disabled={buttonDisabled}
            onPress={handleRegister}>
            <Text style={styles.buttonText}>사과문 등록</Text>
          </Pressable>
        </View>

        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}

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
  savedSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6f5d52',
  },
  savedText: {
    fontSize: 14,
    color: '#5d4e45',
    lineHeight: 22,
  },
});
