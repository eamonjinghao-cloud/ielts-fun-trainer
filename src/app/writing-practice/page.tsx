'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WRITING_QUESTIONS } from '@/lib/questions';
import { ACHIEVEMENTS, type Achievement, type PracticeSession } from '@/lib/types';
import { analyzeWritingFeedback, calculateSpeakingWritingEstimate, generateId } from '@/lib/utils';
import { saveSession, getSettings, saveSettings } from '@/lib/storage';
import WritingQuestion from '@/components/WritingQuestion';
import type { WritingQuestion as WritingQuestionType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import AchievementToast from '@/components/AchievementToast';

type Phase = 'intro' | 'practice' | 'feedback' | 'submitting';

/** 反馈类型：本地规则 or AI 增强 */
interface FeedbackResult {
  overall: string;
  strengths: string[];
  improvements: string[];
  tips: string[];
  estimatedBand: number;
  vocabularyScore?: number;
  grammarScore?: number;
  coherenceScore?: number;
  taskAchievementScore?: number;
  isAIFeedback?: boolean;
}

interface WritingResult {
  question: WritingQuestionType;
  draft: string;
  wordCount: number;
  timeUsed: number;
  feedback: FeedbackResult;
}

export default function WritingPracticePage() {
  const router = useRouter();
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentQ, setCurrentQ] = useState<WritingQuestionType | null>(null);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [sessionStartTime] = useState(Date.now());
  const [result, setResult] = useState<WritingResult | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  useEffect(() => {
    const settings = getSettings();
    setLang(settings.language);
    // 每天只出一题，随机选1题
    const randomQ = WRITING_QUESTIONS[Math.floor(Math.random() * WRITING_QUESTIONS.length)];
    setCurrentQ(randomQ);
  }, []);

  const handleQuestionDone = useCallback(async (wordCount: number, draft: string, timeUsed: number) => {
    if (!currentQ) return;
    // 先做本地规则分析（即时展示）
    const localFeedback = analyzeWritingFeedback(currentQ, draft, timeUsed);
    setResult({
      question: currentQ,
      draft,
      wordCount,
      timeUsed,
      feedback: localFeedback,
    });
    setPhase('feedback');

    // 异步调 AI 做深度分析（不阻塞页面展示）
    setAiAnalyzing(true);
    try {
      const res = await fetch('/api/writing-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentQ.prompt,
          essay: draft,
          wordCount,
          type: currentQ.type,
          timeUsed,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.source === 'agnes-ai') {
          setResult(prev => prev ? {
            ...prev,
            feedback: { ...data.feedback, isAIFeedback: true },
          } : prev);
        }
      }
    } catch {
      // AI 不可用，保留本地规则分析结果
    } finally {
      setAiAnalyzing(false);
    }
  }, [currentQ]);

  const handleFinish = useCallback(() => {
    if (!result || !currentQ) return;
    
    const totalDuration = Math.round((Date.now() - sessionStartTime) / 1000);
    
    const settings = getSettings();
    const allAcc = settings.achievements;
    const unlocked: Achievement[] = [];

    if (!allAcc.includes('first_session')) unlocked.push(ACHIEVEMENTS.find(a => a.id === 'first_session')!);
    if (totalDuration < 300 && !allAcc.includes('speed_demon')) unlocked.push(ACHIEVEMENTS.find(a => a.id === 'speed_demon')!);
    if (result.wordCount >= currentQ.minWordCount * 1.1 && !allAcc.includes('target_reached')) {
      unlocked.push(ACHIEVEMENTS.find(a => a.id === 'target_reached')!);
    }

    const newIds = unlocked.map(a => a.id);
    saveSettings({ ...settings, achievements: [...allAcc, ...newIds], totalSessions: settings.totalSessions + 1 });
    setNewAchievements(unlocked);

    const estResult = calculateSpeakingWritingEstimate(result.feedback.estimatedBand, result.feedback.estimatedBand);
    
    const session: PracticeSession = {
      id: generateId(),
      createdAt: Date.now(),
      type: 'writing',
      writingQuestions: [currentQ],
      writingDrafts: { [currentQ.id]: result.draft },
      timeUsed: totalDuration,
      score: {
        reading: 0,
        listening: 0,
        vocabulary: 0,
        estimatedWriting: result.feedback.estimatedBand,
        estimatedSpeaking: estResult.speaking,
        total: result.feedback.estimatedBand,
        accuracy: 100,
      },
      achievements: unlocked,
    };

    saveSession(session);
    setPhase('submitting');

    setTimeout(() => {
      router.push(`/results?id=${session.id}`);
    }, 1000);
  }, [result, currentQ, sessionStartTime, router]);

  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #f8f7ff, #ede9fe)' }}>
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl animate-float">✍️</div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)]">
            {lang === 'zh' ? '写作练习' : 'Writing Practice'}
          </h1>
          <div className="rounded-2xl bg-white border border-[var(--border)] p-6 text-left space-y-3 shadow-sm">
            <div className="text-sm">
              <div className="font-semibold">{lang === 'zh' ? '练习说明' : 'How It Works'}</div>
              <div className="text-[var(--muted-foreground)] mt-1 space-y-1">
                {lang === 'zh' ? (
                  <>
                    <div>📋 <strong>每天只出一题</strong>，精选题目助你精雕细琢</div>
                    <div>📋 <strong>小作文 (Task 1)</strong> — 图表描述，限时8分钟</div>
                    <div>📋 <strong>大作文 (Task 2)</strong> — 议论文，限时15分钟</div>
                    <div>⌨️ 实时字数统计，帮助把握篇幅</div>
                    <div>📝 提交后会给出 <strong>修改建议</strong> + <strong>提分方案</strong></div>
                    <div>⏱ 倒计时结束后自动提交</div>
                  </>
                ) : (
                  <>
                    <div>📋 <strong>One question per day</strong> — focus on quality over quantity</div>
                    <div>📋 <strong>Task 1 (Small Essay)</strong> — Chart description, 8 min</div>
                    <div>📋 <strong>Task 2 (Large Essay)</strong> — Argumentative essay, 15 min</div>
                    <div>⌨️ Live word count to help manage length</div>
                    <div>📝 After submission: <strong>detailed feedback + score improvement tips</strong></div>
                    <div>⏱ Auto-submit on time-out</div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => router.push('/')}>
              {lang === 'zh' ? '← 返回' : '← Back'}
            </Button>
            <Button className="flex-2 flex-grow" size="lg" onClick={() => setPhase('practice')}>
              {lang === 'zh' ? '✍️ 开始练习' : '✍️ Start'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'feedback' && result) {
    return (
      <div className="min-h-screen bg-[var(--background)] py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Feedback header */}
          <div className="text-center space-y-2">
            <div className="text-5xl">📊</div>
            <h2 className="text-2xl font-bold text-[var(--foreground)]">
              {lang === 'zh' ? '写作反馈' : 'Writing Feedback'}
            </h2>
          </div>

          {/* Summary card */}
          <div className="rounded-2xl bg-white border border-[var(--border)] p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted-foreground)]">
                {lang === 'zh' ? '预估 Band Score' : 'Estimated Band Score'}
              </span>
              <div className="flex items-center gap-2">
                {result.feedback.isAIFeedback ? (
                  <span className="text-xs font-medium text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full">AI</span>
                ) : (
                  <span className="text-xs font-medium text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">{lang === 'zh' ? '规则分析' : 'Rule-based'}</span>
                )}
                {aiAnalyzing && (
                  <span className="text-xs text-violet-500 animate-pulse">{lang === 'zh' ? 'AI 分析中...' : 'AI analyzing...'}</span>
                )}
                <span className="text-3xl font-extrabold text-[var(--primary)]">{result.feedback.estimatedBand.toFixed(1)}</span>
              </div>
            </div>
            <div className="text-sm text-[var(--foreground)] bg-gray-50 rounded-lg p-3">
              {result.feedback.overall}
            </div>

            {/* Strengths */}
            <details className="group" open>
              <summary className="cursor-pointer font-semibold text-emerald-600 flex items-center gap-2">
                <span>✅</span> {lang === 'zh' ? '优点' : 'Strengths'}
              </summary>
              <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)] pl-6 list-disc">
                {result.feedback.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </details>

            {/* Improvements */}
            <details className="group" open>
              <summary className="cursor-pointer font-semibold text-amber-600 flex items-center gap-2">
                <span>💡</span> {lang === 'zh' ? '改进建议' : 'Areas for Improvement'}
              </summary>
              <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)] pl-6 list-disc">
                {result.feedback.improvements.map((imp, i) => (
                  <li key={i}>{imp}</li>
                ))}
              </ul>
            </details>

            {/* Tips */}
            <details className="group" open>
              <summary className="cursor-pointer font-semibold text-blue-600 flex items-center gap-2">
                <span>🎯</span> {lang === 'zh' ? '提分建议' : 'Score Improvement Tips'}
              </summary>
              <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)] pl-6 list-disc">
                {result.feedback.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </details>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setPhase('practice')}>
              {lang === 'zh' ? '✏️ 重新写作' : '✏️ Rewrite'}
            </Button>
            <Button className="flex-1" size="lg" onClick={handleFinish}>
              {lang === 'zh' ? '✅ 完成并提交' : '✅ Done & Submit'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'submitting') {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4" style={{ background: 'linear-gradient(135deg, #f8f7ff, #ede9fe)' }}>
        <div className="text-6xl animate-celebrate">🎊</div>
        <h2 className="text-2xl font-bold">
          {lang === 'zh' ? '写作练习完成！正在保存成绩...' : 'Writing Complete! Saving scores...'}
        </h2>
        <AchievementToast achievements={newAchievements} />
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-[var(--muted-foreground)] animate-pulse">
          {lang === 'zh' ? '加载题目中...' : 'Loading question...'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[var(--border)] px-4 py-3 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--muted-foreground)]">
            ✍️ {lang === 'zh' ? '今日写作题' : 'Today\'s Writing Question'}
          </span>
          <span className="text-sm font-medium">
            {currentQ.type === 'small' ? '📊 Task 1' : '📝 Task 2'}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <WritingQuestion
          key={currentQ.id}
          question={currentQ}
          questionIndex={0}
          total={1}
          onFinish={handleQuestionDone}
          lang={lang}
        />
      </div>
    </div>
  );
}
