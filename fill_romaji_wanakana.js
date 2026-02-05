const fs = require('fs');
const path = require('path');
const wanakana = require('wanakana');

const FILE = path.join(__dirname, 'seed', 'vocab_combined.json');
if (!fs.existsSync(FILE)) { console.error('Missing',FILE); process.exit(1); }
const arr = JSON.parse(fs.readFileSync(FILE,'utf8'));
let changed = 0;
const out = arr.map(it => {
  if (!it.romaji || it.romaji === '') {
    const r = it.reading || '';
    const rom = wanakana.toRomaji(r);
    it.romaji = rom;
    changed++;
  }
  return it;
});
fs.writeFileSync(FILE, JSON.stringify(out,null,2),'utf8');
console.log('done, changed', changed);
