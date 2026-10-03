// view dumped sheet as grid: node _xlsm_view.cjs <sheet.json> [rowStart rowEnd] [--f]
const fs = require('fs');
const file = process.argv[2];
const r0 = +(process.argv[3] || 1), r1 = +(process.argv[4] || 60);
const showF = process.argv.includes('--f');
const cells = JSON.parse(fs.readFileSync(file, 'utf8'));
function cn(c) { let s = ''; while (c > 0) { s = String.fromCharCode(65 + (c - 1) % 26) + s; c = Math.floor((c - 1) / 26); } return s; }
for (let r = r0; r <= r1; r++) {
  if (!cells[r]) continue;
  const parts = [];
  for (const c of Object.keys(cells[r]).map(Number).sort((a, b) => a - b)) {
    const cell = cells[r][c];
    let s = cell.v === undefined ? '' : String(cell.v);
    if (typeof s === 'string' && s.length > 22) s = s.slice(0, 22) + '…';
    if (showF && cell.f) s += `{=${cell.f.slice(0, 40)}}`;
    if (s) parts.push(`${cn(c)}:${s}`);
  }
  if (parts.length) console.log(`r${r}\t` + parts.join(' | '));
}
