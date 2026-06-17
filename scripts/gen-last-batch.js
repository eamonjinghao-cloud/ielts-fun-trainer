const fs = require('fs');

async function genLastBatch() {
  const resp = await fetch('https://apihub.agnes-ai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer sk-2ukp3glhBBRFHGF5VSlrU2dCjg1eTGghLPT7UFwMAZB6Xbo4'
    },
    body: JSON.stringify({
      model: 'agnes-1.5-flash',
      temperature: 0.8,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: 'Generate 30 C1-level IELTS vocabulary questions as JSON array. Format per item: {"chineseMeaning":"chinese meaning with pos marker","options":["correctWord","d1","d2","d3"],"correctAnswer":"correctWord","difficulty":"C1"}. Use words that have NOT already been used in previous batches. Only return the JSON array.' },
        { role: 'user', content: 'Generate 30 fresh advanced IELTS vocab questions' }
      ]
    })
  });

  const data = await resp.json();
  const text = data.choices[0].message.content;
  let json = text.trim();
  
  // strip markdown
  const mdMatch = json.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch) json = mdMatch[1].trim();
  
  // find array bounds
  const arrStart = json.indexOf('[');
  const arrEnd = json.lastIndexOf(']');
  if (arrStart >= 0 && arrEnd > arrStart) json = json.slice(arrStart, arrEnd + 1);
  
  const arr = JSON.parse(json);
  console.log(`Got ${arr.length} questions`);

  // Get existing IDs
  const content = fs.readFileSync('src/lib/questions.ts', 'utf8');
  const existingIds = new Set();
  for (const m of content.matchAll(/id: 'vg(\d+)'/g)) {
    existingIds.add(parseInt(m[1]));
  }
  const maxId = Math.max(...existingIds);
  console.log(`Max existing ID: ${maxId}`);

  // Build lines, skip duplicates
  let nextId = maxId + 1;
  const lines = [];
  for (const q of arr) {
    // skip if word already in vocabulary
    if (content.includes(`correctAnswer: '${q.correctAnswer}'`)) continue;
    const line = "  { id: 'vg" + nextId + "', chineseMeaning: '" + q.chineseMeaning + "', options: [" + q.options.map(o => "'" + o + "'").join(', ') + "], correctAnswer: '" + q.correctAnswer + "', difficulty: '" + (q.difficulty || 'C1') + "' },";
    lines.push(line);
    nextId++;
  }
  
  console.log(`After dedup: ${lines.length} new questions`);

  // Append to file
  let newContent = fs.readFileSync('src/lib/questions.ts', 'utf8');
  newContent = newContent.replace(
    /(\r?\n\];\r?\n\r?\nexport const SPEAKING_QUESTIONS)/,
    '\n' + lines.join('\n') + '\n];\n\nexport const SPEAKING_QUESTIONS'
  );
  fs.writeFileSync('src/lib/questions.ts', newContent, 'utf8');
  
  // Count final
  const final = fs.readFileSync('src/lib/questions.ts', 'utf8');
  const count = (final.match(/id: 'vg/g) || []).length;
  console.log(`Final vocab count: ${count}`);
}

genLastBatch().catch(e => { console.error(e.message); process.exit(1); });
