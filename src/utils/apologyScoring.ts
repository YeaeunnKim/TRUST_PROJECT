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
    };
  }

  const len = trimmed.length;
  const responsibilityHits = countMatches(trimmed, RESPONSIBILITY_WORDS);
  const empathyHits = countMatches(trimmed, EMPATHY_WORDS);
  const preventionHits = countMatches(trimmed, PREVENTION_WORDS);
  const specificityHits = countMatches(trimmed, SPECIFICITY_HINTS) + (len > 80 ? 2 : 0);
  const detectedExcuses = EXCUSE_WORDS.filter((w) => trimmed.includes(w));
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

  if (breakdown.responsibility < APOLOGY_BREAKDOWN_MAX.responsibility * 0.5) {
    weakPoints.push(
      responsibilityHits === 0
        ? "‘내가/제가’로 시작하는 1인칭 문장이 보이지 않아요. 잘못의 주체가 누구인지부터 분명히 짚어보세요."
        : '책임 인정 표현이 약해 보여요. 모호한 표현 대신 ‘내가 ~해서 미안해’처럼 무엇을 잘못했는지 한 문장으로 정리해보세요.',
    );
  }

  if (breakdown.specificity < APOLOGY_BREAKDOWN_MAX.specificity * 0.5) {
    weakPoints.push(
      '어떤 상황(언제·어디서·어떤 행동)이 문제였는지가 흐려요. 상대가 그 순간을 떠올릴 수 있도록 디테일을 한 가지만 더 더해보세요.',
    );
  }

  if (breakdown.empathy < APOLOGY_BREAKDOWN_MAX.empathy * 0.5) {
    weakPoints.push(
      '상대가 느꼈을 감정이 직접 인정되지 않았어요. 짐작 표현 말고 ‘많이 속상했을 것 같아’처럼 감정을 단어로 짚어보세요.',
    );
  }

  if (breakdown.noExcuse < APOLOGY_BREAKDOWN_MAX.noExcuse * 0.5) {
    if (detectedExcuses.length > 0) {
      const sample = detectedExcuses
        .slice(0, 3)
        .map((w) => `‘${w}’`)
        .join(', ');
      weakPoints.push(
        `${sample} 같은 표현이 변명처럼 읽힐 수 있어요. 정말 필요한 정보인지 다시 보고, 사과와 분리해서 적어보세요.`,
      );
    } else {
      weakPoints.push(
        '이유를 설명하느라 사과의 무게가 흐려져 있어요. 이유와 사과를 분리해서, 사과 부분만 먼저 한 줄로 적어보세요.',
      );
    }
  }

  if (breakdown.prevention < APOLOGY_BREAKDOWN_MAX.prevention * 0.5) {
    weakPoints.push(
      '앞으로 어떻게 다를지가 빠져 있어요. ‘잘할게’ 같은 추상적 다짐 대신 ‘어떤 상황에서 무엇을 바꿀지’ 한 가지를 떠올려보세요.',
    );
  }

  if (len < 40) {
    weakPoints.push(
      '사과문이 다소 짧아요. 잘못한 일·상대 마음·앞으로의 변화 — 세 가지 중 빠진 게 있는지 한 번 더 살펴보세요.',
    );
  }

  const summary =
    totalScore >= 80
      ? '전반적으로 진정성 있는 사과문입니다. 마지막으로 빠진 디테일이 있는지 한 번만 더 훑어보세요.'
      : totalScore >= 50
        ? '책임 인정의 뼈대는 잡혀 있어요. 아래 항목 중 한두 개를 직접 다시 써본다고 생각해보세요.'
        : '아직 사과의 핵심이 채워지지 않았어요. 어떤 부분이 빠졌는지 항목별로 다시 짚어보세요.';

  return {
    totalScore,
    breakdown,
    summary,
    weakPoints: weakPoints.length
      ? weakPoints
      : ['항목별 점수는 균형 있게 채워졌어요. 더 다듬는다면 어떤 부분을 더 깊게 적고 싶은지 스스로에게 물어보세요.'],
  };
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

weakPoints는 사용자가 직접 다시 쓰도록 돕는 코칭형 안내여야 한다.
- 어느 항목이 왜 약한지 구체적으로 진단하라 (가능하면 사과문 안의 실제 표현을 짚어라).
- 사용자가 따라 쓸 수 있는 완성된 문장 예시를 절대 제공하지 마라.
- 점검 질문이나 ‘어떤 부분을 채워보세요’ 같은 행동 지침으로 작성하라.
- 항목별로 1개씩, 최대 6개까지.

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
  "weakPoints": string[]
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
    };
  } catch {
    return fallbackScoreApology(originalText);
  }
}
