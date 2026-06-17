import type { PracticeSession, UserSettings, VocabProgress, VocabularyQuestion } from './types';
import { STORAGE_KEYS } from './types';

export function getSessions(): PracticeSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: PracticeSession): void {
  if (typeof window === 'undefined') return;
  try {
    const sessions = getSessions();
    const updated = [session, ...sessions].slice(0, 20); // keep latest 20
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function getSession(id: string): PracticeSession | null {
  const sessions = getSessions();
  return sessions.find(s => s.id === id) ?? null;
}

export function clearSessions(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.SESSIONS);
}

export function getSettings(): UserSettings {
  if (typeof window === 'undefined') return { language: 'zh', achievements: [], totalSessions: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : { language: 'zh', achievements: [], totalSessions: 0 };
  } catch {
    return { language: 'zh', achievements: [], totalSessions: 0 };
  }
}

export function saveSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function updateAchievements(newIds: string[]): string[] {
  const settings = getSettings();
  const updated = Array.from(new Set([...settings.achievements, ...newIds]));
  saveSettings({ ...settings, achievements: updated });
  return updated;
}

// --- Vocab Progress ---

export function getVocabProgress(): VocabProgress {
  if (typeof window === 'undefined') return { completedIds: [], stats: {}, cycle: 1 };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VOCAB_PROGRESS);
    return raw ? JSON.parse(raw) : { completedIds: [], stats: {}, cycle: 1 };
  } catch {
    return { completedIds: [], stats: {}, cycle: 1 };
  }
}

export function saveVocabProgress(data: VocabProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.VOCAB_PROGRESS, JSON.stringify(data));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function getQuizSet(
  totalQuestions: VocabularyQuestion[],
  count: number = 15,
  completedIds: string[] = []
): VocabularyQuestion[] {
  const remaining = totalQuestions.filter(q => !completedIds.includes(q.id));
  // All done — enter a new cycle
  if (remaining.length === 0) {
    return shuffleArray(totalQuestions);
  }
  // Less than count remaining — take all (about to enter new cycle)
  if (remaining.length < count) {
    return shuffleArray(remaining);
  }
  // Normal case — pick `count` random questions
  return shuffleArray(remaining).slice(0, count);
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
