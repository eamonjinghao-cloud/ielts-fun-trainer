'use client';

import { useState, useEffect, useRef } from 'react';
import type { Question } from '@/lib/types';
import { cn } from '@/lib/utils';
import { speakFeedback } from '@/lib/audio';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ListeningQuestionProps {
  question: Question;
  questionNumber: number;
  total: number;
  onAnswer: (answer: string) => void;
  lang: 'zh' | 'en';
}

export default function ListeningQuestion({
  question, questionNumber, total, onAnswer, lang
}: ListeningQuestionProps) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setAnswer('');
    setSubmitted(false);
    setIsPlaying(false);
    setCelebrate(false);
    setPlayCount(0);
    return () => {
      window.speechSynthesis?.cancel();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [question.id]);

  // Keyboard shortcut: Enter to submit
  useEffect(() => {
    if (submitted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && answer.trim()) {
        handleSubmit();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitted, answer]); // eslint-disable-line react-hooks/exhaustive-deps

  const playAudio = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question.audioPrompt);
    utterance.rate = 0.9;
    utterance.lang = 'en-US';
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => { setIsPlaying(false); setPlayCount(c => c + 1); };
    utterance.onerror = () => setIsPlaying(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmit = () => {
    if (!answer.trim()) return;
    setSubmitted(true);
    const isCorrect = answer.trim().toLowerCase() === question.correctAnswer.toLowerCase();
    if (isCorrect) setCelebrate(true);
    
    speakFeedback(isCorrect, lang);
    
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onAnswer(answer.trim().toLowerCase());
    }, 1500);
  };

  const isCorrect = answer.trim().toLowerCase() === question.correctAnswer.toLowerCase();

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary">
          {lang === 'zh' ? '听力填空' : 'Listening'} {questionNumber}/{total}
        </Badge>
        <Badge variant="outline">Band {question.bandLevel}</Badge>
      </div>

      {/* Audio play area */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 p-6 text-center">
        <button
          onClick={playAudio}
          disabled={isPlaying}
          aria-label={isPlaying
            ? (lang === 'zh' ? '正在播放...' : 'Playing...')
            : (lang === 'zh' ? '点击播放听力音频' : 'Click to play audio')}
          className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center mx-auto text-4xl shadow-lg transition-all duration-200',
            isPlaying
              ? 'bg-violet-300 scale-95 cursor-not-allowed'
              : 'bg-[var(--primary)] hover:bg-violet-700 active:scale-95 cursor-pointer'
          )}
        >
          {isPlaying ? '⏸' : '▶️'}
        </button>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          {isPlaying
            ? (lang === 'zh' ? '正在播放...' : 'Playing...')
            : playCount === 0
            ? (lang === 'zh' ? '点击播放听力音频' : 'Click to play audio')
            : (lang === 'zh' ? `已播放 ${playCount} 次（可重听）` : `Played ${playCount} time(s) — replay allowed`)}
        </p>
      </div>

      {/* Question */}
      <div className="font-semibold text-base">
        {celebrate && <span className="mr-2">🎉</span>}
        {question.questionText}
      </div>

      {/* Multiple-choice options */}
      {question.options && question.options.length > 0 ? (
        <>
          <div className="space-y-2">
            {question.options.map((opt) => {
              const letter = opt[0];
              const isSelected = answer === letter;
              const isCorrectOpt = question.correctAnswer === letter;
              let style = 'border-[var(--border)] hover:border-violet-300 hover:bg-violet-50 cursor-pointer';
              if (submitted) {
                if (isCorrectOpt) style = 'border-emerald-500 bg-emerald-50 text-emerald-700';
                else if (isSelected) style = 'border-red-400 bg-red-50 text-red-700';
                else style = 'border-[var(--border)] opacity-50';
              } else if (isSelected) {
                style = 'border-[var(--primary)] bg-violet-50 text-[var(--primary)]';
              }
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { if (!submitted) setAnswer(letter); }}
                  disabled={submitted}
                  className={`w-full text-left rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200 ${style} ${submitted ? 'cursor-default' : ''}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {submitted && !isCorrect && (
            <p className="text-sm text-emerald-600">
              ✅ {lang === 'zh' ? '正确答案：' : 'Correct answer: '}
              <span className="font-bold">{question.options.find(o => o[0] === question.correctAnswer)}</span>
            </p>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !submitted && handleSubmit()}
            disabled={submitted}
            placeholder={lang === 'zh' ? '输入你的答案...' : 'Type your answer...'}
            aria-label={lang === 'zh' ? '输入答案' : 'Enter your answer'}
            className={cn(
              'w-full rounded-xl border-2 px-4 py-3 text-base outline-none transition-all duration-200',
              submitted
                ? isCorrect
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-red-400 bg-red-50 text-red-700'
                : 'border-[var(--border)] focus:border-[var(--primary)] bg-white'
            )}
          />
          {submitted && !isCorrect && (
            <p className="text-sm text-emerald-600">
              ✅ {lang === 'zh' ? '正确答案：' : 'Correct answer: '}
              <span className="font-bold">{question.correctAnswer}</span>
            </p>
          )}
        </div>
      )}

      {/* Feedback message */}
      {submitted && (
        <div className={cn(
          'rounded-xl border p-4 text-sm font-medium text-center',
          isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
        )}>
          {isCorrect
            ? (lang === 'zh'
              ? (['🎯 精准命中！', '✅ 完全正确！', '👏 听力满分感！', '🌟 耳朵真灵！', '💪 一击即中！'][Math.floor(Math.random() * 5)])
              : (['🎯 Bullseye!', '✅ Nailed it!', '👏 Sharp ears!', '🌟 Perfect listening!', '💪 Spot on!'][Math.floor(Math.random() * 5)]))
            : (lang === 'zh'
              ? (['🤔 再听一遍试试？', '💡 没关系，记住正确答案！', '📝 别灰心，下次一定对！', '🔍 注意关键词！', '🌱 错误是成长的一部分！'][Math.floor(Math.random() * 5)])
              : (['🤔 Try listening again!', '💡 No worries, learn from it!', '📝 You will get it next time!', '🔍 Listen for keywords!', '🌱 Mistakes help you grow!'][Math.floor(Math.random() * 5)]))}
        </div>
      )}

      {/* Explanation after submit */}
      {submitted && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
          <span className="font-semibold">💡 {lang === 'zh' ? '解析：' : 'Explanation: '}</span>
          {question.explanation}
        </div>
      )}

      {/* Submit button */}
      {!submitted ? (
        <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!answer.trim()}>
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
