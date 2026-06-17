'use client';

/** 答题音效反馈 — iOS Safari 兼容版 */
export function speakFeedback(correct: boolean, lang: 'zh' | 'en') {
  // Try speech synthesis first
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    // Cancel any pending speech
    window.speechSynthesis.cancel();
    
    const text = correct
      ? (lang === 'zh' ? '正确' : 'Correct')
      : (lang === 'zh' ? '再试试' : 'Try again');
    
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;       // slower for clarity
    utter.volume = 0.8;
    utter.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    utter.pitch = correct ? 1.2 : 1.0;
    
    // iOS needs voices preloaded — try to pick a Chinese voice
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const match = voices.find(v => v.lang.startsWith(lang === 'zh' ? 'zh' : 'en')) || voices[0];
      utter.voice = match;
    }
    
    window.speechSynthesis.speak(utter);
  }
  
  // Always also play a simple beep — works everywhere including iOS
  playTone(correct ? 880 : 440, correct ? 200 : 300);
}

/** Web Audio API 短音效 — 所有平台通用 */
function playTone(freq: number, durationMs: number) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // AudioContext blocked — acceptable
  }
}
