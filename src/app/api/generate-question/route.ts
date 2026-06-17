import { NextRequest, NextResponse } from 'next/server';
import { READING_QUESTIONS, LISTENING_QUESTIONS } from '@/lib/questions';

/**
 * Agnes AI接口预留
 * 当前返回Mock数据
 * 未来升级：将此接口连接到Agnes AI或其他模型，动态生成题目
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'reading';
  const count = parseInt(searchParams.get('count') ?? '5', 10);

  // Known types: reading, listening (vocabulary/speaking/writing are client-only)
  const validTypes = ['reading', 'listening'];
  if (!validTypes.includes(type)) {
    return NextResponse.json({
      success: true,
      questions: [],
      meta: {
        model: 'mock-v1',
        note: `Unknown question type "${type}". Supported types: ${validTypes.join(', ')}.`,
        generated_at: new Date().toISOString(),
      },
    });
  }

  // Mock: return questions from our question bank
  const pool = type === 'listening' ? LISTENING_QUESTIONS : READING_QUESTIONS;
  const questions = pool.slice(0, Math.min(count, pool.length));

  return NextResponse.json({
    success: true,
    questions,
    meta: {
      model: 'mock-v1',
      note: 'MVP mock data. Upgrade to Agnes AI or another model for dynamic question generation.',
      generated_at: new Date().toISOString(),
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  // Future: send body.prompt to Agnes AI and return generated question
  return NextResponse.json({
    success: true,
    message: 'Agnes AI integration coming soon. Currently returning mock data.',
    question: READING_QUESTIONS[0],
    meta: {
      model: 'mock-v1',
      prompt_received: body.prompt ?? null,
    },
  });
}
