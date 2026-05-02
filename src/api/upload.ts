import { apiUpload } from '@/src/api/client';

type LearningItem = {
  content: string;
  content_type: string;
  review_due_date: string | null;
};

export type KakaoUploadResponse = {
  conversation_id: string;
  upload_id: string | null;
  ingested_messages: number;
  skipped_messages: number;
  analysis_job_id: string | null;
  analysis_status: string | null;
  analysis_jobs?: Array<{
    analysis_date: string;
    analysis_job_id: string;
    analysis_status: string;
  }>;
  last_ingested_date: string | null;
  upload_date?: string | null;
  analysis_result: null | {
    analysis_date: string;
    summary_text: string | null;
    summary_short: string | null;
    tags: string[];
    warning_text: string | null;
    warning_tags: string[];
    risk_explanation_text: string | null;
    risk_level: number | null;
    learning_items?: LearningItem[];
  };
};

type KakaoUploadInput = {
  file: {
    uri: string;
    name: string;
    mimeType?: string;
  };
  meName?: string | null;
  force?: boolean;
};

export async function uploadKakao(input: KakaoUploadInput): Promise<KakaoUploadResponse> {
  const formData = new FormData();
  formData.append('chat_file', {
    uri: input.file.uri,
    name: input.file.name,
    type: input.file.mimeType ?? 'text/plain',
  } as unknown as Blob);
  formData.append('sync_analysis', 'false');
  if (input.meName) {
    formData.append('me_name', input.meName);
  }
  if (input.force) {
    formData.append('force', 'true');
  }

  return apiUpload<KakaoUploadResponse>('/upload/kakao', formData);
}
