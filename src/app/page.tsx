'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSessions } from '@/lib/storage';
import type { PracticeSession } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';

const FEATURES_ZH = [
  { emoji: '🎯', title: '雅思真题风格', desc: '基于历年雅思真题分析，1400个高频词+听力核心考点' },
  { emoji: '⏱', title: '每天只需15分钟', desc: '科学安排练习时长，告别题海战术，高效提分' },
  { emoji: '📊', title: '即时成绩分析', desc: '完成后立即查看雷达图分析，精准定位薄弱项' },
  { emoji: '🎮', title: '趣味闯关模式', desc: '解锁成就徽章，分享成绩给同学，练习不枯燥' },
];
const FEATURES_EN = [
  { emoji: '🎯', title: 'Real IELTS Style', desc: 'Questions based on actual IELTS patterns — Reading & Listening' },
  { emoji: '⏱', title: 'Only 15 Min/Day', desc: 'Scientifically designed practice sessions — efficient improvement' },
  { emoji: '📊', title: 'Instant Score Analysis', desc: 'Radar chart results right after practice — identify weak spots' },
  { emoji: '🎮', title: 'Fun Achievement System', desc: 'Unlock badges and share scores with classmates' },
];

export default function HomePage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [recentSessions, setRecentSessions] = useState<PracticeSession[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setRecentSessions(getSessions().slice(0, 3));
    setMounted(true);
  }, []);

  const features = lang === 'zh' ? FEATURES_ZH : FEATURES_EN;

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f8f7ff 0%, #ede9fe 50%, #ddd6fe 100%)' }}>
        <div className="text-center space-y-4">
          <div className="text-6xl animate-bounce">📚</div>
          <h1 className="text-3xl font-extrabold text-[#1a1a2e]">IELTS Fun Trainer</h1>
          <p className="text-[#64748b]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8f7ff 0%, #ede9fe 50%, #ddd6fe 100%)' }}>
      {/* Top Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📚</span>
          <span className="font-bold text-lg text-[var(--primary)]">IELTS Fun Trainer</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="text-sm font-medium px-3 py-1.5 rounded-full border border-[var(--primary)] text-[var(--primary)] hover:bg-violet-50 transition-colors"
          >
            {lang === 'zh' ? '🌐 English' : '🌐 中文'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-12 pb-16 text-center">
        <div className="animate-float inline-block text-6xl mb-4">🎓</div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--foreground)] mb-4 leading-tight">
          {lang === 'zh' ? (
            <>每天15分钟<br /><span className="text-[var(--primary)]">轻松突破雅思6.5</span></>
          ) : (
            <>15 Minutes a Day<br /><span className="text-[var(--primary)]">Reach IELTS 6.5+</span></>
          )}
        </h1>
        <p className="text-lg text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
          {lang === 'zh'
            ? '专为7-9年级学生设计 · 趣味练习 · 即时反馈 · 成就系统 · 一键分享给同学'
            : 'Designed for Grade 7–9 students · Fun practice · Instant feedback · Share with classmates'}
        </p>
        <Button size="xl" onClick={() => router.push('/practice')} className="shadow-xl shadow-violet-300/50">
          {lang === 'zh' ? '🚀 立即开始练习' : '🚀 Start Practice Now'}
        </Button>

        {/* Quick access cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 max-w-2xl mx-auto">
          <button
            onClick={() => router.push('/practice')}
            className="rounded-xl border-2 border-violet-200 bg-white p-4 hover:border-violet-400 hover:shadow-md transition-all cursor-pointer text-center active:scale-[0.98]"
          >
            <div className="text-2xl mb-1">📖🎧</div>
            <div className="text-sm font-semibold">{lang === 'zh' ? '阅读+听力' : 'Reading + Listening'}</div>
          </button>
          <button
            onClick={() => router.push('/vocab-practice')}
            className="rounded-xl border-2 border-emerald-200 bg-white p-4 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer text-center active:scale-[0.98]"
          >
            <div className="text-2xl mb-1">📝</div>
            <div className="text-sm font-semibold">{lang === 'zh' ? '词汇练习' : 'Vocabulary'}</div>
          </button>
          <button
            onClick={() => router.push('/speaking-practice')}
            className="rounded-xl border-2 border-blue-200 bg-white p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer text-center active:scale-[0.98]"
          >
            <div className="text-2xl mb-1">🎤</div>
            <div className="text-sm font-semibold">{lang === 'zh' ? '口语练习' : 'Speaking'}</div>
          </button>
          <button
            onClick={() => router.push('/writing-practice')}
            className="rounded-xl border-2 border-amber-200 bg-white p-4 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer text-center active:scale-[0.98]"
          >
            <div className="text-2xl mb-1">✍️</div>
            <div className="text-sm font-semibold">{lang === 'zh' ? '写作练习' : 'Writing'}</div>
          </button>
        </div>

        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          {lang === 'zh' ? '✅ 完全免费 · 无需注册 · 手机/电脑均可使用' : '✅ Free · No signup · Works on mobile & desktop'}
        </p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8 text-[var(--foreground)]">
          {lang === 'zh' ? 'Queenie 能拿6.5分吗？' : 'Will Queenie hit a 6.5?'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <Card key={i} className="text-center hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="text-4xl mb-3">{f.emoji}</div>
                <h3 className="font-bold mb-2 text-base">{f.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-16">
          <h2 className="text-xl font-bold mb-4">
            {lang === 'zh' ? '📖 最近的练习' : '📖 Recent Sessions'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentSessions.map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/results?id=${session.id}`)}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">
                      {session.type === 'reading' ? '📖' : session.type === 'listening' ? '🎧' : session.type === 'vocabulary' ? '📝' : session.type === 'speaking' ? '🎤' : session.type === 'writing' ? '✍️' : '📚'}{' '}
                      {lang === 'zh'
                        ? (session.type === 'reading' ? '阅读' : session.type === 'listening' ? '听力' : session.type === 'vocabulary' ? '词汇' : session.type === 'speaking' ? '口语' : session.type === 'writing' ? '写作' : '综合')
                        : session.type === 'vocabulary' ? 'Vocab' : session.type === 'speaking' ? 'Speaking' : session.type === 'writing' ? 'Writing' : session.type}
                    </Badge>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {new Date(session.createdAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')}
                    </span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-extrabold text-[var(--primary)]">
                      {session.score.total.toFixed(1)}
                    </span>
                    <span className="text-sm text-[var(--muted-foreground)] mb-0.5">
                      / 9.0 · {session.score.accuracy.toFixed(0)}% {lang === 'zh' ? '正确' : 'accuracy'}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-1">
                    ⏱ {formatTime(session.timeUsed)}
                    {session.achievements.length > 0 && (
                      <span className="ml-2">{session.achievements.map(a => a.emoji).join('')}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 text-center text-sm text-[var(--muted-foreground)]">
        <p>© 2026 IELTS Fun Trainer · {lang === 'zh' ? '专为信德7-9年级学生打造' : 'Built for XinDe Grade 7–9 students'}</p>
        <p className="mt-1">
          <span className="mx-2 text-[var(--muted-foreground)]">{lang === 'zh' ? '单纯做来' : 'Privacy'}</span>·<span className="mx-2 text-[var(--muted-foreground)]">{lang === 'zh' ? '给孩子' : 'Terms'}</span>·<span className="mx-2 text-[var(--muted-foreground)]">{lang === 'zh' ? '提高雅思分' : 'Contact'}</span>
          <span className="ml-2 text-xs">({lang === 'zh' ? '不作商业承诺' : 'coming soon'})</span>
        </p>
      </footer>
    </div>
  );
}
