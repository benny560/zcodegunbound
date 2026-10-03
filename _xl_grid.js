// 从 gunboundexcel/boomer revolution.xlsm 解包目录提取 sheet 网格
// 用法: node _xl_grid.js [--f] SheetName [SheetName2 ...]
//   --f  同时打印公式
const fs = require('fs');
const path = require('path');
const X = path.join(__dirname, '_xl_tmp', 'x');

const argv = process.argv.slice(2);
const WITH_F = argv.includes('--f');
const WANT = argv.filter(a => a !== '--f');

const wb = fs.readFileSync(path.join(X, 'xl/workbook.xml'), 'utf-8');
const rels = fs.readFileSync(path.join(X, 'xl/_rels/workbook.xml.rels'), 'utf-8');
const relMap = {};
for (const m of rels.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*>/g)) {
  relMap[m[1]] = m[2].replace(/^\/?xl\//, '').replace(/^\//, '');
}
const sheets = [];
for (const m of wb.matchAll(/<sheet[^>]*name="([^"]*)"[^>]*r:id="([^"]+)"[^>]*>/g)) {
  sheets.push({ name: m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'), target: relMap[m[2]] });
}
const ssXml = fs.readFileSync(path.join(X, 'xl/sharedStrings.xml'), 'utf-8');
const shared = [];
for (const m of ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
  shared.push([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join('')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"'));
}
const unesc = (s) => s === undefined ? s : s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function dumpSheet(s) {
  const p = path.join(X, 'xl', s.target);
  if (!fs.existsSync(p)) { console.log(`  !! 缺失 ${s.target}`); return; }
  const xml = fs.readFileSync(p, 'utf-8');
  console.log('\n' + '='.repeat(100));
  console.log(`SHEET "${s.name}"  (${s.target})`);
  console.log('='.repeat(100));
  let rows = 0;
  for (const rm of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNum = +rm[1];
    const out = [];
    for (const cm of rm[2].matchAll(/<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const col = cm[1], attrs = cm[3] || '', body = cm[4] || '';
      const t = /t="([^"]+)"/.exec(attrs)?.[1];
      const fm = /<f[^>]*>([\s\S]*?)<\/f>/.exec(body)?.[1];
      const vm = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let val = vm;
      if (t === 's' && vm !== undefined) val = shared[+vm];
      else if (t === 'inlineStr') val = unesc(/<t[^>]*>([\s\S]*?)<\/t>/.exec(body)?.[1]);
      val = unesc(val);
      if (fm === undefined && (val === undefined || val === '')) continue;
      let cell = `${col}${rowNum}=`;
      if (WITH_F && fm !== undefined) cell += `{${unesc(fm)}}`;
      if (val !== undefined && val !== '') cell += `[${val}]`;
      else if (fm !== undefined) cell += '[<空>]';
      out.push(cell);
    }
    if (out.length) { console.log(` r${String(rowNum).padStart(3)}: ` + out.join('  ')); rows++; }
  }
  console.log(`  --- 共 ${rows} 行有内容 ---`);
}

for (const s of sheets) {
  if (WANT.length && !WANT.some(w => s.name.toLowerCase() === w.toLowerCase())) continue;
  dumpSheet(s);
}
if (WANT.length) {
  const found = sheets.filter(s => WANT.some(w => s.name.toLowerCase() === w.toLowerCase())).map(s => s.name);
  console.log('\n命中 sheet: ' + JSON.stringify(found));
}
