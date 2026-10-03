// Dump xlsm sheets: cell -> {v: value, f: formula}
// usage: node _xlsm_dump.cjs [sheetName ...]   (no args = all sheets -> _xlsm_sheets/)
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const FILE = path.join(__dirname, 'gunboundexcel', 'boomer revolution.xlsm');
const buf = fs.readFileSync(FILE);

let eocd = -1;
for (let i = buf.length - 22; i >= 0; i--) { if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; } }
const cdOff = buf.readUInt32LE(eocd + 16), n = buf.readUInt16LE(eocd + 10);
let p = cdOff; const entries = {};
for (let i = 0; i < n; i++) {
  const nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32);
  entries[buf.toString('utf8', p + 46, p + 46 + nl)] = buf.readUInt32LE(p + 42);
  p += 46 + nl + el + cl;
}
function readEntry(name) {
  const off = entries[name];
  const nl = buf.readUInt16LE(off + 26), el = buf.readUInt16LE(off + 28);
  const method = buf.readUInt16LE(off + 8), cs = buf.readUInt32LE(off + 18);
  const data = buf.slice(off + 30 + nl + el, off + 30 + nl + el + cs);
  return method === 8 ? zlib.inflateRawSync(data) : data;
}
const rels = readEntry('xl/_rels/workbook.xml.rels').toString('utf8');
const relMap = {};
for (const m of rels.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) relMap[m[1]] = m[2];
const wb = readEntry('xl/workbook.xml').toString('utf8');
const sheetByRid = {};
for (const m of wb.matchAll(/<sheet name="([^"]+)"[^>]*r:id="(rId\d+)"/g)) sheetByRid[m[2]] = m[1];
const ss = readEntry('xl/sharedStrings.xml').toString('utf8');
const strs = [...ss.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => m[1].replace(/<[^>]+>/g, ''));

function colRow(ref) {
  const m = ref.match(/([A-Z]+)(\d+)/);
  let col = 0; for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64;
  return [col, +m[2]];
}

function dumpSheet(rid) {
  const name = sheetByRid[rid];
  const f = 'xl/' + relMap[rid].replace(/^\//, '');
  const xml = readEntry(f).toString('utf8');
  const cells = {};
  for (const m of xml.matchAll(/<c r="([A-Z]+\d+)"([^>]*)>([\s\S]*?)<\/c>|<c r="([A-Z]+\d+)"([^>]*)\/>/g)) {
    const ref = m[1] || m[4];
    const attrs = m[2] || m[5] || '';
    const inner = m[3] || '';
    const t = (attrs.match(/t="(\w+)"/) || [])[1];
    const fm = inner.match(/<f[^>]*>([\s\S]*?)<\/f>/);
    const vm = inner.match(/<v>([\s\S]*?)<\/v>/);
    const ism = inner.match(/<is>([\s\S]*?)<\/is>/);
    let v = vm ? vm[1] : (ism ? ism[1].replace(/<[^>]+>/g, '') : undefined);
    if (t === 's' && v !== undefined) v = strs[+v];
    else if (t === 'str' && v !== undefined) v = v;
    else if (v !== undefined && !isNaN(+v)) v = +v;
    const [c, r] = colRow(ref);
    if (!cells[r]) cells[r] = {};
    cells[r][c] = { v, f: fm ? fm[1] : undefined };
  }
  return { name, cells };
}

const outDir = path.join(__dirname, '_xlsm_sheets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
const want = process.argv.slice(2);
for (const rid of Object.keys(sheetByRid)) {
  const name = sheetByRid[rid];
  if (want.length && !want.includes(name)) continue;
  const { cells } = dumpSheet(rid);
  const safe = name.replace(/[^\w()-]+/g, '_');
  fs.writeFileSync(path.join(outDir, safe + '.json'), JSON.stringify(cells));
  // readable text grid
  let txt = '';
  const rows = Object.keys(cells).map(Number).sort((a, b) => a - b);
  for (const r of rows) {
    for (const c of Object.keys(cells[r]).map(Number).sort((a, b) => a - b)) {
      const cell = cells[r][c];
      const colName = String.fromCharCode(64 + (c <= 26 ? c : 0)) || c;
      let cn = c; let s = '';
      while (cn > 0) { s = String.fromCharCode(65 + (cn - 1) % 26) + s; cn = Math.floor((cn - 1) / 26); }
      txt += `${s}${r}\t${cell.v === undefined ? '' : cell.v}${cell.f ? '   [=' + cell.f + ']' : ''}\n`;
    }
  }
  fs.writeFileSync(path.join(outDir, safe + '.txt'), txt);
  console.log(`${name}: ${rows.length} rows -> ${safe}.txt`);
}
