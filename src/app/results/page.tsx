'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession } from '@/lib/storage';
import type { PracticeSession } from '@/lib/types';
import { READING_QUESTIONS, LISTENING_QUESTIONS } from '@/lib/questions';
import { formatTime, encodeShareData, getMotivationalMessage } from '@/lib/utils';
import ScoreRadar from '@/components/ScoreRadar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      const s = getSession(id);
      setSession(s);
    }
  }, [searchParams]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl">😅</div>
          <p className="text-lg font-semibold">
            {lang === 'zh' ? '找不到练习记录' : 'Session not found'}
          </p>
          <Button onClick={() => router.push('/practice')}>
            {lang === 'zh' ? '开始新练习' : 'Start New Practice'}
          </Button>
        </div>
      </div>
    );
  }

  const { score, timeUsed, achievements } = session;
  const message = getMotivationalMessage(score.total, lang);

  // Build incorrect questions list based on session type
  const allQuestions = session.type === 'combined'
    ? [...READING_QUESTIONS, ...LISTENING_QUESTIONS]
    : session.type === 'reading'
    ? READING_QUESTIONS
    : LISTENING_QUESTIONS;

  const incorrectQuestions = session.type === 'combined' || session.type === 'reading' || session.type === 'listening'
    ? allQuestions.filter(q => {
        const ans = session.answers?.[q.id];
        return !ans || ans.toLowerCase().trim() !== q.correctAnswer.toLowerCase().trim();
      })
    : []; // vocabulary/speaking/writing sessions don't have traditional Q&A

  const shareData = {
    reading: score.reading,
    listening: score.listening,
    total: score.total,
    accuracy: score.accuracy,
    timeUsed,
    sessionId: session.id,
    type: session.type,
  };
  const shareLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${encodeShareData(shareData)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-3 animate-fade-in-up">
          <div className="text-5xl">{score.total >= 7.0 ? '🌟' : score.total >= 6.5 ? '🎉' : '💪'}</div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)]">
            {lang === 'zh' ? '练习完成！' : 'Practice Complete!'}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {session.type === 'combined' ? '📚 ' : session.type === 'vocabulary' ? '📝 ' : session.type === 'speaking' ? '🎤 ' : session.type === 'writing' ? '✍️ ' : ''}
            {lang === 'zh'
              ? (session.type === 'combined' ? '阅读+听力综合练习' : session.type === 'vocabulary' ? '词汇练习' : session.type === 'speaking' ? '口语练习' : session.type === 'writing' ? '写作练习' : '')
              : (session.type === 'combined' ? 'Reading + Listening' : session.type === 'vocabulary' ? 'Vocabulary Practice' : session.type === 'speaking' ? 'Speaking Practice' : session.type === 'writing' ? 'Writing Practice' : '')}
          </p>
          <p className="text-[var(--muted-foreground)]">{message}</p>
        </div>

        {/* Total score */}
        <Card className="text-center animate-fade-in-up border-2 border-[var(--primary)]">
          <CardContent className="pt-6">
            <div className="text-6xl font-extrabold text-[var(--primary)]">{score.total.toFixed(1)}</div>
            <div className="text-sm text-[var(--muted-foreground)] mb-3">
              {lang === 'zh' ? '预估综合分数' : 'Estimated Overall Band'}
            </div>
            <div className="flex justify-center gap-4 text-sm">
              <span>✅ {score.accuracy.toFixed(0)}% {lang === 'zh' ? '正确率' : 'accuracy'}</span>
              <span>⏱ {formatTime(timeUsed)} {lang === 'zh' ? '用时' : 'time'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-base">
              📊 {lang === 'zh' ? '四项技能分数雷达图' : 'Four Skills Radar Chart'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreRadar
              reading={Math.max(score.reading, 0.1)}
              listening={Math.max(score.listening, 0.1)}
              writing={Math.max(score.estimatedWriting, 0.1)}
              speaking={Math.max(score.estimatedSpeaking, 0.1)}
            />
            <div className="grid grid-cols-2 gap-3 mt-4">
              {(() => {
                const isCombined = session.type === 'combined';
                const isSpeaking = session.type === 'speaking';
                const isWriting = session.type === 'writing';
                return [
                  { label: 'Reading', score: score.reading, actual: isCombined },
                  { label: 'Listening', score: score.listening, actual: isCombined },
                  { label: 'Writing', score: score.estimatedWriting, actual: isWriting || isCombined },
                  { label: 'Speaking', score: score.estimatedSpeaking, actual: isSpeaking || isCombined },
                ];
              })().map(item => (
                <div key={item.label} className="flex items-center justify-between rounded-xl bg-[var(--muted)] px-3 py-2">
                  <span className="text-sm font-medium">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    {item.score > 0 ? (
                      <>
                        <span className="font-bold text-[var(--primary)]">{item.score.toFixed(1)}</span>
                        {!item.actual && (
                          <Badge variant="outline" className="text-xs py-0">est.</Badge>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        {achievements.length > 0 && (
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-base">
                🏆 {lang === 'zh' ? '本次获得的成就' : 'Achievements Unlocked'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {achievements.map(ach => (
                <div key={ach.id} className="flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2">
                  <span className="text-2xl">{ach.emoji}</span>
                  <div>
                    <div className="font-semibold text-sm">{ach.title}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{ach.description}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Wrong answers review */}
        {incorrectQuestions.length > 0 && (
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-base">
                🔍 {lang === 'zh' ? '错题回顾' : 'Review Mistakes'}
                <Badge variant="warning" className="ml-2">{incorrectQuestions.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {incorrectQuestions.map((q, i) => (
                <div key={q.id} className="rounded-xl border border-red-100 bg-red-50 p-4 space-y-2">
                  <div className="text-sm font-medium">Q{i + 1}. {q.questionText}</div>
                  <div className="text-xs space-y-1">
                    <div className="text-red-600">
                      ❌ {lang === 'zh' ? '你的答案：' : 'Your answer: '}{session.answers?.[q.id] || (lang === 'zh' ? '未作答' : 'No answer')}
                    </div>
                    <div className="text-emerald-700">
                      ✅ {lang === 'zh' ? '正确答案：' : 'Correct: '}{q.correctAnswer}
                    </div>
                    <div className="text-[var(--muted-foreground)]">💡 {q.explanation}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Share */}
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-base">
              🔗 {lang === 'zh' ? '分享给同学' : 'Share with Classmates'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl bg-[var(--muted)] px-4 py-3 text-sm font-mono break-all text-[var(--muted-foreground)]">
              {shareLink.substring(0, 60)}...
            </div>
            <Button className="w-full" onClick={handleCopy} variant={copied ? 'success' : 'default'}>
              {copied ? '✅ ' : '📋 '}
              {copied
                ? (lang === 'zh' ? '链接已复制！' : 'Copied!')
                : (lang === 'zh' ? '复制分享链接' : 'Copy Share Link')}
            </Button>
          </CardContent>
        </Card>

        {/* CTA Buttons */}
        <div className="flex gap-3 pb-8">
          <Button variant="outline" className="flex-1" onClick={() => router.push('/')}>
            {lang === 'zh' ? '🏠 返回首页' : '🏠 Home'}
          </Button>
          <Button className="flex-1" size="lg" onClick={() => router.push('/practice')}>
            {lang === 'zh' ? '🔁 再练一次' : '🔁 Practice Again'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-2xl animate-bounce">📊</div></div>}>
      <ResultsContent />
    </Suspense>
  );
}
