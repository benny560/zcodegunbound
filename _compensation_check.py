# -*- coding: utf-8 -*-
src = open(r"C:\Users\fanli\Documents\zcodegunbound\gunbound_calculator.html", encoding="utf-8").read()
lines = src.splitlines(keepends=True)
def cut(a, b): return "".join(lines[a-1:b])
js_consts = cut(1472, 1473) + "\n        const MAX_DISPLAY_POWER = 5;\n"
js_trico  = cut(1540, 1872)
js_excel  = cut(1879, 4150)
js_three  = cut(4153, 4204)

import json
real = json.load(open(r"C:\Users\fanli\Documents\zcodegunbound\_real.json", encoding="utf-8"))
def eff_angle(wa, side): return ((180-wa)%360+360)%360 if side=='left' else wa
cases = [{"i":i+1,"distance":r["distance"],"elevInput":r["elevation"] if r["elevation"] is not None else 0,
          "windAngle":r["windAngle"],"windStrength":r["windStrength"],
          "side":"right" if r["side"]=="右" else "left","n":r["n"],
          "realAngle":r["angle"],"realPower":r["power"],
          "effWindAngle":eff_angle(r["windAngle"],"right" if r["side"]=="右" else "left")} for i,r in enumerate(real)]
cases_js = json.dumps(cases, ensure_ascii=False)

wrapper = r"""
const document = new Proxy({}, { get:()=>({value:0,textContent:''}), set:()=>true });
const window = {};
const localStorage = { getItem:()=>null, setItem:()=>{} };
const navigator = {};
""" + js_consts + "\n" + js_trico + "\n" + js_excel + "\n" + js_three + r"""

const CASES = """ + cases_js + r""";

// 对每条数据，对比三种算法:
//  A. 最纯基础公式: Excel原公式 calc() (spinTable时间T + 固定g=0.835, 中心弹落点=目标)
//  B. rederived主路 (当前实际用的, 带75个补偿系数)
//  C. 实测值
// 以及 D. rederived里补偿项的量级
const rows=[];
for(const c of CASES){
  const sdParts=20, elev=c.elevInput*ELEVATION_PIXELS_PER_UNIT;
  const n=c.n;
  // A. 纯Excel原公式 (N1-N3用calc, 不走rederived)
  // calc() 对 N1-N3 返回 {angle,power,T}; 但 calcWithWind 优先走 rederived
  // 这里直接调底层 calc() 拿纯查表T+g=0.835 的结果
  let A=null;
  try {
    // calc 只接受无风, 距离需为正
    const conv=sdParts/8.0;
    const excelDist=Math.abs(c.distance)/conv;
    const excelElev=elev/100;
    A = EXCEL_TRICO.calc(sdParts, c.side, n, Math.abs(c.distance), excelElev);
    if(A) A = {angle:A.angle, power:+A.power.toFixed(3)};
  } catch(e){ A={err:String(e.message)}; }

  // B. rederived主路 (当前实际)
  let B=null;
  try{
    const r=EXCEL_TRICO.calcWithWind(sdParts,c.side,n,c.distance,elev,c.effWindAngle,c.windStrength);
    if(r) B={angle:r.angle, power:+r.power.toFixed(3),
             timeBias:r.phaseTimeBias, gBias:r.rederivedGravityBias, xABias:r.rederivedXABias,
             originFactor:r.rederivedOriginFactor, source:(r.source||'').slice(0,12)};
  }catch(e){ B={err:String(e.message)}; }

  rows.push({i:c.i, d:c.distance, e:c.elevInput, wa:c.windAngle, ws:c.windStrength,
             side:c.side, n:c.n, real:c.realAngle+'/'+c.realPower,
             A, B});
}
console.log(JSON.stringify(rows));
"""
open(r"C:\Users\fanli\Documents\zcodegunbound\_cmp.js","w",encoding="utf-8").write(wrapper)
print("ok")
