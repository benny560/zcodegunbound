// 从原始 boomer revolution.xlsm 提取指定 sheet 的单元格公式/值
const fs = require('fs');
const path = require('path');
const X = 'C:/Users/fanli/Documents/zcodegunbound/_xl_tmp/x';

const wb = fs.readFileSync(path.join(X, 'xl/workbook.xml'), 'utf-8');
const rels = fs.readFileSync(path.join(X, 'xl/_rels/workbook.xml.rels'), 'utf-8');
const relMap = {};
for (const m of rels.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*>/g)) {
  relMap[m[1]] = m[2].replace(/^\/?xl\//, '').replace(/^\//, '');
}
const sheets = [];
for (const m of wb.matchAll(/<sheet[^>]*name="([^"]*)"[^>]*r:id="([^"]+)"[^>]*>/g)) {
  sheets.push({ name: m[1], target: relMap[m[2]] });
}
// 共享字符串
const ssXml = fs.readFileSync(path.join(X, 'xl/sharedStrings.xml'), 'utf-8');
const shared = [];
for (const m of ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
  const txt = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join('');
  shared.push(txt.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"'));
}
const colToNum = (c) => { let n = 0; for (const ch of c) n = n * 26 + (ch.charCodeAt(0) - 64); return n; };

const WANT = process.argv.slice(2);
for (const s of sheets) {
  if (WANT.length && !WANT.some(w => s.name.toLowerCase() === w.toLowerCase())) continue;
  console.log('\n' + '='.repeat(90));
  console.log(`SHEET: "${s.name}"  (${s.target})`);
  console.log('='.repeat(90));
  const p = path.join(X, 'xl', s.target);
  if (!fs.existsSync(p)) { console.log('  (文件缺失)'); continue; }
  const xml = fs.readFileSync(p, 'utf-8');
  for (const rm of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNum = rm[1];
    const cells = [];
    for (const cm of rm[2].matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g)) {
      const ref = cm[1] + cm[2], attrs = cm[3], body = cm[4];
      const t = /t="([^"]+)"/.exec(attrs)?.[1];
      const f = /<f[^>]*>([\s\S]*?)<\/f>/.exec(body)?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let disp = v;
      if (t === 's' && v !== undefined) disp = shared[+v];
      if (t === 'str') disp = v;
      if (f || disp !== undefined) cells.push(`${ref}=${f ? '{' + f.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>') + '}' : ''}${disp !== undefined && disp !== '' ? '[' + disp + ']' : ''}`);
    }
    if (cells.length) console.log(`  r${rowNum}: ` + cells.join('  '));
    if (rowNum > 60) { console.log('  ...(截断)'); break; }
  }
}
