'use client';

import { useState, useEffect, useRef } from 'react';
import type { WritingQuestion as WritingQuestionType } from '@/lib/types';
import { cn, formatTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WritingQuestionProps {
  question: WritingQuestionType;
  questionIndex: number;
  total: number;
  onFinish: (wordCount: number, draft: string, timeUsed: number) => void;
  lang: 'zh' | 'en';
}

export default function WritingQuestion({
  question, questionIndex, total, onFinish, lang
}: WritingQuestionProps) {
  const [draft, setDraft] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(question.timeLimitSeconds);
  const [finished, setFinished] = useState(false);
  const [startTime] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (finished) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          handleAutoFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, finished]);

  // Reset on question change
  useEffect(() => {
    setDraft('');
    setSecondsLeft(question.timeLimitSeconds);
    setFinished(false);
  }, [question.id, question.timeLimitSeconds]);

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const meetsMin = wordCount >= question.minWordCount;
  const timePercent = (secondsLeft / question.timeLimitSeconds) * 100;

  const handleAutoFinish = () => {
    if (finished) return;
    setFinished(true);
    const timeUsed = Math.round((Date.now() - startTime) / 1000);
    setTimeout(() => {
      onFinish(wordCount, draft, timeUsed);
    }, 1000);
  };

  const handleManualFinish = () => {
    if (finished) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    handleAutoFinish();
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary">
          ✍️ {lang === 'zh' ? '写作练习' : 'Writing'} {questionIndex + 1}/{total}
        </Badge>
        <Badge variant="outline">
          {question.type === 'small'
            ? (lang === 'zh' ? '小作文 Task 1' : 'Task 1 — Small Essay')
            : (lang === 'zh' ? '大作文 Task 2' : 'Task 2 — Large Essay')}
        </Badge>
      </div>

      {/* Timer bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-1000 rounded-full',
            secondsLeft < 60 ? 'bg-red-500' : secondsLeft < 120 ? 'bg-orange-400' : 'bg-[var(--primary)]'
          )}
          style={{ width: `${timePercent}%` }}
        />
      </div>

      {/* Time display */}
      <div className="flex items-center justify-between text-sm">
        <span className={cn(
          'font-bold tabular-nums',
          secondsLeft < 60 ? 'text-red-500' : secondsLeft < 120 ? 'text-orange-500' : 'text-[var(--primary)]'
        )}>
          ⏱ {formatTime(secondsLeft)}
        </span>
        <span className="text-[var(--muted-foreground)]">
          {lang === 'zh' ? '限时' : 'Time limit'}: {formatTime(question.timeLimitSeconds)}
        </span>
      </div>

      {/* Prompt */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-6">
        <h3 className="font-semibold text-base text-[var(--foreground)] mb-2">
          {lang === 'zh' ? '📝 题目要求' : '📝 Writing Prompt'}
        </h3>
        <p className="text-sm leading-relaxed text-[var(--foreground)]">{question.prompt}</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-3">
          {lang === 'zh'
            ? `要求至少 ${question.minWordCount} 词`
            : `Minimum ${question.minWordCount} words required`}
        </p>
      </div>

      {/* Writing area */}
      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={e => { if (!finished) setDraft(e.target.value); }}
          placeholder={lang === 'zh' ? '在此输入你的作文...' : 'Type your essay here...'}
          disabled={finished}
          aria-label={lang === 'zh' ? '写作区域' : 'Writing area'}
          className={cn(
            'w-full rounded-xl border-2 px-4 py-3 text-base leading-relaxed outline-none transition-all duration-200 min-h-[300px] resize-y',
            finished
              ? 'border-[var(--border)] bg-gray-50 cursor-default'
              : 'border-[var(--border)] focus:border-[var(--primary)] bg-white'
          )}
        />

        {/* Word count indicator */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className={cn(
              'font-bold',
              meetsMin ? 'text-emerald-600' : wordCount > question.minWordCount * 0.5 ? 'text-amber-500' : 'text-red-500'
            )}>
              {wordCount}
            </span>
            <span className="text-[var(--muted-foreground)]">
              / {question.minWordCount} {lang === 'zh' ? '词' : 'words'}
              {meetsMin && ' ✅'}
            </span>
          </div>
          {!meetsMin && wordCount > 0 && (
            <span className="text-xs text-[var(--muted-foreground)]">
              {lang === 'zh'
                ? `还差 ${question.minWordCount - wordCount} 词`
                : `${question.minWordCount - wordCount} more words needed`}
            </span>
          )}
        </div>

        {/* Word count progress bar */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300 rounded-full',
              meetsMin ? 'bg-emerald-500' : wordCount > question.minWordCount * 0.5 ? 'bg-amber-400' : 'bg-red-400'
            )}
            style={{ width: `${Math.min(100, (wordCount / question.minWordCount) * 100)}%` }}
          />
        </div>
      </div>

      {/* Finish button */}
      {!finished ? (
        <div className="space-y-3">
          <Button className="w-full" size="lg" onClick={handleManualFinish}>
            {lang === 'zh' ? '提交作文 →' : 'Submit Essay →'}
          </Button>
          {!meetsMin && wordCount > 0 && (
            <p className="text-xs text-center text-amber-600">
              ⚠️ {lang === 'zh' ? '你的字数还未达到最低要求' : 'Your word count has not reached the minimum requirement'}
            </p>
          )}
        </div>
      ) : (
        <div className="text-center text-sm text-[var(--muted-foreground)] animate-pulse">
          {lang === 'zh' ? '正在保存...' : 'Saving...'}
        </div>
      )}
    </div>
  );
}
