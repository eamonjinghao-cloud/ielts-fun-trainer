const fs = require('fs');
const content = fs.readFileSync('src/lib/questions.ts', 'utf8');

// Find the VOCABULARY_QUESTIONS section
const start = content.indexOf('export const VOCABULARY_QUESTIONS');
const end = content.indexOf('export const SPEAKING_QUESTIONS');
const section = content.slice(start, end);

// Check brace balance
let depth = 0;
let inString = false;
let stringChar = '';
for (let i = 0; i < section.length; i++) {
  const ch = section[i];

  if (inString) {
    if (ch === stringChar && section[i - 1] !== '\\') {
      inString = false;
    }
    continue;
  }

  if (ch === "'" || ch === '"') {
    inString = true;
    stringChar = ch;
    continue;
  }

  if (ch === '{') depth++;
  if (ch === '}') {
    depth--;
    if (depth < 0) {
      const lines = section.slice(0, i).split('\n');
      console.log('ERROR: Unmatched } at line', lines.length);
      console.log(section.slice(Math.max(0, i - 80), i + 30));
      process.exit(1);
    }
  }
}

if (depth !== 0) {
  console.log('ERROR: Unmatched { at end. Depth:', depth);
  // Show last few lines
  const lines = section.split('\n');
  console.log(lines.slice(-5).join('\n'));
} else {
  console.log('Brace balance OK');
}

// Also check for common issues: duplicate IDs
const ids = content.match(/id: 'vg(\d+)'/g);
if (ids) {
  const idNums = ids.map(i => parseInt(i.match(/\d+/)[0]));
  const seen = {};
  const dupes = [];
  for (const n of idNums) {
    if (seen[n]) dupes.push(n);
    seen[n] = true;
  }
  if (dupes.length > 0) {
    console.log('Duplicate IDs found:', dupes.slice(0, 10));
  } else {
    console.log('No duplicate IDs');
  }
  console.log('Total unique IDs:', Object.keys(seen).length);
}
