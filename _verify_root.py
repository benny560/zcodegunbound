# -*- coding: utf-8 -*-
# 根因验证：用 localGPhase(推导量) 替换固定 g=0.835 后，纯基础公式能算多准？
# 不碰任何补偿系数，只换重力这一个量
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

// 根因验证: 对每条数据, 纯用"抛物线公式 + 推导量localGPhase + 查表T", 不加任何补偿
// 看 g 从 0.835 换成 localGPhase 后偏差下降多少
const out=[];
for(const c of CASES){
  const sdParts=20, elev=c.elevInput*ELEVATION_PIXELS_PER_UNIT;
  const conv=sdParts/8.0;
  const excelDist=Math.abs(c.distance)/conv;
  const excelElev=elev/100;

  // 1) localGPhase (推导量): 从识别表锚点反推
  let localG=null, formulaG=null, tableT=null;
  try{
    const m=EXCEL_TRICO.buildEmpiricalPhaseModel(sdParts,c.side,c.n,c.distance);
    if(m){ localG=m.localGPhase; formulaG=m.formulaGPhase; tableT=m.targetTime; }
  }catch(e){}

  // 2) 查表T (无风基础时间)
  const tblName=EXCEL_TRICO.getTableName(c.side,c.n);
  let lookupT=null;
  try{ lookupT=EXCEL_TRICO.lookupTime(excelDist, tblName); }catch(e){}

  // 3) 用 不同g 算纯抛物线角度 (无风无补偿, 给定T)
  // tanA = (excelElev + g/2*T^2)/excelDist, 但这忽略风。纯基础公式就是这样
  function pureAngle(g, T){
    if(!g||!T||excelDist<=0) return null;
    const tanA=(excelElev + g/2*T*T)/excelDist;
    const raw=Math.atan(tanA)*180/Math.PI;
    return EXCEL_TRICO.roundAngleForTrico(raw);
  }
  // 力度: power = excelDist/(cosA*T)
  function purePower(angle, T){
    if(!angle||!T) return null;
    return excelDist/(Math.cos(angle*Math.PI/180)*T);
  }

  const a_const = pureAngle(0.835, lookupT);          // 固定g=0.835
  const a_local = pureAngle(localG, lookupT);         // 推导量localGPhase
  const a_formula = pureAngle(formulaG, lookupT);     // 公式拟合g
  const a_tableT_local = pureAngle(localG, tableT);   // localG + 表T(targetTime)

  out.push({i:c.i, n:c.n, real:c.realAngle,
    g835:a_const, gLocal:a_local, gFormula:a_formula, gLocalTblT:a_tableT_local,
    localG:localG, lookupT:lookupT, tableT:tableT});
}
console.log(JSON.stringify(out));
"""
open(r"C:\Users\fanli\Documents\zcodegunbound\_root.js","w",encoding="utf-8").write(wrapper)
print("ok")
