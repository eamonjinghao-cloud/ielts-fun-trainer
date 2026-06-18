import type { PracticeSession, UserSettings, VocabProgress, VocabularyQuestion, QuestionProgress } from './types';
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

// === 通用题目进度（阅读/听力/口语/写作） ===

export function getQuestionProgress(storageKey: string): QuestionProgress {
  if (typeof window === 'undefined') return { completedIds: [], cycle: 1 };
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : { completedIds: [], cycle: 1 };
  } catch {
    return { completedIds: [], cycle: 1 };
  }
}

export function saveQuestionProgress(storageKey: string, data: QuestionProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch {
    // localStorage full
  }
}

/** 从题库中挑选未做过的题目，全部做完则重置进入下一轮 */
export function pickQuestions<T extends { id: string }>(
  allQuestions: T[],
  count: number,
  progress: QuestionProgress
): { questions: T[]; newCompletedIds: string[] } {
  const remaining = allQuestions.filter(q => !progress.completedIds.includes(q.id));

  // 全部做过 → 重置，进入新轮次
  if (remaining.length === 0) {
    const newCompletedIds = allQuestions.slice(0, count).map(q => q.id);
    return {
      questions: shuffleArray(allQuestions).slice(0, count),
      newCompletedIds,
    };
  }

  // 剩余不够 → 取全部剩余
  if (remaining.length < count) {
    return {
      questions: shuffleArray(remaining),
      newCompletedIds: [...progress.completedIds, ...remaining.map(q => q.id)],
    };
  }

  // 正常 → 随机选 count 道
  const picked = shuffleArray(remaining).slice(0, count);
  return {
    questions: picked,
    newCompletedIds: [...progress.completedIds, ...picked.map(q => q.id)],
  };
}

/** 标记题目已完成，全部做完自动重置 cycle */
export function markQuestionsComplete(
  allQuestions: { id: string }[],
  questionIds: string[],
  progress: QuestionProgress
): QuestionProgress {
  const newIds = [...progress.completedIds];
  for (const qid of questionIds) {
    if (!newIds.includes(qid)) newIds.push(qid);
  }
  const cycle = progress.cycle;
  if (newIds.length >= allQuestions.length) {
    return { completedIds: [], cycle: cycle + 1 };
  }
  return { completedIds: newIds, cycle };
}
