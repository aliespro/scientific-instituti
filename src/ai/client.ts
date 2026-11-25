import type { AISettings, ChatMessage } from './types';
import { contextToText, type AIMapContext } from './context';
import { makeT, type Lang } from '../i18n';

const SYSTEM_PROMPT_FA = `تو یک دستیار هوشمند برای بررسی نقشه‌های ذهنی هستی.

هدف تو این نیست که نقشه را به جای کاربر اصلاح کنی؛
هدف این است که به کاربر کمک کنی خودش مشکلات نقشه را پیدا و اصلاح کند.

موارد زیر را بررسی کن:
۱. مشکلات ساختاری نقشه
۲. ارتباط‌های احتمالی اشتباه یا مبهم
۳. ارتباط‌های ناقص یا مفقود
۴. گره‌های تکراری یا بیش از حد مشابه
۵. دسته‌بندی‌های نامناسب
۶. سلسله‌مراتب‌های مشکوک
۷. گره‌های بسیار کلی یا بسیار جزئی
۸. تناقض‌های احتمالی
۹. مفاهیم مهمی که احتمالاً در نقشه جا افتاده‌اند

برای هر مشکل:
- محل مشکل را مشخص کن.
- دلیل احتمالی را توضیح بده.
- میزان اطمینان خودت را مشخص کن.
- به جای اصلاح مستقیم، یک سؤال یا راهنمایی بده تا کاربر خودش به پاسخ برسد.

اگر درباره یک مورد مطمئن نیستی، آن را به عنوان حقیقت قطعی بیان نکن.

وقتی به گره یا یالی اشاره می‌کنی، شناسه آن را در فرمت زیر در انتهای پاسخ خود قرار بده تا بوم بتواند آن را مشخص کند:

[[REFS]]
type:node|edge,id:شناسه
type:node|edge,id:شناسه
[[/REFS]]

برای مثال:
[[REFS]]
type:node,id:n1
type:edge,id:e3
[[/REFS]]

اگر به گره یا یال خاصی اشاره نمی‌کنی، بخش [[REFS]] را ننویس.`;

const SYSTEM_PROMPT_EN = `You are an intelligent assistant for reviewing mind maps.

Your goal is not to fix the map for the user;
your goal is to help the user find and fix problems themselves.

Check the following:
1. Structural issues in the map
2. Potentially incorrect or ambiguous connections
3. Missing or incomplete connections
4. Duplicate or overly similar nodes
5. Inappropriate categorizations
6. Suspicious hierarchies
7. Nodes that are too general or too specific
8. Potential contradictions
9. Important concepts likely missing from the map

For each issue:
- Identify the location of the problem.
- Explain the likely reason.
- State your level of confidence.
- Instead of fixing directly, ask a question or give guidance so the user arrives at the answer themselves.

If you are not certain about something, do not state it as a definitive fact.

When you refer to a node or edge, include its ID at the end of your response in this format so the canvas can highlight it:

[[REFS]]
type:node|edge,id:ID
type:node|edge,id:ID
[[/REFS]]

For example:
[[REFS]]
type:node,id:n1
type:edge,id:e3
[[/REFS]]

If you are not referring to any specific node or edge, do not include the [[REFS]] section.`;

function systemPrompt(lang: Lang): string {
  return lang === 'fa' ? SYSTEM_PROMPT_FA : SYSTEM_PROMPT_EN;
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

async function callAPI(
  settings: AISettings,
  messages: ChatMessage[],
): Promise<string> {
  const url = `${settings.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature: settings.temperature,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    const lower = errorBody.toLowerCase();
    if (res.status === 401) throw new Error(makeT('fa')('ai_invalid_key'));
    if (res.status === 404) throw new Error(makeT('fa')('ai_not_found'));
    if (res.status === 429) {
      if (lower.includes('token') || lower.includes('quota') || lower.includes('credit') || lower.includes('balance') || lower.includes('limit'))
        throw new Error(makeT('fa')('ai_tokens_exhausted'));
      throw new Error(makeT('fa')('ai_rate_limit'));
    }
    if (lower.includes('token') && (lower.includes('exhaust') || lower.includes('exceed') || lower.includes('insufficient')))
      throw new Error(makeT('fa')('ai_tokens_exhausted'));
    if (lower.includes('quota') && lower.includes('exceed'))
      throw new Error(makeT('fa')('ai_quota_exceeded'));
    throw new Error(makeT('fa')('ai_server_error', { status: res.status, detail: errorBody.slice(0, 200) }));
  }

  const data: ChatCompletionResponse = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(makeT('fa')('ai_no_response'));
  return content;
}

export async function testConnection(settings: AISettings, lang: Lang = 'fa'): Promise<{ ok: boolean; message: string }> {
  const t = makeT(lang);
  try {
    const reply = await callAPI(settings, [
      { role: 'user', content: t('ai_test_prompt') },
    ]);
    if (reply) return { ok: true, message: t('ai_test_success') };
    return { ok: false, message: t('ai_test_no_response') };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : t('ai_unknown_error') };
  }
}

export interface ParsedAIResponse {
  text: string;
  refs: { type: 'node' | 'edge'; id: string }[];
}

export function parseAIResponse(raw: string): ParsedAIResponse {
  const refs: { type: 'node' | 'edge'; id: string }[] = [];
  const refMatch = raw.match(/\[\[REFS\]\]([\s\S]*?)\[\[\/REFS\]\]/);
  let text = raw;

  if (refMatch) {
    text = raw.replace(/\[\[REFS\]\][\s\S]*?\[\[\/REFS\]\]/, '').trim();
    for (const line of refMatch[1].trim().split('\n')) {
      const m = line.trim().match(/type:(node|edge),\s*id:(.+)/);
      if (m) refs.push({ type: m[1] as 'node' | 'edge', id: m[2].trim() });
    }
  }

  return { text, refs };
}

export async function analyzeMap(
  settings: AISettings,
  ctx: AIMapContext,
  history: ChatMessage[],
  lang: Lang = 'fa',
): Promise<ParsedAIResponse> {
  const mapText = contextToText(ctx, lang);
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(lang) },
    ...history.slice(-6),
    {
      role: 'user',
      content: lang === 'fa' ? `نقشه ذهنی زیر را بررسی کن.\n\n${mapText}` : `Please review the following mind map.\n\n${mapText}`,
    },
  ];
  const raw = await callAPI(settings, messages);
  return parseAIResponse(raw);
}

export async function sendChat(
  settings: AISettings,
  ctx: AIMapContext,
  history: ChatMessage[],
  userMessage: string,
  lang: Lang = 'fa',
): Promise<ParsedAIResponse> {
  const mapText = contextToText(ctx, lang);
  const prompt = systemPrompt(lang);
  const userContext = lang === 'fa' ? `این نقشه ذهنی کاربر است:\n\n${mapText}` : `This is the user's mind map:\n\n${mapText}`;
  const messages: ChatMessage[] = [
    { role: 'system', content: `${prompt}\n\n${userContext}` },
    ...history.slice(-10),
    { role: 'user', content: userMessage },
  ];
  const raw = await callAPI(settings, messages);
  return parseAIResponse(raw);
}
