'use client';

import { useEffect, useState } from 'react';
import type { Achievement } from '@/lib/types';
import { useLanguage } from '@/hooks/useLanguage';

interface AchievementToastProps {
  achievements: Achievement[];
}

const TOAST_DURATION_MS = 3000;
const QUEUE_GAP_MS = 500;

export default function AchievementToast({ achievements }: AchievementToastProps) {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [currentToastIndex, setCurrentToastIndex] = useState(0);
  const [queue, setQueue] = useState<Achievement[]>([]);

  // When achievements change, enqueue them
  useEffect(() => {
    if (achievements.length === 0) return;

    // Start queue with new achievements
    setQueue(achievements);
    setCurrentToastIndex(0);
    setVisible(true);
  }, [achievements]);

  // Handle showing each toast in the queue sequentially

  // After current toast is visible for TOAST_DURATION_MS, move to next or hide
  useEffect(() => {
    if (!visible || queue.length === 0) return;

    const timer = setTimeout(() => {
      const nextIndex = currentToastIndex + 1;
      if (nextIndex >= queue.length) {
        // All achievements shown, hide after a final gap
        const hideTimer = setTimeout(() => {
          setVisible(false);
          setQueue([]);
        }, QUEUE_GAP_MS);
        return hideTimer;
      } else {
        setCurrentToastIndex(nextIndex);
      }
    }, TOAST_DURATION_MS);

    return () => clearTimeout(timer);
  }, [visible, currentToastIndex, queue.length]);

  if (!visible || queue.length === 0) return null;
  const ach = queue[currentToastIndex];
  if (!ach) return null;

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up"
      role="alert"
      aria-live="polite"
    >
      <div className="bg-white border-2 border-[var(--primary)] rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-3 min-w-[280px]">
        <span className="text-4xl animate-celebrate">{ach.emoji}</span>
        <div>
          <div className="font-bold text-[var(--primary)] text-sm">🎊 {lang === 'zh' ? '成就解锁！' : 'Achievement Unlocked!'}</div>
          <div className="font-semibold text-base">{ach.title}</div>
          <div className="text-xs text-[var(--muted-foreground)]">{ach.description}</div>
          {queue.length > 1 && (
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              {currentToastIndex + 1}/{queue.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
