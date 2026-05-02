import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import TopBar from '@/src/components/TopBar';
import { useProfile } from '@/src/context/profile-context';
import { emptyProfile, type Profile } from '@/src/models/profile';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!value) return true; // optional
  if (!DATE_PATTERN.test(value)) return false;
  const d = new Date(value);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export default function ProfileEditScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useProfile();
  const [draft, setDraft] = useState<Profile>(emptyProfile);
  const [dateError, setDateError] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (profile) {
      setDraft({ ...emptyProfile, ...profile });
    }
  }, [profile]);

  const queueSave = useCallback(
    (next: Profile) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (!isValidDate(next.relationshipStartDate)) return;
        void updateProfile(next);
      }, 400);
    },
    [updateProfile],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const updateField = (key: keyof Profile, value: string) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'relationshipStartDate') {
        setDateError(isValidDate(value) ? '' : '연애 시작일은 YYYY-MM-DD 형식이에요. 예: 2024-03-15');
      }
      queueSave(next);
      return next;
    });
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setDraft((prev) => {
        const next = { ...prev, photoUri: result.assets[0].uri };
        queueSave(next);
        return next;
      });
    }
  };

  const handleSave = () => {
    if (!isValidDate(draft.relationshipStartDate)) {
      setDateError('연애 시작일은 YYYY-MM-DD 형식이에요. 예: 2024-03-15');
      return;
    }
    void updateProfile(draft);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TopBar />
        <Pressable style={styles.backRow} onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="chevron-back" size={20} color="#6f6258" />
          <Text style={styles.backText}>돌아가기</Text>
        </Pressable>

        <Text style={styles.title}>내 프로필 수정</Text>
        <Text style={styles.subtitle}>입력 내용은 자동으로 저장돼요.</Text>

        <View style={styles.photoRow}>
          <View style={styles.photoCircle}>
            {draft.photoUri ? (
              <Image source={{ uri: draft.photoUri }} style={styles.photoImage} />
            ) : (
              <Text style={styles.photoPlaceholder}>사진 없음</Text>
            )}
          </View>
          <Pressable style={styles.photoButton} onPress={() => void pickImage()}>
            <Text style={styles.photoButtonText}>사진 선택</Text>
          </Pressable>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>이름</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 예은"
            placeholderTextColor="#b1a39a"
            value={draft.name}
            onChangeText={(value) => updateField('name', value)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>나이</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 25"
            placeholderTextColor="#b1a39a"
            keyboardType="number-pad"
            maxLength={3}
            value={draft.age}
            onChangeText={(value) => updateField('age', value)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>연애 시작일</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD (예: 2024-03-15)"
            placeholderTextColor="#b1a39a"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            autoCapitalize="none"
            value={draft.relationshipStartDate}
            onChangeText={(value) => updateField('relationshipStartDate', value)}
          />
          {dateError ? <Text style={styles.errorText}>{dateError}</Text> : null}
        </View>

        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>저장</Text>
        </Pressable>
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
    gap: 14,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 13,
    color: '#7b6c62',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#5f5147',
  },
  subtitle: {
    fontSize: 13,
    color: '#807167',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#f7eeea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  photoPlaceholder: {
    fontSize: 12,
    color: '#9a8a7d',
  },
  photoButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  photoButtonText: {
    fontSize: 13,
    color: '#6f6258',
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#7b6c62',
  },
  input: {
    borderRadius: 14,
    backgroundColor: '#f7eeea',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#5c4e44',
  },
  errorText: {
    fontSize: 12,
    color: '#9c6b63',
  },
  saveButton: {
    marginTop: 6,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5d4e45',
  },
});
