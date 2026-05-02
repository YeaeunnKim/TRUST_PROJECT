import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TimelineEntry } from '@/src/models/timeline-entry';

const TIMELINE_KEY = 'birdguard.timeline_entries.v1';

export async function loadTimelineEntries(): Promise<TimelineEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(TIMELINE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TimelineEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveTimelineEntries(entries: TimelineEntry[]): Promise<void> {
  await AsyncStorage.setItem(TIMELINE_KEY, JSON.stringify(entries));
}
