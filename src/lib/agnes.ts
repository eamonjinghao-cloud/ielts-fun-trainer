/**
 * Agnes AI 全模态 SDK (OpenAI-compatible)
 * API Base: https://apihub.agnes-ai.com/v1
 *
 * 支持: 出题 (阅读/听力/词汇/口语/写作)、写作深度分析、个性化消息
 * 兼容 OpenAI /v1/chat/completions 协议
 */

const AGNES_BASE = 'https://apihub.agnes-ai.com/v1';

function getApiKey(): string {
  const key = process.env.AGNES_API_KEY;
  if (!key) throw new Error('AGNES_API_KEY 未设置');
  return key;
}

async function chatCompletions(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const res = await fetch(`${AGNES_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: 'agnes-1.5-flash',
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown');
    throw new Error(`Agnes AI API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/** 安全解析 AI 返回的 JSON（带重试） */
function safeParseJSON(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    // 尝试从 markdown 代码块中提取
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ====== 题目生成 ======

export interface AIReadingQuestion {
  id: string;
  type: 'reading';
  subtype: 'multiple-choice';
  passage: string;
  questionText: string;
  options: string[];
  correctAnswer: string;    // "A" | "B" | "C" | "D"
  explanation: string;
  bandLevel: number;
}

export interface AIListeningQuestion {
  id: string;
  type: 'listening';
  subtype: 'fill-blank' | 'multiple-choice';
  audioPrompt: string;
  questionText: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  bandLevel: number;
}

export interface AIVocabQuestion {
  id: string;
  chineseMeaning: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'A2' | 'B1' | 'B2' | 'C1';
}

export interface AISpeakingTopic {
  id: string;
  topic: string;
  prompt: string;
  checklist: string[];
  durationSeconds: number;
}

export interface AIWritingPrompt {
  id: string;
  type: 'small' | 'large';
  prompt: string;
  timeLimitSeconds: number;
  minWordCount: number;
}

/** 生成阅读题 */
export async function generateReadingQuestions(count: number = 5): Promise<AIReadingQuestion[]> {
  const systemPrompt = `You are an IELTS exam expert. Generate IELTS reading comprehension questions.
Return a JSON array only, no other text. Each item:
{
  "id": "r_xxx",
  "type": "reading",
  "subtype": "multiple-choice",
  "passage": "reading passage (80-120 words)",
  "questionText": "question based on passage",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correctAnswer": "A"|"B"|"C"|"D",
  "explanation": "why this answer is correct (in English)",
  "bandLevel": 5|6|7
}`;

  const content = await chatCompletions([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Generate ${count} IELTS reading questions. Use different topics each time.` },
  ]);

  const parsed = safeParseJSON(content);
  if (Array.isArray(parsed)) return parsed as AIReadingQuestion[];
  // fallback: wrap single object
  if (parsed && parsed.id) return [parsed] as unknown as AIReadingQuestion[];
  throw new Error('Failed to parse reading questions from AI response');
}

/** 生成听力题 */
export async function generateListeningQuestions(count: number = 5): Promise<AIListeningQuestion[]> {
  const systemPrompt = `You are an IELTS exam expert. Generate IELTS listening questions.
Return a JSON array only:
{
  "id": "l_xxx",
  "type": "listening",
  "subtype": "fill-blank"|"multiple-choice",
  "audioPrompt": "text that would be spoken (for TTS), 40-80 words",
  "questionText": "question with _____ for fill-blank",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."] (only for multiple-choice),
  "correctAnswer": "answer word or letter",
  "explanation": "why (in English)",
  "bandLevel": 4|5|6
}`;

  const content = await chatCompletions([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Generate ${count} IELTS listening questions with varied topics. Mix fill-blank and multiple-choice.` },
  ]);

  const parsed = safeParseJSON(content);
  if (Array.isArray(parsed)) return parsed as AIListeningQuestion[];
  if (parsed && parsed.id) return [parsed] as unknown as AIListeningQuestion[];
  throw new Error('Failed to parse listening questions from AI response');
}

/** 生成词汇题 */
export async function generateVocabQuestions(
  count: number = 5,
  difficulty: 'A2' | 'B1' | 'B2' | 'C1' = 'B1'
): Promise<AIVocabQuestion[]> {
  const systemPrompt = `You are an IELTS vocabulary expert. Generate English vocabulary questions for Chinese learners.
Return a JSON array only:
{
  "id": "v_xxx",
  "chineseMeaning": "Chinese meaning with part of speech, e.g. 'v. 加速；促进'",
  "options": ["word1", "word2", "word3", "word4"],
  "correctAnswer": "the correct word (must be one of the 4 options)",
  "difficulty": "A2"|"B1"|"B2"|"C1"
}`;

  const content = await chatCompletions([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Generate ${count} IELTS vocabulary questions at ${difficulty} level.` },
  ]);

  const parsed = safeParseJSON(content);
  if (Array.isArray(parsed)) return parsed as AIVocabQuestion[];
  if (parsed && parsed.id) return [parsed] as unknown as AIVocabQuestion[];
  throw new Error('Failed to parse vocab questions from AI response');
}

/** 生成口语话题 */
export async function generateSpeakingTopics(count: number = 3): Promise<AISpeakingTopic[]> {
  const systemPrompt = `You are an IELTS speaking examiner. Generate speaking topics.
Return a JSON array only:
{
  "id": "s_xxx",
  "topic": "Topic title",
  "prompt": "Detailed prompt text with bullet points (what to talk about)",
  "checklist": ["key point 1", "key point 2", "...", "key point N"],  // 6-8 items
  "durationSeconds": 180|240
}`;

  const content = await chatCompletions([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Generate ${count} IELTS speaking topics (mix of Part 2 and Part 3 style).` },
  ]);

  const parsed = safeParseJSON(content);
  if (Array.isArray(parsed)) return parsed as AISpeakingTopic[];
  if (parsed && parsed.id) return [parsed] as unknown as AISpeakingTopic[];
  throw new Error('Failed to parse speaking topics from AI response');
}

/** 生成写作题目 */
export async function generateWritingPrompts(count: number = 2): Promise<AIWritingPrompt[]> {
  const systemPrompt = `You are an IELTS writing examiner. Generate writing tasks.
Return a JSON array only:
{
  "id": "w_xxx",
  "type": "small"|"large",
  "prompt": "Full task description (in English)",
  "timeLimitSeconds": 480|900,
  "minWordCount": 150|250
}`;

  const content = await chatCompletions([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Generate ${count} IELTS writing tasks (mix of Task 1 and Task 2).` },
  ]);

  const parsed = safeParseJSON(content);
  if (Array.isArray(parsed)) return parsed as AIWritingPrompt[];
  if (parsed && parsed.id) return [parsed] as unknown as AIWritingPrompt[];
  throw new Error('Failed to parse writing prompts from AI response');
}

// ====== 写作深度分析 ======

export interface AIWritingAnalysis {
  overall: string;
  strengths: string[];
  improvements: string[];
  tips: string[];
  estimatedBand: number;
  vocabularyScore: number;
  grammarScore: number;
  coherenceScore: number;
  taskAchievementScore: number;
}

/** 用 AI 做写作深度分析 */
export async function aiWritingAnalysis(
  prompt: string,
  essay: string,
  wordCount: number,
  type: 'small' | 'large'
): Promise<AIWritingAnalysis> {
  const systemPrompt = `You are an IELTS writing examiner. Analyze the essay and return ONLY a JSON object:
{
  "overall": "Brief summary with word count and time",
  "strengths": ["strength 1", "strength 2", ...],
  "improvements": ["improvement suggestion 1", ...],
  "tips": ["score-boosting tip 1", ...],
  "estimatedBand": 5.5,
  "vocabularyScore": 6.0,
  "grammarScore": 5.5,
  "coherenceScore": 6.5,
  "taskAchievementScore": 6.0
}
Be specific and constructive. Use Chinese for Chinese students, keep band scores 1-9.`;

  const content = await chatCompletions([
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Essay prompt: "${prompt}"\n\nEssay type: ${type === 'small' ? 'Task 1 (chart description)' : 'Task 2 (argumentative)'}\nWord count: ${wordCount}\n\nEssay:\n${essay}`,
    },
  ], { temperature: 0.4 });

  const parsed = safeParseJSON(content) as Record<string, unknown> | null;
  if (!parsed) throw new Error('Failed to parse AI writing analysis');

  return {
    overall: String(parsed.overall ?? ''),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths as string[] : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements as string[] : [],
    tips: Array.isArray(parsed.tips) ? parsed.tips as string[] : [],
    estimatedBand: Number(parsed.estimatedBand ?? 5),
    vocabularyScore: Number(parsed.vocabularyScore ?? 5),
    grammarScore: Number(parsed.grammarScore ?? 5),
    coherenceScore: Number(parsed.coherenceScore ?? 5),
    taskAchievementScore: Number(parsed.taskAchievementScore ?? 5),
  };
}

// ====== 个性化鼓励消息 ======

/** 用 AI 生成个性化鼓励消息 */
export async function aiMotivationalMessage(
  total: number,
  accuracy: number,
  type: string,
  lang: 'zh' | 'en'
): Promise<string> {
  const prompt = lang === 'zh'
    ? `你是一个雅思教练。学生刚完成${type}练习，总分${total.toFixed(1)}，正确率${accuracy.toFixed(0)}%。写一句简短、有温度的鼓励语。不要超过30个字。`
    : `You are an IELTS coach. Student just finished ${type} practice. Score: ${total.toFixed(1)}/9, accuracy: ${accuracy.toFixed(0)}%. Write ONE short motivational sentence. Max 30 characters.`;

  const content = await chatCompletions([
    { role: 'system', content: 'You are an encouraging IELTS coach. Keep responses brief and warm.' },
    { role: 'user', content: prompt },
  ], { temperature: 0.8, max_tokens: 100 });

  return content.trim() || (lang === 'zh' ? '继续加油！' : 'Keep going!');
}
