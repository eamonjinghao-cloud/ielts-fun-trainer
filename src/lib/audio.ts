'use client';

// === 全局 AudioContext（懒惰初始化，首次用户点击时激活） ===
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

// === 预加载语音（iOS/微信兼容） ===
let _voicesLoaded = false;
function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve([]);
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    _voicesLoaded = true;
    return Promise.resolve(voices);
  }
  // iOS/微信中 getVoices() 异步加载，需要等待
  return new Promise(resolve => {
    const handler = () => {
      _voicesLoaded = true;
      resolve(window.speechSynthesis.getVoices());
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // 超时保护
    setTimeout(() => {
      if (!_voicesLoaded) {
        handler();
      }
    }, 2000);
  });
}

/** 答题音效反馈 — 微信 / iOS / Android / PC 全兼容 */
export async function speakFeedback(correct: boolean, lang: 'zh' | 'en') {
  // 1. Web Audio 音效（微信可用，前提是 AudioContext 在用户手势中激活）
  const ctx = getAudioCtx();
  if (ctx) {
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = correct ? 880 : 440;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (correct ? 0.2 : 0.3));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (correct ? 0.22 : 0.32));
    } catch { /* silent */ }
  }

  // 2. 语音朗读（非微信环境）
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const text = correct
      ? (lang === 'zh' ? '正确' : 'Correct')
      : (lang === 'zh' ? '再试试' : 'Try again');
    
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9;
    utter.volume = 0.7;
    utter.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    utter.pitch = correct ? 1.1 : 1.0;

    // 选合适的语音
    const voices = await ensureVoices();
    if (voices.length > 0) {
      const match = voices.find(v => v.lang.startsWith(lang === 'zh' ? 'zh' : 'en')) || voices[0];
      utter.voice = match;
    }

    window.speechSynthesis.speak(utter);
  }
}

// === 页面首次加载时，在第一个用户交互处激活音频 ===
let _audioWarmedUp = false;
export function warmupAudio() {
  if (_audioWarmedUp || typeof window === 'undefined') return;
  _audioWarmedUp = true;
  
  // 创建一个短暂、无声的音频上下文来解锁
  const ctx = getAudioCtx();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  
  // 预加载语音列表
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    ensureVoices();
  }
}
