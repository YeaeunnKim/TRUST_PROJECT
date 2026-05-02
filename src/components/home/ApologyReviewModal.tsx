import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  authorName: string;
  title: string;
  body: string;
  aiScore: number;
  trustDelta: number;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
};

export default function ApologyReviewModal({
  visible,
  authorName,
  title,
  body,
  aiScore,
  trustDelta,
  onAccept,
  onReject,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="닫기">
            <Ionicons name="close" size={22} color="#7b6c62" />
          </Pressable>

          <View style={styles.headerRow}>
            <Ionicons name="mail-open-outline" size={28} color="#c4a882" />
            <Text style={styles.heading}>{authorName}님이 사과문을 작성했어요</Text>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scorePill}>
              <Text style={styles.scoreLabel}>AI 점수</Text>
              <Text style={styles.scoreValue}>{aiScore}</Text>
            </View>
            <View style={styles.scorePill}>
              <Text style={styles.scoreLabel}>수락 시 회복</Text>
              <Text style={[styles.scoreValue, styles.scoreDelta]}>+{trustDelta}</Text>
            </View>
          </View>

          {title ? <Text style={styles.title}>{title}</Text> : null}

          <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent}>
            <Text style={styles.bodyText}>{body}</Text>
          </ScrollView>

          <View style={styles.row}>
            <Pressable
              style={[styles.halfBtn, styles.ghostBtn]}
              onPress={onReject}
              accessibilityLabel="거절">
              <Text style={styles.ghostBtnText}>거절</Text>
            </Pressable>
            <Pressable
              style={[styles.halfBtn, styles.primaryBtn]}
              onPress={onAccept}
              accessibilityLabel="수락">
              <Text style={styles.primaryBtnText}>수락하고 신뢰도 회복</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(52, 42, 34, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#f8f0eb',
    borderRadius: 24,
    padding: 24,
    paddingTop: 32,
    gap: 14,
  },
  closeBtn: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heading: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#5d4e45',
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scorePill: {
    flex: 1,
    backgroundColor: '#f7eeea',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 2,
  },
  scoreLabel: {
    fontSize: 11,
    color: '#9b8b80',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5d4e45',
  },
  scoreDelta: {
    color: '#5d8a4e',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4f3f36',
  },
  bodyScroll: {
    maxHeight: 220,
    backgroundColor: '#fff8f2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bodyContent: {
    paddingVertical: 4,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#5d4e45',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  halfBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d8c4b4',
  },
  ghostBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7b6c62',
  },
  primaryBtn: {
    backgroundColor: '#a66f4e',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
