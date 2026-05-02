import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';

export type ParsedConversation = {
  messages: string[];
  summary: string;
  tags: string[];
  riskFlagsCount: number;
  flags: {
    moneyRequest: boolean;
    favorRequest: boolean;
    excessivePraise: boolean;
    linkIncluded: boolean;
    imageIncluded: boolean;
  };
  rawTextLength: number;
  messagesCount: number;
};

const MONEY_KEYWORDS = ['돈', '송금', '입금', '계좌', '이체'];
const FAVOR_KEYWORDS = ['부탁', '도와', '도움', '지원'];
const PRAISE_KEYWORDS = ['사랑', '보고싶', '결혼', '최고', '운명'];
const IMAGE_KEYWORDS = ['사진', '이미지', '포토'];

function containsAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function extractMessages(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function buildParsedConversation(text: string): ParsedConversation {
  const messages = extractMessages(text);
  const joined = messages.join(' ');
  const moneyRequest = containsAny(joined, MONEY_KEYWORDS);
  const favorRequest = containsAny(joined, FAVOR_KEYWORDS);
  const excessivePraise = containsAny(joined, PRAISE_KEYWORDS);
  const linkIncluded = joined.includes('http://') || joined.includes('https://') || joined.includes('www.');
  const imageIncluded = containsAny(joined, IMAGE_KEYWORDS);

  const tags: string[] = [];
  if (moneyRequest) tags.push('금전');
  if (favorRequest) tags.push('부탁');
  if (excessivePraise) tags.push('과한 칭찬');
  if (linkIncluded) tags.push('링크');
  if (imageIncluded) tags.push('이미지');

  const riskFlagsCount = [moneyRequest, favorRequest, excessivePraise, linkIncluded, imageIncluded].filter(Boolean).length;
  const summary = messages[0] ?? '오늘의 대화를 기록했어요.';

  return {
    messages,
    summary,
    tags,
    riskFlagsCount,
    flags: {
      moneyRequest,
      favorRequest,
      excessivePraise,
      linkIncluded,
      imageIncluded,
    },
    rawTextLength: text.length,
    messagesCount: messages.length,
  };
}

async function readTextFromZip(uri: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64',
  });
  const zip = await JSZip.loadAsync(base64, { base64: true });
  const files = Object.values(zip.files).filter((file) => !file.dir);
  const txtCandidates = files.filter((file) => /\.txt$/i.test(file.name));
  const candidates = txtCandidates.length > 0 ? txtCandidates : files;
  if (candidates.length === 0) {
    throw new Error('zip_no_files');
  }
  return await candidates[0].async('string');
}

export async function parseKakaoFile(uri: string, name?: string): Promise<ParsedConversation> {
  const isZip = name?.toLowerCase().endsWith('.zip') ?? false;
  const isTxt = name?.toLowerCase().endsWith('.txt') ?? false;

  if (isZip) {
    try {
      const text = await readTextFromZip(uri);
      return buildParsedConversation(text);
    } catch (error) {
      const err = new Error('zip_parse_failed');
      (err as Error).cause = error;
      throw err;
    }
  }

  if (isTxt) {
    const text = await FileSystem.readAsStringAsync(uri, {
      encoding: 'utf8',
    });
    return buildParsedConversation(text);
  }

  // fallback: try as text
  const text = await FileSystem.readAsStringAsync(uri, {
    encoding: 'utf8',
  });
  return buildParsedConversation(text);
}
