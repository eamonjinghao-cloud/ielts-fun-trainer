'use client';

// === 全局 AudioContext ===
let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (_audioCtx && _audioCtx.state !== 'closed') return _audioCtx;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    _audioCtx = new Ctor();
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    return _audioCtx;
  } catch {
    return null;
  }
}

// === 预加载语音 ===
let _voicesLoaded = false;
function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve([]);
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) { _voicesLoaded = true; return Promise.resolve(voices); }
  return new Promise(resolve => {
    const handler = () => {
      _voicesLoaded = true;
      resolve(window.speechSynthesis.getVoices());
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    setTimeout(() => { if (!_voicesLoaded) handler(); }, 2000);
  });
}

// === 7-9 年级趣味反馈语库 ===
const CORRECT_ZH = [
  '太强了！',
  '拿捏！',
  '你是学霸！',
  '稳如老狗！',
  '满分选手！',
  '无敌是多么寂寞！',
  '这题秒了！',
  '轻松碾压！',
  '老师看了都点赞！',
  '这就是实力！',
  '666！',
  '不愧是你！',
];

const CORRECT_EN = [
  'Nailed it!',
  'You are a legend!',
  'Too easy!',
  'Boss level clear!',
  'Unstoppable!',
  'GG!',
  'Crushed it!',
  'No sweat!',
];

const WRONG_ZH = [
  '加油，下次必对！',
  '差一丢丢！',
  '稳住，你能行！',
  '别慌，小场面！',
  '这题在演你！',
  '啊这……再来！',
  '问题不大！',
  '还没使出全力吧？',
  '先mark，回头报仇！',
  '不慌，血条还长！',
];

const WRONG_EN = [
  'Almost got it!',
  'So close!',
  'You got this!',
  'Shake it off!',
  'Not today!',
  'Nice try, one more!',
  'Level up next time!',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// === 游戏感音效 ===

/** 答对：升级音效 —— 上行琶音 C5 → E5 → G5 */
function playCorrectSound(ctx: AudioContext) {
  const now = ctx.currentTime;
  const notes = [523, 659, 784]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.1, now + i * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.22);
  });
}

/** 答错：游戏掉血音效 —— 下行滑音 */
function playWrongSound(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.linearRampToValueAtTime(200, now + 0.25);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.32);
}

// === 主入口 ===
export async function speakFeedback(correct: boolean, lang: 'zh' | 'en') {
  // 1. 游戏音效（全平台可用）
  const ctx = getAudioCtx();
  if (ctx) {
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    try {
      if (correct) {
        playCorrectSound(ctx);
      } else {
        playWrongSound(ctx);
      }
    } catch { /* 静默失败 */ }
  }

  // 2. 趣味语音朗读（非微信环境）
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();

    const text = correct
      ? (lang === 'zh' ? pick(CORRECT_ZH) : pick(CORRECT_EN))
      : (lang === 'zh' ? pick(WRONG_ZH) : pick(WRONG_EN));

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = correct ? 1.05 : 0.95;
    utter.volume = 0.8;
    utter.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    utter.pitch = correct ? 1.2 : 1.0;

    const voices = await ensureVoices();
    if (voices.length > 0) {
      const match = voices.find(v => v.lang.startsWith(lang === 'zh' ? 'zh' : 'en')) || voices[0];
      utter.voice = match;
    }

    window.speechSynthesis.speak(utter);
  }
}

// === 音频预热 ===
let _audioWarmedUp = false;
export function warmupAudio() {
  if (_audioWarmedUp || typeof window === 'undefined') return;
  _audioWarmedUp = true;
  const ctx = getAudioCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    ensureVoices();
  }
}
