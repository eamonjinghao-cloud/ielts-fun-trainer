// Batch generate IELTS vocabulary questions via Agnes AI
// appends to src/lib/questions.ts until reaching 1400 total
const fs = require("fs");
const path = require("path");

const API_KEY = "sk-2ukp3glhBBRFHGF5VSlrU2dCjg1eTGghLPT7UFwMAZB6Xbo4";
const QUESTIONS_FILE = path.join(__dirname, "..", "src", "lib", "questions.ts");
const TARGET = 1400;

function getExistingCount() {
  const content = fs.readFileSync(QUESTIONS_FILE, "utf8");
  return (content.match(/\{[\s\S]*?id: 'vg\d+[\s\S]*?\}/g) || []).length;
}

function getLastId() {
  const content = fs.readFileSync(QUESTIONS_FILE, "utf8");
  const matches = content.match(/id: 'vg(\d+)'/g);
  if (!matches) return 879;
  return Math.max(...matches.map(m => parseInt(m.match(/\d+/)[0])));
}

async function generateBatch(count, startId, difficulty) {
  const payload = {
    model: "agnes-1.5-flash",
    temperature: 0.8,
    max_tokens: count * 150,
    messages: [
      {
        role: "system",
        content: `Generate ${count} IELTS vocabulary questions as a PURE JSON array. NO markdown, NO text — ONLY the JSON array.

STRICT FORMAT per question:
{"id":"vg${startId}","chineseMeaning":"词性. 中文释义","options":["correctWord","d1","d2","d3"],"correctAnswer":"correctWord","difficulty":"${difficulty}"}

FOLLOW these:
- id from vg${startId} to vg${startId + count - 1}, sequential
- chineseMeaning: Chinese part-of-speech marker + meaning. e.g. "v. 保护；防护" or "adj. 重要的 n. 重要性"
- options: 4 English words, first one is correct (UI will shuffle)
- correctAnswer must match the first option word exactly
- Generate ONLY new words, avoid: abandon, academic, accelerate, access, accommodate, accumulate, accurate, adapt, adequate, adjacent, adopt, analyze, approach, assess, assignment, assume, assumption, attain, attribute, authoritative, benefit, brief, candidate, clarify, commercialize, concentrate, conclude, convenient, deficit, degradation, detect, differentiate, discrete, drastic, elevate, eminent, enduring, enlightenment, experiment, experimental, facilitate, feat, forge, genuine, iconic, implement, incentive, inflation, infrastructure, integrate, intensive, lifestyle, mentality, monument, optimize, ore, originate, overlap, phenomenon, predator, primitive, progressive, refine, reinforce, remnant, reproduce, resource, rigorous, scarcity, scenic, specimen, sustain, systematic, terrain, transmit, venture, verify, visionary`
      },
      { role: "user", content: `Generate ${count} fresh IELTS vocabulary questions (${difficulty} level). Only JSON array.` }
    ],
  };

  const res = await fetch("https://apihub.agnes-ai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  
  let json = text.trim();
  const m = json.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) json = m[1].trim();
  const a = json.indexOf("["), b = json.lastIndexOf("]");
  if (a >= 0 && b > a) json = json.slice(a, b + 1);

  const arr = JSON.parse(json);
  if (!Array.isArray(arr)) throw new Error("not array");

  return arr.map((q, i) => {
    q.id = `vg${startId + i}`;
    // validate
    if (!q.options.includes(q.correctAnswer)) q.correctAnswer = q.options[0];
    return q;
  });
}

function appendToFile(questions) {
  let content = fs.readFileSync(QUESTIONS_FILE, "utf8");
  const lines = questions.map(q => 
    `  { id: '${q.id}', chineseMeaning: '${q.chineseMeaning}', options: [${q.options.map(o => `'${o}'`).join(", ")}], correctAnswer: '${q.correctAnswer}', difficulty: '${q.difficulty}' },`
  ).join("\n") + "\n";

  // Insert before the closing ] of VOCABULARY_QUESTIONS (just before SPEAKING_QUESTIONS)
  content = content.replace(
    /(\r?\n\];\r?\n\r?\nexport const SPEAKING_QUESTIONS)/,
    `\n${lines}];\n\nexport const SPEAKING_QUESTIONS`
  );
  fs.writeFileSync(QUESTIONS_FILE, content, "utf8");
  console.log(`  wrote to file, total now: ${getExistingCount()}`);
}

async function main() {
  const startCount = getExistingCount();
  console.log(`Current: ${startCount}/1400`);
  const needed = TARGET - startCount;
  if (needed <= 0) { console.log("Already at target!"); return; }
  console.log(`Need: ${needed} more\n`);

  let lastId = getLastId();
  let remaining = needed;
  
  while (remaining > 0) {
    const batch = Math.min(15, remaining); // small batches for reliability
    const id = lastId + 1;
    const diff = remaining > 350 ? "A2" : remaining > 200 ? "B1" : remaining > 80 ? "B2" : "C1";
    
    process.stdout.write(`Generating ${batch} (${diff})... `);
    try {
      const qs = await generateBatch(batch, id, diff);
      if (qs.length === 0) throw new Error("empty");
      
      appendToFile(qs);
      lastId += qs.length;
      remaining -= qs.length;
      console.log(`OK (${startCount + needed - remaining}/${TARGET})`);
    } catch (e) {
      console.log(`FAIL: ${e.message.slice(0, 80)}`);
      // retry with smaller batch
      if (batch > 3) {
        console.log(`  Retrying ${Math.floor(batch/2)}...`);
        try {
          const qs = await generateBatch(Math.floor(batch/2), id, diff);
          appendToFile(qs);
          lastId += qs.length;
          remaining -= qs.length;
          console.log(`  OK`);
        } catch (e2) {
          console.log(`  Retry failed: ${e2.message.slice(0, 50)}`);
          break;
        }
      } else {
        break;
      }
    }
  }

  const final = getExistingCount();
  console.log(`\nDone. Total: ${final}/${TARGET}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
