import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ShareData } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function encodeShareData(score: ShareData): string {
  return btoa(encodeURIComponent(JSON.stringify(score)));
}

export function decodeShareData(encoded: string): ShareData | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)));
  } catch {
    return null;
  }
}

/** Convert accuracy percentage to IELTS band score estimate */
export function accuracyToBand(accuracy: number, type: 'reading' | 'listening'): number {
  // IELTS approximate conversion (simplified)
  const table = [
    { min: 90, band: 8.0 },
    { min: 80, band: 7.5 },
    { min: 70, band: 7.0 },
    { min: 60, band: 6.5 },
    { min: 50, band: 6.0 },
    { min: 40, band: 5.5 },
    { min: 30, band: 5.0 },
    { min: 0,  band: 4.5 },
  ];
  const offset = type === 'listening' ? 0.5 : 0; // listening slightly more generous
  const base = table.find(t => accuracy >= t.min)?.band ?? 4.0;
  return Math.min(9, base + offset);
}

export function calculateSpeakingWritingEstimate(readingBand: number, listeningBand: number) {
  const avg = (readingBand + listeningBand) / 2;
  return {
    writing: parseFloat((avg * 0.9).toFixed(1)),
    speaking: parseFloat((avg * 0.85).toFixed(1)),
  };
}

/** Analyze essay and return structured feedback */
export function analyzeWritingFeedback(
  question: { type: 'small' | 'large'; minWordCount: number; prompt: string },
  essay: string,
  timeUsed: number
): { overall: string; strengths: string[]; improvements: string[]; tips: string[]; estimatedBand: number } {
  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const paragraphs = essay.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const hasParagraphs = paragraphs.length >= 3;
  const meetsMinWords = wordCount >= question.minWordCount;
  const hasConclusion = essay.toLowerCase().includes('in conclusion') || essay.toLowerCase().includes('overall') || essay.toLowerCase().includes('to conclude') || essay.toLowerCase().includes('in summary');

  const hasComplexSentences = /\b(although|however|moreover|furthermore|despite|whereas|while|therefore|consequently)\b/i.test(essay);
  const hasCohesion = essay.includes('first') || essay.includes('firstly') || essay.includes('second') || essay.includes('secondly') || essay.includes('in addition') || essay.includes('additionally');
  const timePerWord = wordCount > 0 ? timeUsed / wordCount : 0;

  const bandScore = Math.min(9, Math.max(1,
    (meetsMinWords ? 4 : 2) +
    (hasParagraphs ? 1 : 0) +
    (hasConclusion ? 0.5 : 0) +
    (hasComplexSentences ? 0.5 : 0) +
    (hasCohesion ? 0.5 : 0) +
    (timePerWord < 60 ? 0.5 : 0)
  ));

  const overall = `${meetsMinWords ? '✅ 字数达标' : '⚠️ 字数不足'} | 字数 ${wordCount}/${question.minWordCount} | 耗时 ${formatTime(timeUsed)}`;
  const strengths: string[] = [];
  const improvements: string[] = [];
  const tips: string[] = [];

  if (meetsMinWords) strengths.push('字数达标，达到考试要求');
  if (wordCount >= question.minWordCount * 1.1) strengths.push('字数超出要求，内容展开充分');
  if (hasParagraphs) strengths.push('分段清晰，符合雅思写作结构要求');
  if (hasConclusion) strengths.push('有总结/结尾段落，结构完整');
  if (hasComplexSentences) strengths.push('使用了复杂句式（however/although 等），展现语法多样性');
  if (hasCohesion) strengths.push('使用了连接词，文章连贯性较好');
  if (timePerWord < 45) strengths.push('写作速度较快，时间管理优秀');

  if (!meetsMinWords) improvements.push(`字数不足，至少需要补充 ${question.minWordCount - wordCount} 词，多展开论点和例子`);
  if (!hasParagraphs) improvements.push('建议分段写作：引言段 + 主体段(2-3个) + 结论段');
  if (!hasConclusion) improvements.push('建议增加结尾段总结你的观点（1-2 句）');
  if (!hasComplexSentences) improvements.push('尝试使用复合句和连接词（Although..., However, Despite...）提升语法多样性');
  if (!hasCohesion) improvements.push('增加过渡词（Firstly, Moreover, In addition）提升文章连贯性');
  if (timePerWord >= 90) improvements.push('写作速度偏慢（平均词耗时超过90秒），建议平时做限时训练');

  if (question.type === 'small') {
    tips.push('小作文重点：先总述趋势，再分述关键数据和极值');
    tips.push('推荐使用比较级和百分比变化来描述数据');
  } else {
    tips.push('大作文建议：每段用 "论点 → 解释 → 例子" 的结构展开');
    tips.push('多准备一些万能论点和词汇（教育/科技/环境/社会类话题）');
  }

  return { overall, strengths, improvements, tips, estimatedBand: parseFloat(bandScore.toFixed(1)) };
}

export function getMotivationalMessage(total: number, lang: 'zh' | 'en'): string {
  if (lang === 'zh') {
    if (total >= 7.5) return '🌟 太厉害了！你已经达到目标分数了！';
    if (total >= 7.0) return '🎉 非常棒！距离目标只差一步！';
    if (total >= 6.5) return '🚀 达标了！继续练习冲7分！';
    if (total >= 6.0) return '💪 进步明显！再练几次就能达标！';
    return '🌱 好的开始！坚持练习，进步飞快！';
  } else {
    if (total >= 7.5) return '🌟 Outstanding! You\'ve hit your target!';
    if (total >= 7.0) return '🎉 Excellent! Just one step away!';
    if (total >= 6.5) return '🚀 Target reached! Push for band 7!';
    if (total >= 6.0) return '💪 Great progress! Keep practicing!';
    return '🌱 Good start! Keep at it — you\'ll improve fast!';
  }
}
