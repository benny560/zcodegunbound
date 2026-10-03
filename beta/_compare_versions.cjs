// Verify datasets + quantify 2.1.6 vs 2.2.3 differences (same inputs, left-attack mode).
const fs=require('fs'); const D='c:/Users/fanli/Documents/zcodegunbound/beta/';
function load(f){ const L=fs.readFileSync(D+f,'utf8').trim().split(/\r?\n/);
  const h=L[0].replace(/"/g,'').split(','); const ix={}; h.forEach((x,i)=>ix[x]=i); const m=new Map();
  for(let i=1;i<L.length;i++){ const c=L[i].replace(/"/g,'').split(',');
    const key=c[ix.dist]+'|'+c[ix.drop]+(ix.wind!==undefined?('|'+c[ix.wind]):'')+(ix.opt!==undefined?('|'+c[ix.opt]):'');
    const v={}; for(let n=1;n<=4;n++){ v['a'+n]=c[ix['a'+n]]; v['p'+n]=c[ix['p'+n]]; }
    m.set(key,v); }
  return m; }
const files=['_d_base_223R_clean.csv','_d_base_223L_clean.csv','_d_base_216L_clean.csv',
             '_d_wind_223R_clean.csv','_d_wind_223L_clean.csv','_d_wind_216L_clean.csv'];
console.log('=== dataset sizes ===');
const M={}; for(const f of files){ M[f]=load(f); console.log('  '+f.padEnd(30)+' cells='+M[f].size); }

function cmp(A,B,label){
  let n=0,both=0,onlyA=0,onlyB=0; const dA=[],dP=[];
  for(const [k,a] of A){ const b=B.get(k); if(!b) continue; n++;
    for(let i=1;i<=4;i++){
      const av=a['a'+i], bv=b['a'+i], ap=a['p'+i], bp=b['p'+i];
      const aHas=av!=='', bHas=bv!=='';
      if(aHas&&bHas){ both++; dA.push(Math.abs(+av-+bv)); dP.push(Math.abs(+ap-+bp)); }
      else if(aHas) onlyA++; else if(bHas) onlyB++;
    } }
  const st=a=>{ if(!a.length) return 'n/a'; a=a.slice().sort((x,y)=>x-y);
    const mean=a.reduce((s,v)=>s+v,0)/a.length; return `mean=${mean.toFixed(3)} med=${a[a.length>>1].toFixed(2)} p95=${a[Math.floor(a.length*0.95)].toFixed(2)} max=${a[a.length-1].toFixed(2)}`; };
  const exact=dA.filter(v=>v<1e-9).length;
  console.log(`\n=== ${label} ===`);
  console.log(`  matched cells=${n}  both-solved=${both}  only-first=${onlyA}  only-second=${onlyB}`);
  console.log(`  |Δangle| ${st(dA)}`);
  console.log(`  |Δpower| ${st(dP)}`);
  console.log(`  identical angles: ${exact}/${both} (${(exact/both*100).toFixed(1)}%)`);
}
// same inputs, same direction, different VERSION
cmp(M['_d_base_216L_clean.csv'], M['_d_base_223L_clean.csv'], '2.1.6 vs 2.2.3  (left-attack, no wind)');
cmp(M['_d_wind_216L_clean.csv'], M['_d_wind_223L_clean.csv'], '2.1.6 vs 2.2.3  (left-attack, wind grid)');
// same version, opposite direction -> is no-wind ballistics direction independent?
cmp(M['_d_base_223R_clean.csv'], M['_d_base_223L_clean.csv'], '2.2.3 right-attack vs left-attack (no wind)');
