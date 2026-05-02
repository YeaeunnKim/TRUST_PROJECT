export type DayFlags = {
  moneyRequest: boolean;
  favorRequest: boolean;
  excessivePraise: boolean;
  linkIncluded: boolean;
  imageIncluded: boolean;
};

import type { BirdState } from '@/src/models/bird-state';

export type ImmediateRisk = {
  scamUrl: boolean;
  reportedAccount: boolean;
  aiImage: boolean;
};

export type DayRecord = {
  id: string;
  date: string; // YYYY-MM-DD
  source: 'kakaotalk_txt';
  sourceFileName?: string;
  extractedSentences: string[];
  nativeSentences?: string[];
  flags: DayFlags;
  uploadCount: number;
  learned: boolean;
  birdState?: BirdState;
  immediateRisk: ImmediateRisk;
  immediateRiskShown: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateTodayRecordInput = {
  extractedSentences: string[];
  flags: DayFlags;
  immediateRisk?: ImmediateRisk;
  nativeSentences?: string[];
  sourceFileName?: string;
};
