import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/src/context/auth-context';
import { getSupabaseClient, isSupabaseConfigured } from '@/src/lib/supabaseClient';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const d = new Date(value);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [relationshipStartDate, setRelationshipStartDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async () => {
    if (isSubmitting) return;
    setError('');

    if (password !== confirm) {
      setError('비밀번호가 서로 달라요.');
      return;
    }
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    if (!/^\d{1,3}$/.test(age.trim())) {
      setError('나이는 숫자로 입력해주세요.');
      return;
    }
    if (relationshipStartDate && !isValidDate(relationshipStartDate)) {
      setError('연애 시작일은 YYYY-MM-DD 형식으로 입력해주세요. 예: 2024-03-15');
      return;
    }

    setIsSubmitting(true);
    const result = await signUp(username, password);
    if (!result.ok) {
      setError(result.message ?? '회원가입에 실패했어요.');
      setIsSubmitting(false);
      return;
    }

    // 가입 직후 Supabase 세션이 활성화되므로 바로 profiles에 upsert 가능
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (uid) {
          await supabase.from('profiles').upsert(
            {
              user_id: uid,
              name: name.trim(),
              age: age.trim(),
              relationship_start_date: relationshipStartDate || null,
              photo_uri: null,
            },
            { onConflict: 'user_id' },
          );
        }
      } catch {
        // 프로필 저장은 실패해도 가입은 진행. 사용자가 나중에 프로필 화면에서 다시 채울 수 있음.
      }
    }

    router.replace('/(auth)/login');
    setIsSubmitting(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.title}>첫 기록을 준비해요</Text>
            <Text style={styles.subtitle}>천천히, 그리고 부드럽게 시작해요.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>아이디</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="영문/숫자/_/- 3~30자"
              placeholderTextColor="#b1a39a"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="username"
              importantForAutofill="no"
              selectionColor="#c9b7a8"
              style={styles.input}
            />

            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="6자 이상"
              placeholderTextColor="#b1a39a"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="password"
              importantForAutofill="no"
              selectionColor="#c9b7a8"
              style={styles.input}
            />

            <Text style={styles.label}>비밀번호 확인</Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="비밀번호 확인"
              placeholderTextColor="#b1a39a"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="password"
              importantForAutofill="no"
              selectionColor="#c9b7a8"
              style={styles.input}
            />

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>내 프로필</Text>

            <Text style={styles.label}>이름</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="예: 예은"
              placeholderTextColor="#b1a39a"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              selectionColor="#c9b7a8"
              style={styles.input}
            />

            <Text style={styles.label}>나이</Text>
            <TextInput
              value={age}
              onChangeText={setAge}
              placeholder="예: 25"
              placeholderTextColor="#b1a39a"
              keyboardType="number-pad"
              maxLength={3}
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              selectionColor="#c9b7a8"
              style={styles.input}
            />

            <Text style={styles.label}>연애 시작일</Text>
            <TextInput
              value={relationshipStartDate}
              onChangeText={setRelationshipStartDate}
              placeholder="YYYY-MM-DD (선택, 예: 2024-03-15)"
              placeholderTextColor="#b1a39a"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              selectionColor="#c9b7a8"
              style={styles.input}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              onPress={() => void handleSignup()}
              style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
              accessibilityRole="button">
              <Text style={styles.primaryText}>{isSubmitting ? '가입 중...' : '회원가입'}</Text>
            </Pressable>

            <Pressable onPress={() => router.back()} style={styles.linkButton}>
              <Text style={styles.linkText}>로그인으로 돌아가기</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: 20,
    gap: 18,
  },
  hero: {
    marginTop: 10,
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#5f5147',
  },
  subtitle: {
    fontSize: 14,
    color: '#807167',
  },
  card: {
    borderRadius: 22,
    backgroundColor: '#f7eeea',
    padding: 18,
    gap: 10,
    shadowColor: 'rgba(93, 78, 69, 0.18)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(155, 139, 128, 0.2)',
    marginVertical: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6f6258',
  },
  label: {
    fontSize: 13,
    color: '#7b6c62',
  },
  input: {
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#5c4e44',
  },
  errorText: {
    fontSize: 12,
    color: '#9c6b63',
  },
  primaryButton: {
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5d4e45',
  },
  linkButton: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  linkText: {
    fontSize: 13,
    color: '#8b7a6f',
  },
});
