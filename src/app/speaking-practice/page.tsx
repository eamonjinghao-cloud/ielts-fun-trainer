'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SPEAKING_QUESTIONS } from '@/lib/questions';
import { ACHIEVEMENTS, type Achievement, type PracticeSession } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { saveSession, getSettings, saveSettings } from '@/lib/storage';
import SpeakingQuestion from '@/components/SpeakingQuestion';
import { Button } from '@/components/ui/button';
import AchievementToast from '@/components/AchievementToast';

type Phase = 'intro' | 'practice' | 'submitting';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function SpeakingPracticePage() {
  const router = useRouter();
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [phase, setPhase] = useState<Phase>('intro');
  const [qIdx, setQIdx] = useState(0);
  const [questions, setQuestions] = useState(SPEAKING_QUESTIONS);
  const [totalCheckpointsChecked, setTotalCheckpointsChecked] = useState(0);
  const [totalCheckpointsPossible, setTotalCheckpointsPossible] = useState(0);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [sessionStartTime] = useState(Date.now());

  useEffect(() => {
    const settings = getSettings();
    setLang(settings.language);
    setQuestions(shuffle(SPEAKING_QUESTIONS));
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleQuestionDone = (checkedIndices: number[], _speechTime: number) => {
    setTotalCheckpointsChecked(prev => prev + checkedIndices.length);
    setTotalCheckpointsPossible(prev => prev + questions[qIdx].checklist.length);

    if (qIdx < questions.length - 1) {
      setQIdx(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = useCallback(() => {
    setPhase('submitting');
  }, []);

  // Save session when submitting
  useEffect(() => {
    if (phase !== 'submitting' || questions.length === 0) return;

    const practiceDuration = Math.round((Date.now() - sessionStartTime) / 1000);

    // Simple band estimation based on checkpoint completion
    const completionRate = totalCheckpointsPossible > 0
      ? totalCheckpointsChecked / totalCheckpointsPossible
      : 0;
    let speakingBand = 4.0;
    if (completionRate >= 0.3) speakingBand = 5.0;
    if (completionRate >= 0.5) speakingBand = 5.5;
    if (completionRate >= 0.7) speakingBand = 6.0;
    if (completionRate >= 0.875) speakingBand = 6.5;
    if (completionRate >= 0.95) speakingBand = 7.0;
    speakingBand = parseFloat(speakingBand.toFixed(1));

    const settings = getSettings();
    const allAcc = settings.achievements;
    const unlocked: Achievement[] = [];

    if (!allAcc.includes('first_session')) unlocked.push(ACHIEVEMENTS.find(a => a.id === 'first_session')!);
    if (completionRate >= 0.9 && !allAcc.includes('perfect_score')) unlocked.push(ACHIEVEMENTS.find(a => a.id === 'perfect_score')!);
    if (speakingBand >= 7.0 && !allAcc.includes('band_7')) unlocked.push(ACHIEVEMENTS.find(a => a.id === 'band_7')!);
    if (speakingBand >= 6.5 && !allAcc.includes('target_reached')) unlocked.push(ACHIEVEMENTS.find(a => a.id === 'target_reached')!);
    if (settings.totalSessions + 1 >= 5 && !allAcc.includes('five_sessions')) {
      unlocked.push(ACHIEVEMENTS.find(a => a.id === 'five_sessions')!);
    }

    const newIds = unlocked.map(a => a.id);
    saveSettings({ ...settings, achievements: [...allAcc, ...newIds], totalSessions: settings.totalSessions + 1 });
    setNewAchievements(unlocked);

    const session: PracticeSession = {
      id: generateId(),
      createdAt: Date.now(),
      type: 'speaking',
      speakingQuestions: questions,
      timeUsed: practiceDuration,
      score: {
        estimatedSpeaking: speakingBand,
        estimatedWriting: speakingBand,
        total: speakingBand,
        accuracy: parseFloat((completionRate * 100).toFixed(1)),
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
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #f8f7ff, #ede9fe)' }}>
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl animate-float">🎤</div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)]">
            {lang === 'zh' ? '口语练习' : 'Speaking Practice'}
          </h1>
          <div className="rounded-2xl bg-white border border-[var(--border)] p-6 text-left space-y-3 shadow-sm">
            <div className="text-sm">
              <div className="font-semibold">{lang === 'zh' ? '练习说明' : 'How It Works'}</div>
              <div className="text-[var(--muted-foreground)] mt-1">
                {lang === 'zh'
                  ? '展示口语话题和提示要点，你可以使用语音识别功能录音，也可以通过勾选 checklist 标记已完成的要点。每道题有独立的限时。'
                  : 'You will see speaking topics with prompts. You can use voice recognition to record your answers, or check off the key points you have covered. Each question has its own time limit.'}
              </div>
            </div>
            <div className="text-sm text-[var(--muted-foreground)]">
              {lang === 'zh'
                ? `📋 ${questions.length} 道口语题 · 每题 90-180 秒`
                : `📋 ${questions.length} questions · 90-180 seconds each`}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => router.push('/')}>
              {lang === 'zh' ? '← 返回' : '← Back'}
            </Button>
            <Button className="flex-2 flex-grow" size="lg" onClick={() => setPhase('practice')}>
              {lang === 'zh' ? '🎙️ 开始练习' : '🎙️ Start'}
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
          {lang === 'zh' ? '口语练习完成！正在计算成绩...' : 'Speaking Complete! Calculating scores...'}
        </h2>
        <AchievementToast achievements={newAchievements} />
      </div>
    );
  }

  if (questions.length === 0) return null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[var(--border)] px-4 py-3 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--muted-foreground)]">
            🎤 {lang === 'zh' ? '口语练习' : 'Speaking'} {qIdx + 1}/{questions.length}
          </span>
          <span className="text-sm font-medium">
            {totalCheckpointsChecked}/{totalCheckpointsPossible} {lang === 'zh' ? '已勾选' : 'checked'}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <SpeakingQuestion
          key={questions[qIdx].id}
          question={questions[qIdx]}
          questionIndex={qIdx}
          total={questions.length}
          onFinish={handleQuestionDone}
          lang={lang}
        />
      </div>
    </div>
  );
}
