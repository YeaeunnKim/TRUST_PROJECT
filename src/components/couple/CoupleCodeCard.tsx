import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/src/context/auth-context';
import type { Couple } from '@/src/models/couple';

type Props = {
  couple: Couple;
  onDisconnect: () => void;
  isLoading: boolean;
};

export default function CoupleCodeCard({ couple, onDisconnect, isLoading }: Props) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const partner = couple.members.find((m) => m.userId !== user?.id);
  const isMatched = couple.members.length >= 2;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(couple.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>내 초대 코드</Text>
      <Text style={styles.subtitle}>상대방에게 이 코드를 보내주세요</Text>

      <View style={styles.codeRow}>
        <Text style={styles.codeText}>{couple.inviteCode}</Text>
        <Pressable
          style={[styles.copyButton, copied && styles.copyButtonDone]}
          onPress={() => void handleCopy()}>
          <Text style={styles.copyButtonText}>{copied ? '복사됨' : '복사'}</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      <Text style={styles.memberLabel}>연결 상태</Text>
      {isMatched ? (
        <View style={styles.matchedBadge}>
          <Text style={styles.matchedText}>커플 연결 완료!</Text>
          {partner ? <Text style={styles.partnerName}>{partner.username}</Text> : null}
        </View>
      ) : (
        <Text style={styles.waitingText}>상대방이 코드를 입력하길 기다리는 중이에요...</Text>
      )}

      <Pressable
        style={[styles.disconnectButton, isLoading && styles.buttonDisabled]}
        onPress={onDisconnect}
        disabled={isLoading}>
        <Text style={styles.disconnectText}>연결 해제</Text>
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
    marginBottom: 18,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(232, 202, 191, 0.4)',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  codeText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 4,
    color: '#4a3728',
  },
  copyButton: {
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyButtonDone: {
    backgroundColor: 'rgba(180, 210, 170, 0.9)',
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5d4e45',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(210, 170, 150, 0.25)',
    marginVertical: 18,
  },
  memberLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9a8a7d',
    marginBottom: 8,
    letterSpacing: 1,
  },
  matchedBadge: {
    backgroundColor: 'rgba(180, 220, 170, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  matchedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3d6b35',
  },
  partnerName: {
    fontSize: 13,
    color: '#5d7d56',
    marginTop: 2,
  },
  waitingText: {
    fontSize: 13,
    color: '#9a8a7d',
    marginBottom: 16,
    lineHeight: 20,
  },
  disconnectButton: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    opacity: 0.6,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  disconnectText: {
    fontSize: 12,
    color: '#9a8a7d',
  },
});
