import { apiFetch } from '@/src/api/client';
import type { BirdState } from '@/src/models/bird-state';
import type { TimelineEntry } from '@/src/models/timeline-entry';

type TimelineListResponse = {
  items: Array<{
    entry_date: string;
    day_count: number | null;
    bird_state: number;
    summary_short: string | null;
    tags: string[];
    warning_text: string | null;
    warning_tags: string[];
  }>;
};

type TimelineCompleteResponse = {
  timeline_id: string;
};

function mapBirdStateFromRisk(birdState: number): BirdState {
  return birdState > 0 ? 'anxious' : 'calm';
}

export async function fetchTimelineEntries(): Promise<TimelineEntry[]> {
  const response = await apiFetch<TimelineListResponse>('/timeline');
  return response.items.map((item) => ({
    id: item.entry_date,
    date: item.entry_date,
    summary: item.summary_short ?? item.warning_text ?? '오늘의 기록',
    tags: item.tags,
    warningText: item.warning_text,
    warningTags: item.warning_tags,
    birdState: mapBirdStateFromRisk(item.bird_state),
    createdAt: new Date().toISOString(),
  }));
}

export async function completeTimelineEntry(entry: TimelineEntry): Promise<TimelineCompleteResponse> {
  return apiFetch<TimelineCompleteResponse>('/timeline/complete', {
    method: 'POST',
    body: JSON.stringify({
      entry_date: entry.date,
      bird_state: entry.birdState,
      summary_short: entry.summary,
      tags: entry.tags,
    }),
  });
}
