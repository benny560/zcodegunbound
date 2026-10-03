# -*- coding: utf-8 -*-
# 新根因假设: 纯公式忽略了风(xA)。验证"加上风后纯公式能算多准"
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
// 验证: 完整物理公式(含风xA/effGrav) 但用固定常数g和查表T, 零补偿
// 关键公式(给定T求角): tanA = (elev + 0.5*effGrav*T^2) / (dist - 0.5*xA*T^2)
// 这是 calcXlsxPhysicalGivenTime 用的公式, 但它用的 g=430/mass=0.23
// 这里测试用 Trico 的风参数(lookupWind/124) + 固定g=0.835 + 查表T
const out=[];
for(const c of CASES){
  const sdParts=20, elev=c.elevInput*ELEVATION_PIXELS_PER_UNIT;
  const conv=sdParts/8.0;
  const signedExcelDist=c.distance/conv;
  const excelElev=elev/100;

  // 风参数 (N1-N3 用 lookupWind/124)
  const wf=EXCEL_TRICO.lookupWind(Math.max(0,c.windStrength||0));
  const wr=c.effWindAngle*Math.PI/180;
  const windX=Math.cos(wr)*wf, windY=Math.sin(wr)*wf;
  const mass=124;

  // 查表T
  const tblName=EXCEL_TRICO.getTableName(c.side,c.n);
  let T=null;
  try{ T=EXCEL_TRICO.lookupTime(Math.abs(c.distance)/conv, tblName); }catch(e){}

  const out_rec={i:c.i, n:c.n, real:c.realAngle, ws:c.windStrength, T};

  // 方案A: 无风纯公式 (现状基础)
  // 方案B: 加风, g=0.835固定, T查表
  // 方案C: 加风, g=localGPhase, T查表
  let localG=null;
  try{ const m=EXCEL_TRICO.buildEmpiricalPhaseModel(sdParts,c.side,c.n,c.distance); if(m) localG=m.localGPhase; }catch(e){}

  function solve(g, withWind){
    if(!T||!g) return null;
    const xA = withWind ? windX/mass : 0;
    const effGrav = withWind ? (g - windY/mass) : g;
    const denom = signedExcelDist - 0.5*xA*T*T;
    if(denom<=0) return null;
    const tanA=(excelElev + 0.5*effGrav*T*T)/denom;
    const raw=Math.atan(tanA)*180/Math.PI;
    if(raw<1||raw>89) return null;
    return EXCEL_TRICO.roundAngleForTrico(raw);
  }
  out_rec.A_nowind=solve(0.835, false);    // 现状纯基础(无风)
  out_rec.B_wind835=solve(0.835, true);    // 加风g=0.835
  out_rec.C_windLocal=solve(localG, true); // 加风g=localG
  out.push(out_rec);
}
console.log(JSON.stringify(out));
"""
open(r"C:\Users\fanli\Documents\zcodegunbound\_wind.js","w",encoding="utf-8").write(wrapper)
print("ok")
