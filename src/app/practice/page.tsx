'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { READING_QUESTIONS, LISTENING_QUESTIONS } from '@/lib/questions';
import { ACHIEVEMENTS, type Achievement, type PracticeSession } from '@/lib/types';
import { accuracyToBand, generateId, calculateSpeakingWritingEstimate } from '@/lib/utils';
import { saveSession, getSettings, saveSettings } from '@/lib/storage';
import TimerBar from '@/components/TimerBar';
import ReadingQuestion from '@/components/ReadingQuestion';
import ListeningQuestion from '@/components/ListeningQuestion';
import AchievementToast from '@/components/AchievementToast';
import { Button } from '@/components/ui/button';

const READING_TIME = 7 * 60;
const LISTENING_TIME = 8 * 60;
type Phase = 'intro' | 'reading' | 'listening' | 'submitting';

export default function PracticePage() {
  const router = useRouter();
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [phase, setPhase] = useState<Phase>('intro');
  const [readingIdx, setReadingIdx] = useState(0);
  const [listeningIdx, setListeningIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [perQuestionTime, setPerQuestionTime] = useState<Record<string, number>>({});
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [readingSeconds, setReadingSeconds] = useState(READING_TIME);
  const [listeningSeconds, setListeningSeconds] = useState(LISTENING_TIME);
  const [paused, setPaused] = useState(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [sessionStartTime] = useState(Date.now());

  useEffect(() => {
    const s = getSettings();
    setLang(s.language);
  }, []);

  // Timers
  useEffect(() => {
    if (phase !== 'reading' || paused) return;
    const id = setInterval(() => {
      setReadingSeconds(s => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, paused]);

  // Auto-transition when reading timer reaches 0
  useEffect(() => {
    if (readingSeconds === 0 && phase === 'reading') {
      handleFinishReading();
    }
  }, [readingSeconds, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'listening' || paused) return;
    const id = setInterval(() => {
      setListeningSeconds(s => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, paused]);

  // Auto-transition when listening timer reaches 0
  useEffect(() => {
    if (listeningSeconds === 0 && phase === 'listening') {
      handleFinishListening();
    }
  }, [listeningSeconds, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const recordTime = (qId: string) => {
    const elapsed = Math.round((Date.now() - questionStartTime) / 1000);
    setPerQuestionTime(prev => ({ ...prev, [qId]: elapsed }));
    setQuestionStartTime(Date.now());
  };

  const handleReadingAnswer = (answer: string) => {
    const q = READING_QUESTIONS[readingIdx];
    recordTime(q.id);
    setAnswers(prev => ({ ...prev, [q.id]: answer }));
    if (readingIdx < READING_QUESTIONS.length - 1) {
      setReadingIdx(readingIdx + 1);
    } else {
      handleFinishReading();
    }
  };

  const handleFinishReading = useCallback(() => {
    setPhase('listening');
    setQuestionStartTime(Date.now());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFinishListening = useCallback(() => {
    setPhase('submitting');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger finishSession when phase becomes 'submitting'
  useEffect(() => {
    if (phase === 'submitting') {
      finishSession(); // eslint-disable-line react-hooks/exhaustive-deps
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleListeningAnswer = (answer: string) => {
    const q = LISTENING_QUESTIONS[listeningIdx];
    recordTime(q.id);
    setAnswers(prev => ({ ...prev, [q.id]: answer }));
    if (listeningIdx < LISTENING_QUESTIONS.length - 1) {
      setListeningIdx(listeningIdx + 1);
    } else {
      handleFinishListening();
    }
  };

  const finishSession = () => {
    // Calculate scores
    const totalQ = READING_QUESTIONS.length + LISTENING_QUESTIONS.length;
    let correct = 0;
    const latestAnswers = { ...answers };

    READING_QUESTIONS.forEach(q => {
      if (latestAnswers[q.id]?.toLowerCase()?.trim() === q.correctAnswer.toLowerCase().trim()) correct++;
    });
    LISTENING_QUESTIONS.forEach(q => {
      if (latestAnswers[q.id]?.toLowerCase()?.trim() === q.correctAnswer.toLowerCase().trim()) correct++;
    });

    const readingCorrect = READING_QUESTIONS.filter(q =>
      latestAnswers[q.id]?.toLowerCase()?.trim() === q.correctAnswer.toLowerCase().trim()
    ).length;
    const listeningCorrect = LISTENING_QUESTIONS.filter(q =>
      latestAnswers[q.id]?.toLowerCase()?.trim() === q.correctAnswer.toLowerCase().trim()
    ).length;

    const readingAccuracy = (readingCorrect / READING_QUESTIONS.length) * 100;
    const listeningAccuracy = (listeningCorrect / LISTENING_QUESTIONS.length) * 100;
    const overallAccuracy = (correct / totalQ) * 100;

    const readingBand = accuracyToBand(readingAccuracy, 'reading');
    const listeningBand = accuracyToBand(listeningAccuracy, 'listening');
    const estResult = calculateSpeakingWritingEstimate(readingBand, listeningBand);
    const estWriting = estResult.writing;
    const estSpeaking = estResult.speaking;
    const total = parseFloat(((readingBand + listeningBand + estWriting + estSpeaking) / 4).toFixed(1));

    const timeUsed = Math.round((Date.now() - sessionStartTime) / 1000);

    // Determine achievements
    const settings = getSettings();
    const unlocked: Achievement[] = [];
    const all = settings.achievements;

    if (!all.includes('first_session')) {
      unlocked.push(ACHIEVEMENTS.find(a => a.id === 'first_session')!);
    }
    if (overallAccuracy === 100 && !all.includes('perfect_score')) {
      unlocked.push(ACHIEVEMENTS.find(a => a.id === 'perfect_score')!);
    }
    if (timeUsed < 300 && !all.includes('speed_demon')) {
      unlocked.push(ACHIEVEMENTS.find(a => a.id === 'speed_demon')!);
    }
    if (total >= 7.0 && !all.includes('band_7')) {
      unlocked.push(ACHIEVEMENTS.find(a => a.id === 'band_7')!);
    }
    if (total >= 6.5 && !all.includes('target_reached')) {
      unlocked.push(ACHIEVEMENTS.find(a => a.id === 'target_reached')!);
    }

    // Check five_sessions achievement (completed 5 practice sessions)
    if (settings.totalSessions + 1 >= 5 && !all.includes('five_sessions')) {
      unlocked.push(ACHIEVEMENTS.find(a => a.id === 'five_sessions')!);
    }

    if (unlocked.length > 0) {
      const newIds = unlocked.map(a => a.id);
      saveSettings({ ...settings, achievements: [...all, ...newIds], totalSessions: settings.totalSessions + 1 });
      setNewAchievements(unlocked);
    } else {
      saveSettings({ ...settings, totalSessions: settings.totalSessions + 1 });
    }

    const session: PracticeSession = {
      id: generateId(),
      createdAt: Date.now(),
      type: 'combined',
      readingQuestions: READING_QUESTIONS,
      listeningQuestions: LISTENING_QUESTIONS,
      answers: latestAnswers,
      timeUsed,
      perQuestionTime,
      score: {
        reading: readingBand,
        listening: listeningBand,
        estimatedWriting: estWriting,
        estimatedSpeaking: estSpeaking,
        total,
        accuracy: parseFloat(overallAccuracy.toFixed(1)),
      },
      achievements: unlocked,
    };

    saveSession(session);

    // Navigate to results
    setTimeout(() => {
      router.push(`/results?id=${session.id}`);
    }, 1000);
  };

  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #f8f7ff, #ede9fe)' }}>
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl animate-float">📚</div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)]">
            {lang === 'zh' ? '准备好了吗？' : 'Ready to Practice?'}
          </h1>
          <div className="rounded-2xl bg-white border border-[var(--border)] p-6 text-left space-y-3 shadow-sm">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-2xl">📖</span>
              <div>
                <div className="font-semibold">{lang === 'zh' ? '阅读理解 × 5题' : 'Reading × 5 questions'}</div>
                <div className="text-[var(--muted-foreground)]">{lang === 'zh' ? '限时7分钟 · 多选题' : '7 min · Multiple choice'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-2xl">🎧</span>
              <div>
                <div className="font-semibold">{lang === 'zh' ? '听力填空 × 5题' : 'Listening × 5 questions'}</div>
                <div className="text-[var(--muted-foreground)]">{lang === 'zh' ? '限时8分钟 · 填空题' : '8 min · Fill in blanks'}</div>
              </div>
            </div>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {lang === 'zh' ? '💡 建议戴耳机，找个安静的地方作答' : '💡 Headphones recommended for listening'}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => router.push('/')}>
              {lang === 'zh' ? '← 返回' : '← Back'}
            </Button>
            <Button className="flex-[2]" size="lg" onClick={() => { setPhase('reading'); setQuestionStartTime(Date.now()); }}>
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
        <h2 className="text-2xl font-bold">{lang === 'zh' ? '练习完成！正在计算成绩...' : 'Practice Complete! Calculating scores...'}</h2>
        <AchievementToast achievements={newAchievements} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AchievementToast achievements={newAchievements} />

      {phase === 'reading' && (
        <>
          <TimerBar
            seconds={readingSeconds}
            totalSeconds={READING_TIME}
            current={readingIdx + 1}
            total={READING_QUESTIONS.length}
            label={lang === 'zh' ? '阅读题' : 'Reading'}
          />
          <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Controls */}
            <div className="flex justify-end mb-4">
              <Button variant="ghost" size="sm" onClick={() => setPaused(p => !p)}>
                {paused ? '▶️ ' : '⏸ '}{paused ? (lang === 'zh' ? '继续' : 'Resume') : (lang === 'zh' ? '暂停' : 'Pause')}
              </Button>
            </div>
            {paused ? (
              <div className="text-center py-20">
                <div className="text-4xl mb-4">⏸</div>
                <p className="text-lg font-semibold text-[var(--muted-foreground)]">
                  {lang === 'zh' ? '已暂停，点击继续恢复练习' : 'Paused — click Resume to continue'}
                </p>
              </div>
            ) : (
              <ReadingQuestion
                key={READING_QUESTIONS[readingIdx].id}
                question={READING_QUESTIONS[readingIdx]}
                questionNumber={readingIdx + 1}
                total={READING_QUESTIONS.length}
                onAnswer={handleReadingAnswer}
                lang={lang}
              />
            )}
          </div>
        </>
      )}

      {phase === 'listening' && (
        <>
          <TimerBar
            seconds={listeningSeconds}
            totalSeconds={LISTENING_TIME}
            current={listeningIdx + 1}
            total={LISTENING_QUESTIONS.length}
            label={lang === 'zh' ? '听力题' : 'Listening'}
          />
          <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="flex justify-end mb-4">
              <Button variant="ghost" size="sm" onClick={() => setPaused(p => !p)}>
                {paused ? '▶️ ' : '⏸ '}{paused ? (lang === 'zh' ? '继续' : 'Resume') : (lang === 'zh' ? '暂停' : 'Pause')}
              </Button>
            </div>
            {paused ? (
              <div className="text-center py-20">
                <div className="text-4xl mb-4">⏸</div>
                <p className="text-lg font-semibold text-[var(--muted-foreground)]">
                  {lang === 'zh' ? '已暂停，点击继续恢复练习' : 'Paused — click Resume to continue'}
                </p>
              </div>
            ) : (
              <ListeningQuestion
                key={LISTENING_QUESTIONS[listeningIdx].id}
                question={LISTENING_QUESTIONS[listeningIdx]}
                questionNumber={listeningIdx + 1}
                total={LISTENING_QUESTIONS.length}
                onAnswer={handleListeningAnswer}
                lang={lang}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
