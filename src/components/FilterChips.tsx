import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type FilterKey = 'all' | 'money' | 'favor' | 'praise' | 'link' | 'image';

const CHIP_LABELS: Record<FilterKey, string> = {
  all: '전체',
  money: '금전',
  favor: '부탁',
  praise: '과한칭찬',
  link: '링크',
  image: '이미지',
};

type FilterChipsProps = {
  selected: FilterKey;
  onSelect: (key: FilterKey) => void;
};

export default function FilterChips({ selected, onSelect }: FilterChipsProps) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {(Object.keys(CHIP_LABELS) as FilterKey[]).map((key) => {
          const isActive = selected === key;
          return (
            <Pressable
              key={key}
              style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
              onPress={() => onSelect(key)}
              accessibilityRole="button"
            >
              <Text style={[styles.chipText, isActive ? styles.chipTextActive : styles.chipTextInactive]}>
                {CHIP_LABELS[key]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  row: {
    paddingVertical: 2,
    paddingRight: 8,
    gap: 8,
  },
  chip: {
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: 'rgba(232, 202, 191, 0.9)',
  },
  chipInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(210, 190, 175, 0.6)',
  },
  chipText: {
    fontSize: 12,
  },
  chipTextActive: {
    color: '#5d4e45',
    fontWeight: '600',
  },
  chipTextInactive: {
    color: '#7b6c62',
  },
});
