import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import LearnScreen from '@/src/screens/LearnScreen';

export default function LearnModal() {
  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} />

      <View style={styles.card}>
        <LearnScreen closeOnComplete />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f8f0eb',
    padding: 16,
  },
});
