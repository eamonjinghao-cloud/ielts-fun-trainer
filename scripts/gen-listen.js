const fs = require('fs');

const API_KEY = 'sk-2ukp3glhBBRFHGF5VSlrU2dCjg1eTGghLPT7UFwMAZB6Xbo4';
const QFILE = 'src/lib/questions.ts';

async function chat(prompt) {
  const r = await fetch('https://apihub.agnes-ai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: 'agnes-1.5-flash', temperature: 0.8, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
  });
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

async function main() {
  const content = fs.readFileSync(QFILE, 'utf8');
  const nextLId = (content.match(/id: 'l(\d+)'/g) || []).length + 1;
  
  console.log(`Generating 16 listening questions l${nextLId}...`);
  
  const allQ = [];
  for (let batch = 0; batch < 2; batch++) {
    const prompt = `Generate 8 IELTS listening questions (ages 12-15, band 4-6) as JSON array. Format:
[{"id":"lX","type":"listening","subtype":"fill-blank","audioPrompt":"50-80 word spoken English passage for TTS","questionText":"Question with _____ for blank","correctAnswer":"word","explanation":"brief explanation","bandLevel":5}]
For multiple-choice add "options":["A. option","B. option","C. option","D. option"]. Mix both types. Only JSON.`;

    const text = await chat(prompt);
    const qs = parseJSON(text);
    qs.forEach((q, i) => { q.id = `l${nextLId + allQ.length + i}`; });
    allQ.push(...qs);
    console.log(`  +${qs.length}`);
  }

  // Build TS code
  const lines = allQ.map(q => {
    const base = `  { id: '${q.id}', type: 'listening', subtype: '${q.subtype}', audioPrompt: '${esc(q.audioPrompt)}', questionText: '${esc(q.questionText)}', correctAnswer: '${q.correctAnswer}', explanation: '${esc(q.explanation)}', bandLevel: ${q.bandLevel} }`;
    if (q.options) {
      const opts = q.options.map(o => `'${esc(o)}'`).join(', ');
      return base.replace('correctAnswer:', `options: [${opts}], correctAnswer:`) + ',';
    }
    return base + ',';
  }).join('\n');

  // Fix: add comma to l5, then append
  let c = fs.readFileSync(QFILE, 'utf8');
  
  // Add comma after l5
  c = c.replace(/(id: 'l5'.*bandLevel: 5) \}/, '$1 },');
  
  // Insert before closing ] of LISTENING_QUESTIONS
  c = c.replace(/(\n\];\n\nexport const VOCABULARY_QUESTIONS)/, `\n${lines}\n];\n\nexport const VOCABULARY_QUESTIONS`);
  
  fs.writeFileSync(QFILE, c, 'utf8');
  console.log(`\nAdded ${allQ.length} listening questions`);
  
  const final = fs.readFileSync(QFILE, 'utf8');
  console.log(`Reading: ${(final.match(/id: 'r\d+'/g) || []).length}`);
  console.log(`Listening: ${(final.match(/id: 'l\d+'/g) || []).length}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
