// scripts/gen-audio-data.mjs
// Generates base64 WAV audio blobs for correct/incorrect feedback
import { writeFileSync } from 'fs';

function createWav(samples, sampleRate = 8000) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = samples.length * blockAlign;
  
  const buffer = Buffer.alloc(44 + dataSize);
  
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  
  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  
  return buffer;
}

// Generate correct sound: ascending beep (C5 → E5 → G5)
function correctBeep() {
  const sampleRate = 8000;
  const duration = 0.45;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = [];
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let freq;
    if (t < 0.15) freq = 523;
    else if (t < 0.30) freq = 659;
    else freq = 784;
    
    const envT = t < 0.02 ? t / 0.02 : (t > duration - 0.05 ? (duration - t) / 0.05 : 1);
    samples.push(Math.sin(2 * Math.PI * freq * t) * envT * 0.4);
  }
  return createWav(samples, sampleRate);
}

// Generate wrong sound: descending beep (400Hz → 200Hz)
function wrongBeep() {
  const sampleRate = 8000;
  const duration = 0.35;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = [];
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const freq = 400 - (200 * t / duration);
    const envT = t < 0.03 ? t / 0.03 : (t > duration - 0.05 ? (duration - t) / 0.05 : 1);
    samples.push(Math.sin(2 * Math.PI * freq * t) * envT * 0.3);
  }
  return createWav(samples, sampleRate);
}

const correctWav = correctBeep();
const wrongWav = wrongBeep();

const correctBase64 = correctWav.toString('base64');
const wrongBase64 = wrongWav.toString('base64');

console.log(`export const CORRECT_AUDIO = "data:audio/wav;base64,${correctBase64}";`);
console.log(`export const WRONG_AUDIO = "data:audio/wav;base64,${wrongBase64}";`);
