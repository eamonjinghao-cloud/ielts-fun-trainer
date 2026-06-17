'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { VOCABULARY_QUESTIONS } from '@/lib/questions';
import { ACHIEVEMENTS, type Achievement, type PracticeSession, type VocabularyQuestion as VQType } from '@/lib/types';
import { accuracyToBand, generateId } from '@/lib/utils';
import { cn, formatTime } from '@/lib/utils';
import { saveSession, getSettings, saveSettings } from '@/lib/storage';
import { getVocabProgress, saveVocabProgress, getQuizSet } from '@/lib/storage';
import VocabularyQuestion from '@/components/VocabularyQuestion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import AchievementToast from '@/components/AchievementToast';

const QUIZ_COUNT = 15; // Questions per round (~15 minutes)
type Phase = 'intro' | 'practice' | 'submitting';

interface RoundResult {
  selected: string;
  correct: boolean;
}

export default function VocabPracticePage() {
  const router = useRouter();
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [phase, setPhase] = useState<Phase>('intro');
  const [qIdx, setQIdx] = useState(0);
  const [questions, setQuestions] = useState<VQType[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [, setAnsweredCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(QUIZ_COUNT * 60);
  const [paused, setPaused] = useState(false);
  const [sessionStartTime] = useState(Date.now());
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

  // Vocab progress
  const [progress, setProgress] = useState(getVocabProgress());

  // Total question count
  const totalVocabCount = useMemo(() => VOCABULARY_QUESTIONS.length, []);

  // Word difficulty stats for results
  const weakWords = useMemo(() => {
    return Object.entries(progress.stats)
      .filter(([, s]) => s.wrong > s.correct)
      .slice(0, 10);
  }, [progress.stats]);

  // Load language setting
  useEffect(() => {
    const settings = getSettings();
    setLang(settings.language);
  }, []);

  // Load quiz when entering intro phase
  useEffect(() => {
    if (phase === 'intro') {
      const quiz = getQuizSet(VOCABULARY_QUESTIONS, QUIZ_COUNT, progress.completedIds);
      setQuestions(quiz);
      setSecondsLeft(quiz.length * 60);
    }
  }, [phase, progress.cycle, progress.completedIds.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer
  useEffect(() => {
    if (phase !== 'practice' || paused) return;
    const id = setInterval(() => {
      setSecondsLeft(s => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, paused]);

  // Auto-finish when timer hits 0
  useEffect(() => {
    if (secondsLeft === 0 && phase === 'practice') {
      handleFinish();
    }
  }, [secondsLeft, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track answers for results
  const [roundResults, setRoundResults] = useState<Record<string, RoundResult>>({});

  // Shuffle answers for current round
  const handleAnswer = (selected: string) => {
    const q = questions[qIdx];
    if (!q) return;
    const isCorrect = selected.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
    if (isCorrect) setCorrectCount(prev => prev + 1);
    setAnsweredCount(prev => prev + 1);
    setRoundResults(prev => ({
      ...prev,
      [q.id]: { selected, correct: isCorrect }
    }));

    if (qIdx < questions.length - 1) {
      setQIdx(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = useCallback(() => {
    setPhase('submitting');
  }, []);

  // Save vocab progress and session
  useEffect(() => {
    if (phase !== 'submitting' || questions.length === 0) return;

    const accuracy = (correctCount / questions.length) * 100;
    const vocabBand = accuracyToBand(accuracy, 'reading');
    const vocabDuration = Math.round((Date.now() - sessionStartTime) / 1000);

    // Update vocab progress: mark questions as completed
    const newCompletedIds = [...progress.completedIds];
    const newStats = { ...progress.stats };

    Object.entries(roundResults).forEach(([qid, result]) => {
      if (!newCompletedIds.includes(qid)) {
        newCompletedIds.push(qid);
      }
      if (!newStats[qid]) {
        newStats[qid] = { correct: 0, wrong: 0 };
      }
      if (result.correct) {
        newStats[qid].correct += 1;
      } else {
        newStats[qid].wrong += 1;
      }
    });

    // Cycle tracking: if all questions done, increment cycle
    let newCycle = progress.cycle;
    if (newCompletedIds.length >= totalVocabCount) {
      newCompletedIds.length = 0; // Reset for new cycle
      newCycle += 1;
    }

    saveVocabProgress({
      completedIds: newCompletedIds,
      stats: newStats,
      cycle: newCycle,
    });

    setProgress({ completedIds: newCompletedIds, stats: newStats, cycle: newCycle });

    // Achievement check
    const settings = getSettings();
    const allAcc = settings.achievements;
    const unlocked: Achievement[] = [];

    if (!allAcc.includes('first_session')) unlocked.push(ACHIEVEMENTS.find(a => a.id === 'first_session')!);
    if (accuracy === 100 && !allAcc.includes('perfect_score')) unlocked.push(ACHIEVEMENTS.find(a => a.id === 'perfect_score')!);
    if (vocabDuration < 300 && !allAcc.includes('speed_demon')) unlocked.push(ACHIEVEMENTS.find(a => a.id === 'speed_demon')!);
    if (vocabBand >= 7.0 && !allAcc.includes('band_7')) unlocked.push(ACHIEVEMENTS.find(a => a.id === 'band_7')!);
    if (vocabBand >= 6.5 && !allAcc.includes('target_reached')) unlocked.push(ACHIEVEMENTS.find(a => a.id === 'target_reached')!);

    if (settings.totalSessions + 1 >= 5 && !allAcc.includes('five_sessions')) {
      unlocked.push(ACHIEVEMENTS.find(a => a.id === 'five_sessions')!);
    }

    const newIds = unlocked.map(a => a.id);
    saveSettings({ ...settings, achievements: [...allAcc, ...newIds], totalSessions: settings.totalSessions + 1 });
    setNewAchievements(unlocked);

    const session: PracticeSession = {
      id: generateId(),
      createdAt: Date.now(),
      type: 'vocabulary',
      vocabularyQuestions: questions,
      timeUsed: vocabDuration,
      score: {
        vocabulary: vocabBand,
        estimatedWriting: vocabBand,
        estimatedSpeaking: vocabBand,
        total: vocabBand,
        accuracy: parseFloat(accuracy.toFixed(1)),
        reading: 0,
        listening: 0,
      },
      achievements: unlocked,
    };

    saveSession(session);

    setTimeout(() => {
      router.push(`/results?id=${session.id}`);
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === 'intro') {
    const doneCount = progress.completedIds.length;
    const percent = Math.round((doneCount / totalVocabCount) * 100);
    const timeEstimate = questions.length; // questions length = QUIZ_COUNT

    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #f8f7ff, #ede9fe)' }}>
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl animate-float">📝</div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)]">
            {lang === 'zh' ? '词汇练习' : 'Vocabulary Practice'}
          </h1>
          <div className="rounded-2xl bg-white border border-[var(--border)] p-6 text-left space-y-4 shadow-sm">
            {/* Progress display */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">{lang === 'zh' ? '总体进度' : 'Overall Progress'}</span>
                <span className="text-sm text-[var(--muted-foreground)]">{doneCount}/{totalVocabCount} ({percent}%)</span>
              </div>
              <Progress value={percent} className="h-2" />
            </div>
            {/* Cycle info */}
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">{lang === 'zh' ? '当前轮次' : 'Current Round'}</span>
              <span className="font-medium">第 {progress.cycle} 轮</span>
            </div>
            {/* Quiz info */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">{lang === 'zh' ? '本次题数' : 'Questions This Round'}</span>
                <span className="font-medium">{timeEstimate} {lang === 'zh' ? '题' : 'q'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">{lang === 'zh' ? '预计用时' : 'Estimated Time'}</span>
                <span className="font-medium">{timeEstimate} {lang === 'zh' ? '分钟' : 'min'}</span>
              </div>
            </div>
            {weakWords.length > 0 && (
              <div className="text-xs text-amber-600">
                ⚠️ {lang === 'zh' ? '发现薄弱词汇：建议重点复习以下词汇' : 'Weak words detected: Review these words'}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => router.push('/')}>
              {lang === 'zh' ? '← 返回' : '← Back'}
            </Button>
            <Button className="flex-[2]" size="lg" onClick={() => { setPhase('practice'); setQIdx(0); setCorrectCount(0); setAnsweredCount(0); setRoundResults({}); }}>
              {lang === 'zh' ? '🚀 开始练习' : '🚀 Start'}
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
          {lang === 'zh' ? '练习完成！正在计算成绩...' : 'Practice Complete! Calculating scores...'}
        </h2>
        <AchievementToast achievements={newAchievements} />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-[var(--muted-foreground)] animate-pulse">
          {lang === 'zh' ? '加载词汇题库中...' : 'Loading vocabulary questions...'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Timer bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[var(--border)] px-4 py-3 shadow-sm">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--muted-foreground)]">
              📝 {lang === 'zh' ? '词汇题' : 'Vocabulary'} {qIdx + 1}/{questions.length}
            </span>
            <div className="flex items-center gap-3">
              <span className={cn(
                'font-bold text-lg tabular-nums',
                secondsLeft < 60 ? 'text-red-500' : secondsLeft < 120 ? 'text-orange-500' : 'text-[var(--primary)]'
              )}>
                ⏱ {formatTime(secondsLeft)}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setPaused(p => !p)}>
                {paused ? '▶️ ' : '⏸ '}{paused
                  ? (lang === 'zh' ? '继续' : 'Resume')
                  : (lang === 'zh' ? '暂停' : 'Pause')}
              </Button>
            </div>
          </div>
          <div className="h-1.5 bg-gray-100 rounded overflow-hidden">
            <div
              className="h-full bg-[var(--primary)] transition-all duration-300 rounded"
              style={{ width: `${((qIdx + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {paused ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⏸</div>
            <p className="text-lg font-semibold text-[var(--muted-foreground)]">
              {lang === 'zh' ? '已暂停，点击继续恢复练习' : 'Paused — click Resume to continue'}
            </p>
          </div>
        ) : (
          <VocabularyQuestion
            key={questions[qIdx].id}
            question={questions[qIdx]}
            questionNumber={qIdx + 1}
            total={questions.length}
            onAnswer={handleAnswer}
            lang={lang}
          />
        )}
      </div>
    </div>
  );
}
