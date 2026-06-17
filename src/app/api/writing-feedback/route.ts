import { NextRequest, NextResponse } from 'next/server';
import { aiWritingAnalysis } from '@/lib/agnes';
import { analyzeWritingFeedback } from '@/lib/utils';

/**
 * AI 写作分析接口
 * 先用 AI 做深度分析，AI 不可用时回退到本地规则分析
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { prompt, essay, wordCount, type, timeUsed } = body as {
    prompt?: string;
    essay?: string;
    wordCount?: number;
    type?: 'small' | 'large';
    timeUsed?: number;
  };

  if (!essay || !prompt) {
    return NextResponse.json({
      success: false,
      error: 'Missing required fields: prompt, essay',
    }, { status: 400 });
  }

  try {
    // 尝试 AI 分析
    const aiResult = await aiWritingAnalysis(
      prompt,
      essay,
      wordCount ?? essay.trim().split(/\s+/).length,
      type ?? 'large'
    );

    return NextResponse.json({
      success: true,
      feedback: aiResult,
      source: 'agnes-ai',
    });
  } catch (error) {
    // 失败时回退到本地规则分析
    console.warn('AI writing analysis unavailable, falling back to rule-based:', error);

    const ruleFeedback = analyzeWritingFeedback(
      { type: type ?? 'large', minWordCount: type === 'small' ? 150 : 250, prompt: prompt ?? '' },
      essay,
      timeUsed ?? 0
    );

    return NextResponse.json({
      success: true,
      feedback: {
        ...ruleFeedback,
        vocabularyScore: ruleFeedback.estimatedBand,
        grammarScore: ruleFeedback.estimatedBand,
        coherenceScore: ruleFeedback.estimatedBand,
        taskAchievementScore: ruleFeedback.estimatedBand,
      },
      source: 'rule-based',
    });
  }
}
