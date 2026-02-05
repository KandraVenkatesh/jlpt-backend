// backend/import_vocab.js
const fs = require('fs');
const path = require('path');

const SEED_DIR = path.join(__dirname, 'seed');
const N5 = path.join(SEED_DIR, 'n5.json');
const N4 = path.join(SEED_DIR, 'n4.json');
const N3 = path.join(SEED_DIR, 'n3.json');
const OUT = path.join(SEED_DIR, 'vocab_combined.json');

function readJson(p) {
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p,'utf8')); }
  catch(e){ console.error('JSON parse error', p, e); return []; }
}


function normalize(arr, level) {
  return arr.map((a, i) => ({
    id: null, // will be assigned later
    word: (a.word || a.kanji || '').toString(),
    reading: (a.reading || '').toString(),
    meaning_en: (a.meaning_en || a.meaning || '').toString(),
    // accept multiple possible example keys (exampleSentence, example_sentence, example)
    exampleSentence: (a.exampleSentence || a.example_sentence || a.example || '').toString(),
    jlptLevel: level
  }));
}


function main() {
  const n5 = readJson(N5);
  const n4 = readJson(N4);
  const n3 = readJson(N3); // currently not used
  const list = [
    ...normalize(n5, 'N5'),
    ...normalize(n4, 'N4'),
    ...normalize(n3, 'N3')
  ];

  // assign numeric ids (1..N)
  let next = 1;
  const withIds = list.map(item => ({ ...item, id: next++ }));

  fs.writeFileSync(OUT, JSON.stringify(withIds, null, 2), 'utf8');
  console.log(`Wrote ${withIds.length} items to ${OUT}`);
}

main();
