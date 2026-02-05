// backend/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Use the combined vocab file produced by import_vocab.js
const SEED_FILE = path.join(__dirname, 'seed', 'vocab_combined.json');

// load seed file (if file missing, return empty array)
function loadData() {
  try {
    if (!fs.existsSync(SEED_FILE)) return [];
    const raw = fs.readFileSync(SEED_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load seed file:', e);
    return [];
  }
}
function saveData(data) {
  // ensure parent folder exists
  const seedDir = path.join(__dirname, 'seed');
  if (!fs.existsSync(seedDir)) fs.mkdirSync(seedDir);
  fs.writeFileSync(SEED_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Ensure seed folder exists (file may be created by import script)
const seedDir = path.join(__dirname, 'seed');
if (!fs.existsSync(seedDir)) fs.mkdirSync(seedDir);

// If combined file doesn't exist create a tiny starter file so server still works
if (!fs.existsSync(SEED_FILE)) {
  const initial = [
    { id: 1, word: "食べる", reading: "たべる", meaning_en: "to eat", jlptLevel: "N5" },
    { id: 2, word: "飲む", reading: "のむ", meaning_en: "to drink", jlptLevel: "N5" },
    { id: 3, word: "日", reading: "ひ", meaning_en: "day / sun", jlptLevel: "N5" }
  ];
  saveData(initial);
}


app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));
app.get('/', (req, res) => {
  res.send('JLPT Backend API is running');
});

// GET list
// GET list with optional pagination: /api/vocab?level=N5&q=foo&page=1&limit=50
app.get('/api/vocab', (req, res) => {
  try {
    const all = loadData();
    const { q, level } = req.query;

    // basic filtering
    let result = all;
    if (level) result = result.filter(x => (x.jlptLevel || '').toUpperCase() === level.toUpperCase());

    if (q) {
      const r = q.toLowerCase();
      result = result.filter(x => (x.word + ' ' + (x.reading||'') + ' ' + (x.meaning_en||'')).toLowerCase().includes(r));
    }

    // pagination params (safe numeric parsing)
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(500, parseInt(req.query.limit || '50', 10))); // cap limit to 500
    const total = result.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const end = start + limit;
    const items = result.slice(start, end);

    // send metadata + items
    res.json({
      page,
      limit,
      total,
      totalPages,
      items
    });
  } catch (err) {
    console.error('/api/vocab error', err);
    res.status(500).json({ error: 'server error' });
  }
});


// POST add new vocab (very basic validation)
app.post('/api/vocab', (req, res) => {
  const { word, reading, romaji, meaning_en, jlptLevel } = req.body;

  if (!word || !meaning_en) return res.status(400).json({ error: 'word and meaning_en required' });

  const data = loadData();
  const nextId = data.length ? Math.max(...data.map(d=>d.id)) + 1 : 1;
  const item = { id: nextId, word, reading: reading || '',romaji: romaji || '', meaning_en, jlptLevel: jlptLevel || 'N5' };
  data.push(item);
  saveData(data);
  res.status(201).json(item);
});
// DELETE /api/vocab/:id
app.delete('/api/vocab/:id', (req, res) => {
  const id = Number(req.params.id);
  const data = loadData();
  const idx = data.findIndex(d => d.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const removed = data.splice(idx, 1)[0];
  saveData(data);
  res.json({ ok: true, removed });
});

// PUT /api/vocab/:id  -> update (partial allowed)
app.put('/api/vocab/:id', (req, res) => {
  const id = Number(req.params.id);
  const { word, reading, romaji, meaning_en, jlptLevel } = req.body;
  const data = loadData();
  const idx = data.findIndex(d => d.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const item = data[idx];
  if (word !== undefined) item.word = word;
  if (reading !== undefined) item.reading = reading;
  if (romaji !== undefined) item.romaji = romaji;    // <--- support romaji updates
  if (meaning_en !== undefined) item.meaning_en = meaning_en;
  if (jlptLevel !== undefined) item.jlptLevel = jlptLevel;
  data[idx] = item;
  saveData(data);
  res.json({ ok: true, item });
});

// GET /api/kanji?level=N5&q=search
// GET /api/kanji?level=N5&q=search&page=1&limit=50
app.get('/api/kanji', (req, res) => {
  try {
    const level = (req.query.level || '').toUpperCase();
    const q = (req.query.q || '').toLowerCase().trim();
    // load file
    const kfile = path.join(__dirname, 'seed', 'kanji_combined.json');
    if (!fs.existsSync(kfile)) return res.json({ page:1, limit:0, total:0, totalPages:1, items: [] });
    const all = JSON.parse(fs.readFileSync(kfile, 'utf8'));

    // filter by level and query
    let result = all;
    if (level) result = result.filter(x => (x.jlptLevel || '').toUpperCase() === level);
    if (q) {
      result = result.filter(x =>
        (x.kanji || '').includes(q) ||
        (x.onyomi || '').toLowerCase().includes(q) ||
        (x.kunyomi || '').toLowerCase().includes(q) ||
        (x.meaning_en || '').toLowerCase().includes(q) ||
        (Array.isArray(x.compounds) ? x.compounds.join(' ').toLowerCase().includes(q) : false)
      );
    }

    // pagination
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(500, parseInt(req.query.limit || '20', 10))); // default 20 per page for kanji
    const total = result.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = result.slice(start, start + limit);

    res.json({ page, limit, total, totalPages, items });
  } catch (err) {
    console.error('/api/kanji error', err);
    res.status(500).json({ error: 'server error' });
  }
});
// GET /api/grammar?level=N5&q=search&page=1&limit=20
app.get('/api/grammar', (req, res) => {
  try {
    console.log('/api/grammar called:', { level: req.query.level, q: req.query.q, page: req.query.page, limit: req.query.limit });
    const level = (req.query.level || '').toUpperCase();
    const q = (req.query.q || '').toLowerCase().trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(500, parseInt(req.query.limit || '20', 10)));

    const gfile = path.join(__dirname, 'seed', 'grammar_combined.json');
    if (!fs.existsSync(gfile)) return res.json({ page:1, limit, total:0, totalPages:1, items: [] });

    const all = JSON.parse(fs.readFileSync(gfile, 'utf8'));

    let result = all;
    if (level) result = result.filter(x => (x.jlptLevel || '').toUpperCase() === level);
    if (q) {
      result = result.filter(x =>
        (x.grammar || '').toLowerCase().includes(q) ||
        (x.meaning_en || '').toLowerCase().includes(q) ||
        (x.explanation || '').toLowerCase().includes(q) ||
        (x.example || '').toLowerCase().includes(q)
      );
    }

    const total = result.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = result.slice(start, start + limit);

    res.json({ page, limit, total, totalPages, items });
  } catch (err) {
    console.error('/api/grammar error', err);
    res.status(500).json({ error: 'server error' });
  }
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
