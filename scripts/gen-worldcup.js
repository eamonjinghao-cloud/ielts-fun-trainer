const fs = require('fs');

const API_KEY = 'sk-2ukp3glhBBRFHGF5VSlrU2dCjg1eTGghLPT7UFwMAZB6Xbo4';
const QFILE = 'src/lib/questions.ts';

async function chat(prompt) {
  const r = await fetch('https://apihub.agnes-ai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: 'agnes-1.5-flash', temperature: 0.9, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
  });
  const d = await r.json();
  return d.choices[0].message.content;
}

function parseJSON(text) {
  let j = text.trim();
  const m = j.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) j = m[1].trim();
  // Try array
  const a = j.indexOf('['), b = j.lastIndexOf(']');
  if (a >= 0 && b > a) {
    const arr = JSON.parse(j.slice(a, b + 1));
    return arr;
  }
  // Try single object
  const o1 = j.indexOf('{'), o2 = j.lastIndexOf('}');
  if (o1 >= 0 && o2 > o1) {
    return JSON.parse(j.slice(o1, o2 + 1));
  }
  return JSON.parse(j);
}

function esc(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

async function main() {
  const content = fs.readFileSync(QFILE, 'utf8');
  const nextR = (content.match(/id: 'r(\d+)'/g) || []).length + 1;
  const nextL = (content.match(/id: 'l(\d+)'/g) || []).length + 1;

  // === Reading: World Cup + current events ===
  console.log(`Reading: r${nextR}+ (World Cup & current events)`);
  const topics = [
    'History of the FIFA World Cup and its most famous moments',
    'How the 2026 World Cup will be the first hosted by 3 countries: USA, Canada, Mexico',
    'Famous World Cup players like Messi, Ronaldo, and Mbappe',
    'How technology like VAR changed football and the World Cup',
    'The impact of AI and robots in modern sports and daily life',
    'Climate change and its effect on major sporting events',
    'The rise of e-sports and whether they should be in the Olympics',
    'How social media changed the way we watch sports',
    'Amazing animal migrations and what they teach us about teamwork',
    'Space exploration: latest missions to Mars and the Moon'
  ];

  const readingQs = [];
  for (let i = 0; i < 10; i++) {
    const prompt = `Write 1 IELTS reading question (band 5-7, ages 12-15) about: "${topics[i]}". Return ONLY a JSON object:
{"id":"rXX","type":"reading","subtype":"multiple-choice","passage":"130-180 words, factual and fun","questionText":"1 question","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A","explanation":"short explanation","bandLevel":5}
Only JSON, one object (no array). Use " for all strings.`;

    const text = await chat(prompt);
    const q = parseJSON(text);
    const obj = Array.isArray(q) ? q[0] : q;
    obj.id = `r${nextR + i}`;
    readingQs.push(obj);
    console.log(`  r${nextR + i}: ${topics[i].slice(0, 40)}...`);
  }

  // === Listening: World Cup + current events ===
  console.log(`\nListening: l${nextL}+ (World Cup & sports)`);
  const lTopics = [
    'Morning school announcement about a football match between classes',
    'A tour guide explaining the history of a famous football stadium',
    'Weather forecast for a World Cup match day',
    'Two friends talking about their favorite World Cup team',
    'A coach giving halftime advice to young players',
    'Radio announcement about traffic changes during a big sports event',
    'Phone call ordering tickets for a football match',
    'A museum guide talking about sports science and athlete training',
    'Students planning to watch the World Cup final together',
    'A news report about a young athlete who saved a goal with incredible skill'
  ];

  const listeningQs = [];
  for (let i = 0; i < lTopics.length; i++) {
    const prompt = `Write 1 IELTS listening question (band 4-6, ages 12-15) about: "${lTopics[i]}". Return ONLY a JSON object:
{"id":"lXX","type":"listening","subtype":"fill-blank","audioPrompt":"60-80 word conversational English","questionText":"Question with _____ for blank","correctAnswer":"one word","explanation":"short","bandLevel":5}
For multiple-choice add: "subtype":"multiple-choice","options":["A. ...","B. ...","C. ...","D. ..."]. Only JSON.`;

    try {
      const text = await chat(prompt);
      const q = parseJSON(text);
      const obj = Array.isArray(q) ? q[0] : q;
      obj.id = `l${nextL + i}`;
      listeningQs.push(obj);
      console.log(`  l${nextL + i}: ${lTopics[i].slice(0, 40)}...`);
    } catch(e) {
      console.log(`  l${nextL + i}: FAILED, retrying...`);
      // retry once
      try {
        const text = await chat(prompt.replace('football', 'soccer'));
        const q = parseJSON(text);
        const obj = Array.isArray(q) ? q[0] : q;
        obj.id = `l${nextL + i}`;
        listeningQs.push(obj);
        console.log(`  l${nextL + i}: OK (retry)`);
      } catch(e2) {
        console.log(`  l${nextL + i}: SKIPPED`);
      }
    }
  }

  // === Append to file ===
  let c = fs.readFileSync(QFILE, 'utf8');

  // Reading: insert before LISTENING_QUESTIONS
  const rLines = readingQs.map(q => {
    const opts = (q.options && Array.isArray(q.options)) ? q.options.map(o => `'${esc(o)}'`).join(', ') : "'A. yes','B. no','C. maybe','D. not sure'";
    return `  { id: '${q.id || 'rX'}', type: 'reading', subtype: 'multiple-choice', passage: '${esc(q.passage || '')}', questionText: '${esc(q.questionText || '')}', options: [${opts}], correctAnswer: '${q.correctAnswer || 'A'}', explanation: '${esc(q.explanation || '')}', bandLevel: ${q.bandLevel || 5} },`;
  }).join('\n');

  c = c.replace(/(\r?\n\];\r?\n\r?\nexport const LISTENING_QUESTIONS)/, `\n${rLines}\n];\n\nexport const LISTENING_QUESTIONS`);

  // Listening: insert before VOCABULARY_QUESTIONS
  const lLines = listeningQs.filter(q => q && q.id && q.subtype).map(q => {
    const sub = q.subtype || 'fill-blank';
    const exp = (q.explanation || '').replace(/'/g, "\\'");
    const base = `  { id: '${q.id}', type: 'listening', subtype: '${sub}', audioPrompt: '${esc(q.audioPrompt || '')}', questionText: '${esc(q.questionText || '')}', correctAnswer: '${q.correctAnswer || ''}', explanation: '${exp}', bandLevel: ${q.bandLevel || 5} }`;
    if (q.options && Array.isArray(q.options) && q.options.length > 0) {
      const opts = q.options.map(o => `'${esc(o)}'`).join(', ');
      return base.replace('correctAnswer:', `options: [${opts}], correctAnswer:`) + ',';
    }
    return base + ',';
  }).join('\n');

  c = c.replace(/(\r?\n\];\r?\n\r?\nexport const VOCABULARY_QUESTIONS)/, `\n${lLines}\n];\n\nexport const VOCABULARY_QUESTIONS`);

  fs.writeFileSync(QFILE, c, 'utf8');

  const final = fs.readFileSync(QFILE, 'utf8');
  console.log(`\nDone:`);
  console.log(`  Reading: ${(final.match(/id: 'r\d+'/g) || []).length} (was ${nextR - 1}, +${readingQs.length})`);
  console.log(`  Listening: ${(final.match(/id: 'l\d+'/g) || []).length} (was ${nextL - 1}, +${listeningQs.length})`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
