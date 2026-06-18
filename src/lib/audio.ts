'use client';

// === WAV 生成器（纯内存，无需外部文件） ===

function generateWavDataUri(frequencies: number[], noteDuration: number, sampleRate = 8000, volume = 0.35): string {
  const totalDuration = noteDuration * frequencies.length + 0.06;
  const totalSamples = Math.floor(sampleRate * totalDuration);
  const numChannels = 1, bitsPerSample = 16;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = totalSamples * blockAlign;
  
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  // RIFF
  writeStr(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(view, 8, 'WAVE');
  writeStr(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const noteIdx = Math.min(Math.floor(t / noteDuration), frequencies.length - 1);
    const noteT = t - noteIdx * noteDuration;
    const freq = frequencies[noteIdx];
    
    // Envelope
    let env = 1;
    if (noteT < 0.005) env = noteT / 0.005;
    else if (noteT > noteDuration - 0.03) env = (noteDuration - noteT) / 0.03;
    if (noteT >= noteDuration) env = 0;
    
    const sample = Math.sin(2 * Math.PI * freq * t) * env * volume;
    view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, sample)) * 32767), true);
  }
  
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

// === 预生成 WAV data URI ===
let _correctDataUri = '';
let _wrongDataUri = '';

function getCorrectUri(): string {
  if (!_correctDataUri) _correctDataUri = generateWavDataUri([523, 659, 784], 0.14);
  return _correctDataUri;
}

function getWrongUri(): string {
  if (!_wrongDataUri) _wrongDataUri = generateWavDataUri([400, 300, 200], 0.11, 8000, 0.25);
  return _wrongDataUri;
}

// === HTML5 Audio 播放（微信/所有浏览器通用） ===

function playAudioUri(dataUri: string) {
  const audio = new Audio(dataUri);
  audio.volume = 0.6;
  audio.play().catch(() => {
    // WeChat 偶尔也拦，静默失败
  });
}

// === Speech Synthesis（非微信环境增强） ===

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

// === 7-9 年级趣味短语 ===

const CORRECT_ZH = ['太强了！', '拿捏！', '你是学霸！', '稳如老狗！', '满分选手！', '无敌是多么寂寞！', '这题秒了！', '轻松碾压！', '老师看了都点赞！', '这就是实力！', '666！', '不愧是你！'];
const CORRECT_EN = ['Nailed it!', 'You are a legend!', 'Too easy!', 'Boss level clear!', 'Unstoppable!', 'GG!', 'Crushed it!', 'No sweat!'];
const WRONG_ZH = ['加油，下次必对！', '差一丢丢！', '稳住，你能行！', '别慌，小场面！', '这题在演你！', '啊这……再来！', '问题不大！', '还没使出全力吧？', '先mark，回头报仇！', '不慌，血条还长！'];
const WRONG_EN = ['Almost got it!', 'So close!', 'You got this!', 'Shake it off!', 'Not today!', 'Nice try, one more!', 'Level up next time!'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// === 主入口 ===

export async function speakFeedback(correct: boolean, lang: 'zh' | 'en') {
  // 1. HTML5 Audio 音效（微信 / iOS / Android / PC 全支持）
  playAudioUri(correct ? getCorrectUri() : getWrongUri());

  // 2. 语音朗读（非微信环境的锦上添花）
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const text = correct
      ? (lang === 'zh' ? pick(CORRECT_ZH) : pick(CORRECT_EN))
      : (lang === 'zh' ? pick(WRONG_ZH) : pick(WRONG_EN));
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = correct ? 1.05 : 0.95;
    utter.volume = 0.7;
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

// === 预热 ===
let _audioWarmedUp = false;
export function warmupAudio() {
  if (_audioWarmedUp || typeof window === 'undefined') return;
  _audioWarmedUp = true;
  // 预生成 WAV data URIs
  getCorrectUri();
  getWrongUri();
  if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
    ensureVoices();
  }
}
