import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  onCreateInvite: () => void;
  onJoin: (code: string) => void;
  isLoading: boolean;
  error: string | null;
};

export default function JoinCoupleCard({ onCreateInvite, onJoin, isLoading, error }: Props) {
  const [code, setCode] = useState('');

  const handleSubmit = () => {
    const trimmed = code.trim();
    if (trimmed.length < 4) return;
    onJoin(trimmed);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>커플 연결하기</Text>
      <Text style={styles.subtitle}>한 커플은 두 명까지만 연결돼요</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={onCreateInvite}
        disabled={isLoading}>
        <Text style={styles.primaryButtonText}>
          {isLoading ? '처리 중...' : '내 초대 코드 만들기'}
        </Text>
      </Pressable>

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>또는</Text>
        <View style={styles.orLine} />
      </View>

      <Text style={styles.inputLabel}>상대방 코드 입력</Text>
      <TextInput
        style={styles.input}
        placeholder="예: ABC123"
        placeholderTextColor="#c0b0a8"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        maxLength={8}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <Pressable
        style={[
          styles.secondaryButton,
          (isLoading || code.trim().length < 4) && styles.buttonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={isLoading || code.trim().length < 4}>
        <Text style={styles.secondaryButtonText}>
          {isLoading ? '연결 중...' : '이 코드로 연결하기'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff6f0',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(210, 170, 150, 0.3)',
    shadowColor: 'rgba(80, 60, 48, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4a3728',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#9a8a7d',
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(220, 100, 80, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    color: '#c05040',
  },
  primaryButton: {
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4a3728',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(210, 170, 150, 0.3)',
  },
  orText: {
    fontSize: 12,
    color: '#c0b0a8',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7b6c62',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(210, 170, 150, 0.5)',
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
    color: '#4a3728',
    backgroundColor: 'rgba(255, 246, 240, 0.8)',
    marginBottom: 12,
  },
  secondaryButton: {
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(210, 170, 150, 0.7)',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7b6c62',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
