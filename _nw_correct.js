const fs = require('fs');
let src = fs.readFileSync('gunbound_calculator.html','utf8').split(/\r?\n/);
const cut = (a,b) => src.slice(a-1,b).join('\n');
const wrapper =
  'const document=new Proxy({},{get:()=>({value:0,textContent:""}),set:()=>true});'
+ 'const window={};const localStorage={getItem:()=>null,setItem:()=>{}};const navigator={};\n'
+ cut(1472,1473) + '\n        const MAX_DISPLAY_POWER = 5;\n'
+ cut(1540,1872) + '\n'
+ cut(1879,3968) + '\n';

const body = wrapper + `
const SDPARTS = 20;
const CONV = SDPARTS/8.0;  // 2.5
let out='';
// 用正确的UI距离 = sd*CONV. 求解器收到的distance是UI距离.
// 求解器内部: sd_solver=abs(distance), xDist=sd_solver*(800/SDPARTS)
// UI距离40 -> sd_solver=40 -> xDist=40*40=1600px
// 识别表sd=16 -> 期望命中点 = 16 * (800/20) = 640px?? 单位对不上
//
// 实际上 calcWithWind -> calcTimePhysicsSolver(sdParts, side, n, distance,...)
// distance来自getEffectiveDistance() = UI距离值
// 所以 求解器 sd=abs(UI距离). 但识别表sd=excelDist=UI距离/conv
// 即 求解器的sd 和 识别表的sd 差conv倍!
//
// 验证: 用UI距离=sd_table*CONV 喂求解器
out += '=== calcTimePhysicsSolver, distance=sd_table*CONV (正确UI距离) ===\\n';
for(const side of ['right','left']){
  for(const n of [1,2,3,4]){
    const tbl = EXCEL_TRICO.empiricalPhaseTables[side]?.[n];
    if(!tbl) continue;
    let maxDA=0,sumDA=0,cnt=0,nosolve=0;
    for(const [sd, tA, tP] of tbl){
      const distance = sd * CONV;  // 还原UI距离
      const res = EXCEL_TRICO.calcTimePhysicsSolver(SDPARTS, side, n, distance, 0, 0, 0);
      if(!res){ nosolve++; continue; }
      const dA = res.angle - tA;
      maxDA=Math.max(maxDA,Math.abs(dA)); sumDA+=Math.abs(dA); cnt++;
    }
    out += side+'N'+n+': 有解'+cnt+'/'+tbl.length+' 无解'+nosolve;
    if(cnt) out += ' 角偏差均'+(sumDA/cnt).toFixed(2)+'° 最大'+maxDA.toFixed(1)+'°';
    out += '\\n';
  }
}
out += '\\n=== calcWithWind (完整路径), distance=sd_table*CONV ===\\n';
for(const side of ['right','left']){
  for(const n of [1,2,3,4]){
    const tbl = EXCEL_TRICO.empiricalPhaseTables[side]?.[n];
    if(!tbl) continue;
    let maxDA=0,sumDA=0,cnt=0,nosolve=0;
    for(const [sd, tA, tP] of tbl){
      const distance = sd * CONV;
      const res = EXCEL_TRICO.calcWithWind(SDPARTS, side, n, distance, 0, 0, 0);
      if(!res){ nosolve++; continue; }
      const dA = res.angle - tA;
      maxDA=Math.max(maxDA,Math.abs(dA)); sumDA+=Math.abs(dA); cnt++;
    }
    out += side+'N'+n+': 有解'+cnt+'/'+tbl.length+' 无解'+nosolve;
    if(cnt) out += ' 角偏差均'+(sumDA/cnt).toFixed(2)+'° 最大'+maxDA.toFixed(1)+'°';
    out += '\\n';
  }
}
return out;
`;
console.log(new Function('fs', body)(fs));
