'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SpeakingQuestion as SpeakingQuestionType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SpeakingQuestionProps {
  question: SpeakingQuestionType;
  questionIndex: number;
  total: number;
  onFinish: (checkedIndices: number[], speechTime: number) => void;
  lang: 'zh' | 'en';
}

export default function SpeakingQuestion({
  question, questionIndex, total, onFinish, lang
}: SpeakingQuestionProps) {
  const [recording, setRecording] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(question.durationSeconds);
  const [checklist, setChecklist] = useState<boolean[]>(new Array(question.checklist.length).fill(false));
  const [finished, setFinished] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const speechStartTimeRef = useRef<number>(0);
  const speechDurationRef = useRef<number>(0);

  // Detect SpeechRecognition API
  const hasSpeechAPI = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );

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
    setRecording(false);
    setSecondsLeft(question.durationSeconds);
    setChecklist(new Array(question.checklist.length).fill(false));
    setFinished(false);
    speechDurationRef.current = 0;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, [question.id, question.durationSeconds, question.checklist.length]);

  const toggleChecklist = (idx: number) => {
    if (finished) return;
    setChecklist(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const startRecording = useCallback(() => {
    if (!hasSpeechAPI) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setRecording(true);
      speechStartTimeRef.current = Date.now();
    };
    recognition.onend = () => {
      setRecording(false);
      speechDurationRef.current += (Date.now() - speechStartTimeRef.current) / 1000;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      setRecording(false);
      const errMsg = event?.error === 'not-allowed'
        ? (lang === 'zh' ? '🎤 麦克风权限未授权，请在浏览器设置中允许麦克风访问' : '🎤 Microphone permission denied. Allow mic access in browser settings.')
        : event?.error === 'no-speech'
        ? (lang === 'zh' ? '🎤 未检测到语音，请再试一次' : '🎤 No speech detected, try again.')
        : (lang === 'zh' ? '🎤 录音出错，请重试或使用 Checklist 练习' : '🎤 Recording error. Use checklist instead.');
      setMicError(errMsg);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // already started or not supported
    }
  }, [hasSpeechAPI]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setRecording(false);
  }, []);

  const handleAutoFinish = () => {
    if (finished) return;
    setFinished(true);
    stopRecording();
    const checkedIndices = checklist.reduce<number[]>((acc, checked, idx) => {
      if (checked) acc.push(idx);
      return acc;
    }, []);
    const speechTime = speechDurationRef.current || question.durationSeconds;
    setTimeout(() => {
      onFinish(checkedIndices, speechTime);
    }, 1000);
  };

  const handleManualFinish = () => {
    if (finished) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    handleAutoFinish();
  };

  const checkedCount = checklist.filter(Boolean).length;
  const timePercent = (secondsLeft / question.durationSeconds) * 100;

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary">
          🎤 {lang === 'zh' ? '口语练习' : 'Speaking'} {questionIndex + 1}/{total}
        </Badge>
        <Badge variant="outline">
          ⏱ {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')}
        </Badge>
      </div>

      {/* Timer bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-1000 rounded-full',
            secondsLeft < 30 ? 'bg-red-500' : secondsLeft < 60 ? 'bg-orange-400' : 'bg-[var(--primary)]'
          )}
          style={{ width: `${timePercent}%` }}
        />
      </div>

      {/* Topic */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-6 space-y-3">
        <h2 className="text-xl font-bold text-[var(--foreground)]">{question.topic}</h2>
        <p className="text-sm text-[var(--muted-foreground)] whitespace-pre-line">{question.prompt}</p>
      </div>

      {/* Speech recognition controls */}
      {hasSpeechAPI && (
        <div className="flex items-center justify-center gap-4">
          {!recording ? (
            <Button
              onClick={startRecording}
              disabled={finished}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-lg"
              size="lg"
            >
              🎙️ {lang === 'zh' ? '开始录音' : 'Start Recording'}
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              variant="outline"
              className="px-6 py-3 rounded-full shadow-lg border-red-400 text-red-600 hover:bg-red-50"
              size="lg"
            >
              ⏹ {lang === 'zh' ? '停止录音' : 'Stop Recording'}
            </Button>
          )}
          {recording && (
            <span className="text-sm text-red-500 animate-pulse font-medium">
              🔴 {lang === 'zh' ? '录音中...' : 'Recording...'}
            </span>
          )}
        </div>
      )}

      {!hasSpeechAPI && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 text-center">
          {lang === 'zh'
            ? '⚠️ 你的浏览器不支持语音识别，请手动勾选已完成的要点'
            : '⚠️ Your browser does not support speech recognition. Please check off points manually.'}
        </div>
      )}

      {micError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 text-center">
          {micError}
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-[var(--muted-foreground)]">
          ✅ {lang === 'zh' ? '要点检查清单' : 'Key Points Checklist'} ({checkedCount}/{question.checklist.length})
        </h3>
        {question.checklist.map((point, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => toggleChecklist(idx)}
            disabled={finished}
            className={cn(
              'w-full text-left rounded-xl border-2 px-4 py-3 text-sm transition-all duration-200',
              checklist[idx]
                ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                : 'border-[var(--border)] hover:border-blue-300 hover:bg-blue-50 cursor-pointer',
              finished && 'cursor-default opacity-75'
            )}
          >
            <span className="mr-2">{checklist[idx] ? '☑️' : '⬜'}</span>
            {point}
          </button>
        ))}
      </div>

      {/* Finish button */}
      {!finished ? (
        <Button className="w-full" size="lg" onClick={handleManualFinish}>
          {lang === 'zh' ? '完成此题 →' : 'Finish This Question →'}
        </Button>
      ) : (
        <div className="text-center text-sm text-[var(--muted-foreground)] animate-pulse">
          {lang === 'zh' ? '正在保存...' : 'Saving...'}
        </div>
      )}
    </div>
  );
}
