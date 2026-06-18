'use client';

// === 预生成的 WAV data URI（极小，~3KB） ===

function makeWav(freqs: number[], durations: number[], sampleRate = 8000): string {
  const totalDur = durations.reduce((a, b) => a + b, 0);
  const totalSamples = Math.floor(sampleRate * totalDur);
  const dataSize = totalSamples * 2;

  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  writeWavHeader(v, sampleRate, dataSize);

  let pos = 0;
  for (let n = 0; n < freqs.length; n++) {
    const dur = durations[n];
    const freq = freqs[n];
    const ns = Math.floor(sampleRate * dur);
    for (let i = 0; i < ns; i++, pos++) {
      const t = i / sampleRate;
      const env = i < ns * 0.05 ? t / (dur * 0.05) : i > ns * 0.85 ? (ns - i) / (ns * 0.15) : 1;
      const s = Math.sin(2 * Math.PI * freq * t) * env * 0.35;
      v.setInt16(44 + pos * 2, Math.round(Math.max(-1, Math.min(1, s)) * 32767), true);
    }
  }

  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

function writeWavHeader(v: DataView, sr: number, dataSize: number) {
  const label = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  label(0, 'RIFF'); v.setUint32(4, 36 + dataSize, true); label(8, 'WAVE');
  label(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  label(36, 'data'); v.setUint32(40, dataSize, true);
}

const CORRECT_WAV = makeWav([523, 659, 784], [0.12, 0.12, 0.15]);
const WRONG_WAV   = makeWav([380, 260, 170], [0.09, 0.10, 0.10]);

// === DOM Audio 元素池（微信需要元素在 DOM 中） ===

let _correctAudio: HTMLAudioElement | null = null;
let _wrongAudio: HTMLAudioElement | null = null;

function getCorrectEl(): HTMLAudioElement {
  if (_correctAudio) return _correctAudio;
  _correctAudio = document.createElement('audio');
  _correctAudio.src = CORRECT_WAV;
  _correctAudio.volume = 0.5;
  _correctAudio.preload = 'auto';
  _correctAudio.style.display = 'none';
  document.body.appendChild(_correctAudio);
  return _correctAudio;
}

function getWrongEl(): HTMLAudioElement {
  if (_wrongAudio) return _wrongAudio;
  _wrongAudio = document.createElement('audio');
  _wrongAudio.src = WRONG_WAV;
  _wrongAudio.volume = 0.5;
  _wrongAudio.preload = 'auto';
  _wrongAudio.style.display = 'none';
  document.body.appendChild(_wrongAudio);
  return _wrongAudio;
}

function playSoundEl(el: HTMLAudioElement) {
  el.currentTime = 0;
  // 加载（确保 data URI 已就绪）
  el.load();
  el.play().catch(() => {});
}

// === Speech Synthesis（非微信环境） ===

const CORRECT_ZH = ['太强了！', '拿捏！', '你是学霸！', '稳如老狗！', '满分选手！', '这题秒了！', '轻松碾压！', '老师看了都点赞！', '666！', '不愧是你！'];
const CORRECT_EN = ['Nailed it!', 'You are a legend!', 'Too easy!', 'Boss level clear!', 'Unstoppable!', 'GG!', 'Crushed it!'];
const WRONG_ZH = ['加油，下次必对！', '差一丢丢！', '稳住，你能行！', '别慌，小场面！', '这题在演你！', '啊这……再来！', '问题不大！', '还没使出全力吧？', '先mark，回头报仇！', '不慌，血条还长！'];
const WRONG_EN = ['Almost got it!', 'So close!', 'You got this!', 'Shake it off!', 'Not today!', 'Nice try, one more!'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// === 主入口 ===

export function speakFeedback(correct: boolean, lang: 'zh' | 'en') {
  // 0. 确保预热（首次调用时创建 DOM 元素）
  if (!_warmedUp) warmupAudio();

  // 1. DOM Audio 音效（微信核心方案）
  if (typeof document !== 'undefined' && document.body) {
    playSoundEl(correct ? getCorrectEl() : getWrongEl());
  }

  // 2. 语音朗读（增强体验，可静默失败）
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      const text = correct
        ? (lang === 'zh' ? pick(CORRECT_ZH) : pick(CORRECT_EN))
        : (lang === 'zh' ? pick(WRONG_ZH) : pick(WRONG_EN));
      const u = new SpeechSynthesisUtterance(text);
      u.rate = correct ? 1.05 : 0.95;
      u.volume = 0.7;
      u.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
      u.pitch = correct ? 1.2 : 1.0;
      window.speechSynthesis.speak(u);
    } catch { /* optional */ }
  }
}

// === 预热：首次用户交互时创建 DOM 元素，解锁音频 ===

let _warmedUp = false;
export function warmupAudio() {
  if (_warmedUp || typeof document === 'undefined') return;
  _warmedUp = true;
  // 预创建 audio 元素，挂到 DOM（微信要求元素在 DOM 中才能 play）
  getCorrectEl();
  getWrongEl();
  // 触发一次静音 play 来"解锁"音频上下文
  const el = getCorrectEl();
  el.volume = 0;
  el.play().then(() => {
    el.pause();
    el.currentTime = 0;
    el.volume = 0.5;
  }).catch(() => {});
}
