'use client';

import { formatTime } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface TimerBarProps {
  seconds: number;
  totalSeconds: number;
  current: number;
  total: number;
  label?: string;
}

export default function TimerBar({ seconds, totalSeconds, current, total, label }: TimerBarProps) {
  const timePercent = (seconds / totalSeconds) * 100;
  const progressPercent = ((current - 1) / total) * 100;
  const isWarning = seconds < 60;
  const isDanger = seconds < 30;

  return (
    <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[var(--border)] px-4 py-3 shadow-sm">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--muted-foreground)]">
            {label ?? 'Progress'} {current}/{total}
          </span>
          <span
            aria-label={`Time remaining: ${formatTime(seconds)}`}
            className={cn(
              'font-bold text-lg tabular-nums',
              isDanger ? 'animate-timer-warning' : isWarning ? 'text-orange-500' : 'text-[var(--primary)]'
            )}
          >
            <span aria-hidden="true">⏱</span> {formatTime(seconds)}
          </span>
        </div>
        {/* Question progress */}
        <div className="mb-1.5">
          <Progress value={progressPercent} className="h-2" />
        </div>
        {/* Time progress */}
        <div>
          <Progress
            value={timePercent}
            className={cn('h-1.5', isDanger ? '[&>div]:bg-red-500' : isWarning ? '[&>div]:bg-orange-400' : '')}
          />
        </div>
      </div>
    </div>
  );
}
