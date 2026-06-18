export type QuestionType = 'reading' | 'listening' | 'vocabulary' | 'speaking' | 'writing';
export type QuestionSubtype = 'multiple-choice' | 'fill-blank';
export type Difficulty = 'A2' | 'B1' | 'B2' | 'C1';
export type PracticeType = 'reading' | 'listening' | 'vocabulary' | 'speaking' | 'writing' | 'combined';

export interface Question {
  id: string;
  type: 'reading' | 'listening';
  subtype: QuestionSubtype;
  passage?: string;           // reading passage text
  audioPrompt?: string;       // listening TTS text
  questionText: string;
  options?: string[];         // A/B/C/D for multiple-choice
  correctAnswer: string;      // e.g. "A" or exact fill-blank word
  explanation: string;
  bandLevel: number;          // 1-9 difficulty
}

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

export interface VocabularyQuestion {
  id: string;
  chineseMeaning: string;
  options: string[]; // 4 options, one is correct
  correctAnswer: string;
  difficulty: Difficulty;
}

export interface SpeakingQuestion {
  id: string;
  topic: string;
  prompt: string;
  checklist: string[]; // key points to check off
  durationSeconds: number;
}

export interface WritingQuestion {
  id: string;
  type: 'small' | 'large'; // Task 1 or Task 2
  prompt: string;
  timeLimitSeconds: number;
  minWordCount: number;
}

export interface PracticeSession {
  id: string;
  createdAt: number;
  type: PracticeType;
  // Reading + Listening fields
  readingQuestions?: Question[];
  listeningQuestions?: Question[];
  answers?: Record<string, string>; // questionId -> answer
  timeUsed: number;            // seconds
  perQuestionTime?: Record<string, number>;
  // Score
  score: SessionScore;
  achievements: Achievement[];
  // Vocabulary fields
  vocabularyQuestions?: VocabularyQuestion[];
  vocabularyAnswers?: Record<string, string>; // questionId -> answer
  // Speaking fields
  speakingQuestions?: SpeakingQuestion[];
  speakingChecklistProgress?: Record<string, boolean[]>; // questionId -> checked indices
  // Writing fields
  writingQuestions?: WritingQuestion[];
  writingDrafts?: Record<string, string>; // questionId -> user text
}

export interface SessionScore {
  reading: number;            // 0-9 band score
  listening: number;          // 0-9 band score
  vocabulary?: number;        // 0-9 band score
  estimatedWriting: number;
  estimatedSpeaking: number;
  total: number;              // average
  accuracy: number;           // 0-100 percentage
}

export interface UserSettings {
  language: 'zh' | 'en';
  achievements: string[];     // unlocked achievement IDs
  lastSessionId?: string;
  totalSessions: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_session',
    emoji: '🏆',
    title: '初次尝试',
    description: '完成第一次练习',
  },
  {
    id: 'perfect_score',
    emoji: '🌟',
    title: '完美答题',
    description: '正确率100%',
  },
  {
    id: 'speed_demon',
    emoji: '⚡',
    title: '速度之王',
    description: '在5分钟内完成',
  },
  {
    id: 'band_7',
    emoji: '🎯',
    title: '7分达人',
    description: '综合分数达到7.0+',
  },
  {
    id: 'target_reached',
    emoji: '🚀',
    title: '目标达成',
    description: '综合分数达到6.5+',
  },
  {
    id: 'five_sessions',
    emoji: '💪',
    title: '坚持练习',
    description: '完成5次练习',
  },
];

export const STORAGE_KEYS = {
  SESSIONS: 'ielts_sessions',
  SETTINGS: 'ielts_settings',
  VOCAB_PROGRESS: 'ielts_vocab_progress',
  READING_PROGRESS: 'ielts_reading_progress',
  LISTENING_PROGRESS: 'ielts_listening_progress',
  SPEAKING_PROGRESS: 'ielts_speaking_progress',
  WRITING_PROGRESS: 'ielts_writing_progress',
} as const;

export interface VocabProgress {
  completedIds: string[];
  stats: Record<string, { correct: number; wrong: number }>;
  cycle: number;
}

export interface QuestionProgress {
  completedIds: string[];
  cycle: number;
}

export interface ShareData {
  reading: number;
  listening: number;
  total: number;
  accuracy: number;
  timeUsed: number;
  sessionId: string;
  type?: PracticeType;
}
