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

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInAsGuest } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    const result = await signIn(username, password);
    if (!result.ok) {
      setError(result.message ?? '로그인에 실패했어요.');
    }
    setIsSubmitting(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.title}>조용한 기록을 시작해요</Text>
            <Text style={styles.subtitle}>오늘의 대화를 차분히 이어가요.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>아이디</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="아이디"
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
              placeholder="비밀번호"
              placeholderTextColor="#b1a39a"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              selectionColor="#c9b7a8"
              style={styles.input}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              onPress={() => void handleLogin()}
              style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
              accessibilityRole="button">
              <Text style={styles.primaryText}>{isSubmitting ? '로그인 중...' : '로그인'}</Text>
            </Pressable>

            <Pressable onPress={() => router.push('/(auth)/signup')} style={styles.linkButton}>
              <Text style={styles.linkText}>회원가입</Text>
            </Pressable>

            <Pressable
              onPress={() => void signInAsGuest()}
              style={styles.testButton}
              accessibilityRole="button">
              <Text style={styles.testButtonText}>테스트로 바로 들어가기</Text>
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
  testButton: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  testButtonText: {
    fontSize: 12,
    color: '#a2948a',
  },
});
