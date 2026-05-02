export type ApologyBreakdown = {
  responsibility: number;
  specificity: number;
  empathy: number;
  noExcuse: number;
  prevention: number;
};

export type ApologyScoreResult = {
  totalScore: number;
  breakdown: ApologyBreakdown;
  summary: string;
  weakPoints: string[];
  improvedApology: string;
};

export const APOLOGY_BREAKDOWN_MAX: ApologyBreakdown = {
  responsibility: 25,
  specificity: 20,
  empathy: 20,
  noExcuse: 15,
  prevention: 20,
};

const RESPONSIBILITY_WORDS = ['내가', '제가', '내 잘못', '제 잘못', '책임', '미안', '죄송'];
const SPECIFICITY_HINTS = ['때문에', '왜냐하면', '그때', '어제', '오늘', '약속', '장소', '시간'];
const EMPATHY_WORDS = ['상처', '속상', '불안', '기분', '힘들', '외로', '서운'];
const PREVENTION_WORDS = ['다음부터', '앞으로', '하지 않겠', '고치겠', '바꾸겠', '노력하겠'];
const EXCUSE_WORDS = ['근데', '하지만', '그치만', '네가', '예민', '어쩔 수', '어쩔수', '원래'];

function countMatches(text: string, words: string[]): number {
  let n = 0;
  for (const w of words) {
    let from = 0;
    while (true) {
      const idx = text.indexOf(w, from);
      if (idx === -1) break;
      n++;
      from = idx + w.length;
    }
  }
  return n;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function fallbackScoreApology(text: string): ApologyScoreResult {
  const trimmed = (text ?? '').trim();
  if (!trimmed) {
    return {
      totalScore: 0,
      breakdown: { responsibility: 0, specificity: 0, empathy: 0, noExcuse: 0, prevention: 0 },
      summary: '사과문이 비어 있습니다.',
      weakPoints: ['사과 내용을 직접 작성해 주세요.'],
      improvedApology: '',
    };
  }

  const len = trimmed.length;
  const responsibilityHits = countMatches(trimmed, RESPONSIBILITY_WORDS);
  const empathyHits = countMatches(trimmed, EMPATHY_WORDS);
  const preventionHits = countMatches(trimmed, PREVENTION_WORDS);
  const specificityHits = countMatches(trimmed, SPECIFICITY_HINTS) + (len > 80 ? 2 : 0);
  const excuseHits = countMatches(trimmed, EXCUSE_WORDS);

  const breakdown: ApologyBreakdown = {
    responsibility: clamp(responsibilityHits * 8, 0, APOLOGY_BREAKDOWN_MAX.responsibility),
    specificity: clamp(specificityHits * 5, 0, APOLOGY_BREAKDOWN_MAX.specificity),
    empathy: clamp(empathyHits * 7, 0, APOLOGY_BREAKDOWN_MAX.empathy),
    noExcuse: clamp(APOLOGY_BREAKDOWN_MAX.noExcuse - excuseHits * 5, 0, APOLOGY_BREAKDOWN_MAX.noExcuse),
    prevention: clamp(preventionHits * 8, 0, APOLOGY_BREAKDOWN_MAX.prevention),
  };

  const totalScore = Math.round(
    breakdown.responsibility +
      breakdown.specificity +
      breakdown.empathy +
      breakdown.noExcuse +
      breakdown.prevention,
  );

  const weakPoints: string[] = [];
  if (breakdown.responsibility < APOLOGY_BREAKDOWN_MAX.responsibility * 0.5)
    weakPoints.push('내가 무엇을 잘못했는지 1인칭으로 분명히 짚어주세요.');
  if (breakdown.specificity < APOLOGY_BREAKDOWN_MAX.specificity * 0.5)
    weakPoints.push('어떤 상황에서, 무슨 행동이 문제였는지 구체적으로 적어주세요.');
  if (breakdown.empathy < APOLOGY_BREAKDOWN_MAX.empathy * 0.5)
    weakPoints.push('상대가 느꼈을 감정을 직접 언급해 주세요. 예: 속상, 불안, 서운.');
  if (breakdown.noExcuse < APOLOGY_BREAKDOWN_MAX.noExcuse * 0.5)
    weakPoints.push("'근데', '네가 예민해서', '어쩔 수 없었어' 류의 표현은 피해주세요.");
  if (breakdown.prevention < APOLOGY_BREAKDOWN_MAX.prevention * 0.5)
    weakPoints.push('다음에 어떻게 다르게 행동할지 한 문장이라도 약속해 주세요.');

  const summary =
    totalScore >= 80
      ? '사과문이 비교적 진정성 있게 구성되어 있습니다.'
      : totalScore >= 50
        ? '기본적인 책임 인정은 있지만 보완할 부분이 있습니다.'
        : '현재 사과문은 책임 인정과 구체성이 부족합니다.';

  const improvedApology = buildImprovedApology(trimmed, weakPoints);

  return {
    totalScore,
    breakdown,
    summary,
    weakPoints: weakPoints.length
      ? weakPoints
      : ['전반적으로 양호합니다. 한 문장으로 재발 방지를 더해도 좋습니다.'],
    improvedApology,
  };
}

function buildImprovedApology(original: string, weakPoints: string[]): string {
  const oneLine = original.replace(/\s+/g, ' ').trim();
  const lead = oneLine.length > 60 ? oneLine.slice(0, 60) + '…' : oneLine;
  const hasResp = weakPoints.some((w) => w.includes('1인칭'));
  const hasEmp = weakPoints.some((w) => w.includes('감정'));
  const hasPrev = weakPoints.some((w) => w.includes('재발'));

  return [
    `먼저 사과할게. 내가 ${hasResp ? '약속에 늦어서' : '약속을 가볍게 여긴 것 같아서'} 미안해.`,
    `${hasEmp ? '네가 기다리면서 속상하고 서운했을 거 같아.' : '네가 어떤 마음이었는지 다시 생각해봤어.'}`,
    `(원문 일부: "${lead}")`,
    `${hasPrev ? '다음부터는 출발 시간을 미리 공유하고, 늦을 것 같으면 즉시 알려줄게.' : '오늘 일을 가볍게 넘기지 않을게.'}`,
  ].join(' ');
}

const SYSTEM_PROMPT = `너는 한국어 연인 간 사과문을 평가하는 평가자다.
평가는 차분하고 단정적인 톤으로 진행한다. 연애 상담을 하지 말고,
문장 자체의 진정성, 책임감, 구체성만 평가하라.

평가 기준 (총 100점):
- responsibility (25): 1인칭으로 자신의 잘못을 분명히 인정했는가
- specificity (20): 어떤 상황/행동이 문제였는지 구체적으로 적었는가
- empathy (20): 상대가 느꼈을 감정을 직접 언급했는가
- noExcuse (15): 변명/회피/책임 전가 표현이 없는가
  (예: "근데", "하지만", "네가 예민해서", "어쩔 수 없었어")
- prevention (20): 같은 문제를 반복하지 않기 위한 구체적 약속이 있는가

상대를 조종하거나 죄책감을 유도하는 표현이 있으면 noExcuse를 감점하라.
"내가 ~해서 너에게 ~한 감정을 줬다", "다음에는 ~하겠다" 같은 표현은 가점이다.

반드시 다음 JSON만 출력하라. 코드블록, 주석, 추가 텍스트 금지:
{
  "totalScore": number,
  "breakdown": {
    "responsibility": number,
    "specificity": number,
    "empathy": number,
    "noExcuse": number,
    "prevention": number
  },
  "summary": string,
  "weakPoints": string[],
  "improvedApology": string
}`;

export type ScoreWithOpenAIOptions = {
  apiKey: string;
  model?: string;
  endpoint?: string;
  signal?: AbortSignal;
};

export async function scoreWithOpenAI(
  text: string,
  opts: ScoreWithOpenAIOptions,
): Promise<ApologyScoreResult> {
  const endpoint = opts.endpoint ?? 'https://api.openai.com/v1/chat/completions';
  const model = opts.model ?? 'gpt-4o-mini';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `다음 사과문을 평가하라.\n\n사과문:\n"""${text}"""` },
      ],
    }),
    signal: opts.signal,
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = (json.choices?.[0]?.message?.content ?? '').trim();
  return parseScoreJson(raw, text);
}

export type ScoreApologyOptions = {
  openAI?: ScoreWithOpenAIOptions;
};

export async function scoreApology(
  text: string,
  options: ScoreApologyOptions = {},
): Promise<ApologyScoreResult> {
  if (options.openAI?.apiKey) {
    try {
      return await scoreWithOpenAI(text, options.openAI);
    } catch {
      return fallbackScoreApology(text);
    }
  }
  return fallbackScoreApology(text);
}

function parseScoreJson(raw: string, originalText: string): ApologyScoreResult {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) {
    return fallbackScoreApology(originalText);
  }
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    const breakdown: ApologyBreakdown = {
      responsibility: clamp(
        Number(parsed?.breakdown?.responsibility) || 0,
        0,
        APOLOGY_BREAKDOWN_MAX.responsibility,
      ),
      specificity: clamp(
        Number(parsed?.breakdown?.specificity) || 0,
        0,
        APOLOGY_BREAKDOWN_MAX.specificity,
      ),
      empathy: clamp(Number(parsed?.breakdown?.empathy) || 0, 0, APOLOGY_BREAKDOWN_MAX.empathy),
      noExcuse: clamp(Number(parsed?.breakdown?.noExcuse) || 0, 0, APOLOGY_BREAKDOWN_MAX.noExcuse),
      prevention: clamp(
        Number(parsed?.breakdown?.prevention) || 0,
        0,
        APOLOGY_BREAKDOWN_MAX.prevention,
      ),
    };
    const totalScore = clamp(
      Math.round(
        Number.isFinite(parsed?.totalScore)
          ? Number(parsed.totalScore)
          : breakdown.responsibility +
              breakdown.specificity +
              breakdown.empathy +
              breakdown.noExcuse +
              breakdown.prevention,
      ),
      0,
      100,
    );
    return {
      totalScore,
      breakdown,
      summary: typeof parsed?.summary === 'string' ? parsed.summary : '',
      weakPoints: Array.isArray(parsed?.weakPoints)
        ? parsed.weakPoints.filter((s: unknown): s is string => typeof s === 'string')
        : [],
      improvedApology:
        typeof parsed?.improvedApology === 'string' ? parsed.improvedApology : '',
    };
  } catch {
    return fallbackScoreApology(originalText);
  }
}
