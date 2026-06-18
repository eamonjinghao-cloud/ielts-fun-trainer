const fs = require('fs');
const path = require('path');

const API_KEY = 'sk-2ukp3glhBBRFHGF5VSlrU2dCjg1eTGghLPT7UFwMAZB6Xbo4';
const QFILE = path.join(__dirname, '..', 'src', 'lib', 'questions.ts');

async function chat(prompt) {
  const r = await fetch('https://apihub.agnes-ai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: 'agnes-1.5-flash', temperature: 0.8, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  const d = await r.json();
  return d.choices[0].message.content;
}

function parseJSON(text) {
  let j = text.trim();
  const m = j.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) j = m[1].trim();
  const a = j.indexOf('['), b = j.lastIndexOf(']');
  if (a >= 0 && b > a) j = j.slice(a, b + 1);
  return JSON.parse(j);
}

function esc(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

async function genReading() {
  const content = fs.readFileSync(QFILE, 'utf8');
  const nextId = (content.match(/id: 'r(\d+)'/g) || []).length + 1;
  
  console.log(`Reading: r${nextId}+`);
  
  const allQ = [];
  const topics = ['animals', 'space', 'ancient history', 'ocean life', 'inventions', 'climate change', 'sports science', 'famous explorers', 'food science', 'robots and AI'];
  
  for (let batch = 0; batch < 2; batch++) {
    const topicList = topics.slice(batch * 5, batch * 5 + 5).join(', ');
    const prompt = `Generate 10 IELTS reading questions (ages 12-15, band 5-7) as JSON array. Topics: ${topicList}. Each SEPARATE passage. Format:
[{"id":"rXX","type":"reading","subtype":"multiple-choice","passage":"120-180 word passage","questionText":"question","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A","explanation":"explanation","bandLevel":5}]
Only JSON. No markdown. Use " for all strings. Escape any internal quotes.`;

    const text = await chat(prompt);
    const qs = parseJSON(text);
    qs.forEach((q, i) => { q.id = `r${nextId + allQ.length + i}`; });
    allQ.push(...qs);
    console.log(`  batch ${batch + 1}: +${qs.length} (total ${nextId + allQ.length - 1})`);
  }
  
  let c = fs.readFileSync(QFILE, 'utf8');
  const lines = allQ.map(q => {
    const opts = q.options.map(o => `'${o}'`).join(', ');
    return `  { id: '${q.id}', type: 'reading', subtype: 'multiple-choice', passage: '${esc(q.passage)}', questionText: '${esc(q.questionText)}', options: [${opts}], correctAnswer: '${q.correctAnswer}', explanation: '${esc(q.explanation)}', bandLevel: ${q.bandLevel} },`;
  }).join('\n');
  
  c = c.replace(/(\r?\n\];\r?\n\r?\nexport const LISTENING_QUESTIONS)/, `\n${lines}\n];\n\nexport const LISTENING_QUESTIONS`);
  fs.writeFileSync(QFILE, c, 'utf8');
  return allQ.length;
}

async function genListening() {
  const content = fs.readFileSync(QFILE, 'utf8');
  const nextId = (content.match(/id: 'l(\d+)'/g) || []).length + 1;
  
  console.log(`\nListening: l${nextId}+`);
  
  const allQ = [];
  for (let batch = 0; batch < 2; batch++) {
    const prompt = `Generate 8 IELTS listening questions (ages 12-15, band 4-6) as JSON array. Mix fill-blank and multiple-choice. Format:
[{"id":"lXX","type":"listening","subtype":"fill-blank","audioPrompt":"50-80 word spoken passage for TTS. Natural English. Topic: school, museum, travel, weather, shopping, sports.","questionText":"Question with _____ for blanks","correctAnswer":"word","explanation":"explanation","bandLevel":5}]
For multiple-choice add "options":["A. ...","B. ...","C. ...","D. ..."]. Only JSON.`;

    const text = await chat(prompt);
    const qs = parseJSON(text);
    qs.forEach((q, i) => { q.id = `l${nextId + allQ.length + i}`; });
    allQ.push(...qs);
    console.log(`  batch ${batch + 1}: +${qs.length} (total ${nextId + allQ.length - 1})`);
  }
  
  let c = fs.readFileSync(QFILE, 'utf8');
  const lines = allQ.map(q => {
    const base = `  { id: '${q.id}', type: 'listening', subtype: '${q.subtype}', audioPrompt: '${esc(q.audioPrompt)}', questionText: '${esc(q.questionText)}', correctAnswer: '${q.correctAnswer}', explanation: '${esc(q.explanation)}', bandLevel: ${q.bandLevel} }`;
    if (q.options) {
      const opts = q.options.map(o => `'${o}'`).join(', ');
      return base.replace('correctAnswer:', `options: [${opts}], correctAnswer:`) + ',';
    }
    return base + ',';
  }).join('\n');
  
  c = c.replace(/(\r?\n\];\r?\n\r?\nexport const VOCABULARY_QUESTIONS)/, `\n${lines}\n];\n\nexport const VOCABULARY_QUESTIONS`);
  fs.writeFileSync(QFILE, c, 'utf8');
  return allQ.length;
}

async function main() {
  const r = await genReading();
  const l = await genListening();
  console.log(`\nDone: +${r} reading, +${l} listening = ${r + l} total`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
