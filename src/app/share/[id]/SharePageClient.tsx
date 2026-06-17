'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { decodeShareData, formatTime, calculateSpeakingWritingEstimate } from '@/lib/utils';
import type { ShareData } from '@/lib/types';
import { useLanguage } from '@/hooks/useLanguage';
import ScoreRadar from '@/components/ScoreRadar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SharePageClient({ encodedId }: { encodedId: string }) {
  const router = useRouter();
  const { lang } = useLanguage();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const decoded = decodeShareData(encodedId);
      if (!decoded) throw new Error('invalid');
      setData(decoded);
    } catch {
      setError(true);
    }
  }, [encodedId]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <div className="text-5xl">😕</div>
        <p className="text-lg font-semibold">{lang === 'zh' ? '分享链接无效或已过期' : 'Share link is invalid or expired'}</p>
        <Button onClick={() => router.push('/')}>{lang === 'zh' ? '返回首页' : 'Go Home'}</Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-3xl animate-bounce">📊</div>
      </div>
    );
  }

  const estResult = calculateSpeakingWritingEstimate(data.reading, data.listening);
  const writing = estResult.writing;
  const speaking = estResult.speaking;

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'linear-gradient(135deg, #f8f7ff, #ede9fe)' }}>
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-5xl">{data.total >= 7.0 ? '🌟' : '🎉'}</div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)]">
            {lang === 'zh' ? 'TA的雅思练习成绩' : 'Their IELTS Practice Score'}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {lang === 'zh' ? '来自 IELTS Fun Trainer' : 'From IELTS Fun Trainer'}
          </p>
        </div>

        {/* Total Score */}
        <Card className="text-center border-2 border-[var(--primary)]">
          <CardContent className="pt-6">
            <div className="text-5xl font-extrabold text-[var(--primary)]">{data.total.toFixed(1)}</div>
            <div className="text-sm text-[var(--muted-foreground)] mt-1">
              {lang === 'zh' ? '预估综合 Band Score' : 'Estimated Overall Band Score'}
            </div>
            <div className="flex justify-center gap-4 text-sm mt-3">
              <span>✅ {data.accuracy.toFixed(0)}% {lang === 'zh' ? '正确率' : 'accuracy'}</span>
              <span>⏱ {formatTime(data.timeUsed)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              📊 {lang === 'zh' ? '四项技能分析' : 'Four Skills Analysis'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreRadar
              reading={data.reading}
              listening={data.listening}
              writing={writing}
              speaking={speaking}
            />
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="space-y-3 pb-8">
          <p className="text-center text-sm text-[var(--muted-foreground)]">
            {lang === 'zh' ? '你也想挑战一下？每天15分钟，提升雅思成绩！' : 'Want to try? 15 minutes a day to boost your IELTS score!'}
          </p>
          <Button className="w-full" size="lg" onClick={() => router.push('/')}>
            🚀 {lang === 'zh' ? '免费开始练习' : 'Start Free Practice'}
          </Button>
        </div>
      </div>
    </div>
  );
}
