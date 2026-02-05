    // make_grammar_combined.js
const fs = require('fs');
const path = require('path');

const SEED = path.join(__dirname, 'seed');
const inputs = ['n5_grammar.json', 'n4_grammar.json','n3_grammar.json'].map(f => path.join(SEED, f)); // add other files as available
let combined = [];

inputs.forEach(f => {
  if (fs.existsSync(f)) {
    try {
      const arr = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (Array.isArray(arr)) combined = combined.concat(arr);
    } catch(e) {
      console.error('parse error', f, e.message);
    }
  }
});

const out = path.join(SEED, 'grammar_combined.json');
fs.writeFileSync(out, JSON.stringify(combined, null, 2), 'utf8');
console.log('Wrote', combined.length, 'items to', out);
