const fs = require("fs");
const path = require("path");
const SEED_DIR = path.join(__dirname, "seed");
const F1 = path.join(SEED_DIR, "n5_kanji.json");
const F2 = path.join(SEED_DIR, "n4_kanji.json");
const F3 = path.join(SEED_DIR, "n3_kanji.json");
const OUT = path.join(SEED_DIR, "kanji_combined.json");
function readJson(p){ if (!fs.existsSync(p)) return []; try { return JSON.parse(fs.readFileSync(p,"utf8")); } catch(e){ console.error("parse error",p,e); return []; } }
function normalize(arr, level){
  return arr.map(a => ({
    id: null,
    kanji: (a.kanji || "").toString(),
    onyomi: (a.onyomi || "").toString(),
    kunyomi: (a.kunyomi || "").toString(),
    meaning_en: (a.meaning_en || a.meaning || "").toString(),
    jlptLevel: level,
    strokes: a.strokes || null,
    example: a.example || ""
  }));
}
function main(){
  const n5 = readJson(F1);
  const n4 = readJson(F2);
  const n3 = readJson(F3);
  const all = [...normalize(n5,"N5"), ...normalize(n4,"N4"),...normalize(n3,"N3")];
  let next = 1;
  const withIds = all.map(x => ({ ...x, id: next++ }));
  fs.writeFileSync(OUT, JSON.stringify(withIds, null, 2), "utf8");
  console.log("Wrote", withIds.length, "items to", OUT);
}
main();
