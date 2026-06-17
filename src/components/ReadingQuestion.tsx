'use client';

import { useState, useEffect, useRef } from 'react';
import type { Question } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ReadingQuestionProps {
  question: Question;
  questionNumber: number;
  total: number;
  onAnswer: (answer: string) => void;
  lang: 'zh' | 'en';
}

export default function ReadingQuestion({
  question, questionNumber, total, onAnswer, lang
}: ReadingQuestionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when question changes
  useEffect(() => {
    setSelected(null);
    setSubmitted(false);
    setCelebrate(false);
  }, [question.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Keyboard shortcuts: 1/2/3/4 to select options, Enter to submit
  useEffect(() => {
    if (submitted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!question.options) return;
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < question.options.length) {
        handleSelect(question.options[idx]);
        e.preventDefault();
      } else if (e.key === 'Enter' && selected) {
        handleSubmit();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitted, selected, question.options]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (opt: string) => {
    if (submitted) return;
    setSelected(opt[0]); // just the letter "A", "B"...
  };

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
    const isCorrect = selected === question.correctAnswer;
    if (isCorrect) setCelebrate(true);
    // Move to next after 1.5s
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onAnswer(selected);
    }, 1500);
  };

  const getOptionStyle = (opt: string) => {
    const letter = opt[0];
    if (!submitted) {
      return selected === letter
        ? 'border-[var(--primary)] bg-violet-50 text-[var(--primary)]'
        : 'border-[var(--border)] hover:border-violet-300 hover:bg-violet-50 cursor-pointer';
    }
    if (letter === question.correctAnswer) return 'border-emerald-500 bg-emerald-50 text-emerald-700';
    if (letter === selected) return 'border-red-400 bg-red-50 text-red-700';
    return 'border-[var(--border)] opacity-50';
  };

  return (
    <div className="animate-fade-in-up space-y-6" role="radiogroup" aria-label={`${lang === 'zh' ? '阅读理解题' : 'Reading question'} ${questionNumber} of ${total}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary">
          {lang === 'zh' ? '阅读理解' : 'Reading'} {questionNumber}/{total}
        </Badge>
        <Badge variant="outline">Band {question.bandLevel}</Badge>
      </div>

      {/* Passage */}
      {question.passage && (
        <div className="bg-[var(--muted)] rounded-xl p-5 text-sm leading-relaxed text-[var(--foreground)] max-h-48 overflow-y-auto border-l-4 border-[var(--primary)]">
          {question.passage}
        </div>
      )}

      {/* Question */}
      <div className="font-semibold text-base text-[var(--foreground)]">
        {celebrate && <span className="mr-2">🎉</span>}
        {question.questionText}
      </div>

      {/* Options */}
      <div className="space-y-3">
        {question.options?.map((opt) => {
          const letter = opt[0];
          const isChecked = selected === letter;
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
              aria-label={`${letter}. ${opt.slice(2)}${isChecked ? (lang === 'zh' ? '（已选中）' : ' — selected') : ''}`}
              disabled={submitted}
              className={cn(
                'w-full text-left rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200',
                getOptionStyle(opt),
                submitted && 'cursor-default'
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Explanation after submit */}
      {submitted && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
          <span className="font-semibold">💡 {lang === 'zh' ? '解析：' : 'Explanation: '}</span>
          {question.explanation}
        </div>
      )}

      {/* Submit button */}
      {!submitted && (
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={!selected}
        >
          {lang === 'zh' ? '确认答案' : 'Confirm Answer'} →
        </Button>
      )}

      {submitted && (
        <div className="text-center text-sm text-[var(--muted-foreground)] animate-pulse">
          {lang === 'zh' ? '下一题加载中...' : 'Loading next question...'}
        </div>
      )}
    </div>
  );
}
