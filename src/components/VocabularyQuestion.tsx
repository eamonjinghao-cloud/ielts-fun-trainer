'use client';

import { useState, useEffect, useRef } from 'react';
import type { VocabularyQuestion } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface VocabularyQuestionProps {
  question: VocabularyQuestion;
  questionNumber: number;
  total: number;
  onAnswer: (answer: string) => void;
  lang: 'zh' | 'en';
}

/** Fisher-Yates shuffle for options array */
function shuffleOptions(arr: string[]): string[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function VocabularyQuestion({
  question, questionNumber, total, onAnswer, lang
}: VocabularyQuestionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>(() => shuffleOptions([...question.options]));
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSelected(null);
    setSubmitted(false);
    setCelebrate(false);
    setShuffledOptions(shuffleOptions([...question.options]));
  }, [question.id, question.options]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Keyboard shortcuts: 1/2/3/4 to select options, Enter to submit
  useEffect(() => {
    if (submitted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < shuffledOptions.length) {
        handleSelect(shuffledOptions[idx]);
        e.preventDefault();
      } else if (e.key === 'Enter' && selected) {
        handleSubmit();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitted, selected, shuffledOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (opt: string) => {
    if (submitted) return;
    setSelected(opt);
  };

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
    const isCorrect = selected.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    if (isCorrect) setCelebrate(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onAnswer(selected);
    }, 1500);
  };

  const difficultyColor: Record<string, string> = {
    A2: 'bg-green-100 text-green-700',
    B1: 'bg-blue-100 text-blue-700',
    B2: 'bg-amber-100 text-amber-700',
    C1: 'bg-red-100 text-red-700',
  };

  return (
    <div className="animate-fade-in-up space-y-6" role="radiogroup" aria-label={`${lang === 'zh' ? '词汇题' : 'Vocabulary question'} ${questionNumber} of ${total}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary">
          {lang === 'zh' ? '词汇练习' : 'Vocabulary'} {questionNumber}/{total}
        </Badge>
        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', difficultyColor[question.difficulty] ?? 'bg-gray-100 text-gray-700')}>
          {question.difficulty}
        </span>
      </div>

      {/* Chinese meaning */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-6 text-center">
        <p className="text-sm text-[var(--muted-foreground)] mb-2">
          {lang === 'zh' ? '请选择对应的英文单词' : 'Select the matching English word'}
        </p>
        <p className="text-2xl font-bold text-[var(--foreground)]">{question.chineseMeaning}</p>
      </div>

      {/* Options — 2x2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {shuffledOptions.map((opt) => {
          const isChecked = selected === opt;
          const isCorrectOpt = opt.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
          let style = 'border-[var(--border)] hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer';
          if (submitted) {
            if (isCorrectOpt) style = 'border-emerald-500 bg-emerald-50 text-emerald-700';
            else if (opt === selected) style = 'border-red-400 bg-red-50 text-red-700';
            else style = 'border-[var(--border)] opacity-50';
          } else if (isChecked) {
            style = 'border-[var(--primary)] bg-violet-50 text-[var(--primary)]';
          }

          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelect(opt)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(opt);
                }
              }}
              role="radio"
              aria-checked={isChecked}
              aria-label={`${opt}${isChecked ? (lang === 'zh' ? '（已选中）' : ' — selected') : ''}`}
              disabled={submitted}
              className={cn(
                'w-full text-left rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-200',
                style,
                submitted && 'cursor-default'
              )}
            >
              {celebrate && isCorrectOpt && <span className="mr-1">✅</span>}
              {opt}
            </button>
          );
        })}
      </div>

      {/* Correct answer reveal */}
      {submitted && !celebrate && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
          <span className="font-semibold">💡 {lang === 'zh' ? '正确答案：' : 'Correct answer: '}</span>
          <span className="font-bold">{question.correctAnswer}</span>
        </div>
      )}

      {/* Submit button */}
      {!submitted ? (
        <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!selected}>
          {lang === 'zh' ? '确认答案' : 'Confirm Answer'} →
        </Button>
      ) : (
        <div className="text-center text-sm text-[var(--muted-foreground)] animate-pulse">
          {lang === 'zh' ? '下一题加载中...' : 'Loading next question...'}
        </div>
      )}
    </div>
  );
}
