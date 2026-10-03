# -*- coding: utf-8 -*-
src = open(r"C:\Users\fanli\Documents\zcodegunbound\gunbound_calculator.html", encoding="utf-8").read()
lines = src.splitlines(keepends=True)
def cut(a, b): return "".join(lines[a-1:b])
js_consts = cut(1472, 1473) + "\n        const MAX_DISPLAY_POWER = 5;\n"
js_trico  = cut(1540, 1872)
js_excel  = cut(1879, 4150)
js_three  = cut(4153, 4204)

wrapper = r"""
const document = new Proxy({}, { get:()=>({value:0,textContent:''}), set:()=>true });
const window = {};
const localStorage = { getItem:()=>null, setItem:()=>{} };
const navigator = {};
""" + js_consts + "\n" + js_trico + "\n" + js_excel + "\n" + js_three + r"""

// 案例1: dist=3.27 elev=0 风角170/风力24 右射
const sdParts=20, distance=3.27, elevInput=0, elevationInternal=0;
const windAngle=170, windStrength=24, side='right';
const targetX = distance * DISTANCE_PIXELS_PER_20SD;  // 130.8 px
const targetY = 0;
const HW=40, HH=33;  // hitbox

console.log('目标框: x∈[' + (targetX-HW/2).toFixed(1) + ',' + (targetX+HW/2).toFixed(1) + '] y∈[' + targetY + ',' + (targetY+HH) + ']');
console.log('目标框中心: (' + targetX + ', ' + (targetY+HH/2) + ')');

for (let spinN=1; spinN<=4; spinN++){
  let r=null;
  try { r = EXCEL_TRICO.calcWithWind(sdParts, side, spinN, distance, elevationInternal, windAngle, windStrength);}catch(e){}
  if(!r){ console.log('\nN'+spinN+': 无解'); continue; }
  const omega = TRICO_NEW.OMEGA_R, angMod=-1, R=TRICO_NEW.SPIN_RADIUS;
  const T=r.time;
  const turns = omega*T/(2*Math.PI);
  // 侧弹整条轨迹相对目标的最近距离
  let s1Min=1e9, s2Min=1e9, s1HitT=-1, s2HitT=-1;
  let landingSide1Dist=1e9, landingSide2Dist=1e9;
  const traj = r.trajectory;
  const last = traj.length-1;
  // 中心弹落点
  const cEnd = traj[last];
  for (let i=0;i<=last;i++){
    const p=traj[i]; const t=(i/last)*T;
    const rot=omega*t*angMod;
    const of=Math.min(2*t,1);
    const s1x=p.x+R*of*Math.cos(rot), s1y=p.y+R*of*Math.sin(rot);
    const s2x=p.x-R*of*Math.cos(rot), s2y=p.y-R*of*Math.sin(rot);
    const n1x=Math.max(targetX-HW/2,Math.min(s1x,targetX+HW/2));
    const n1y=Math.max(targetY,Math.min(s1y,targetY+HH));
    const d1=Math.hypot(s1x-n1x,s1y-n1y);
    const n2x=Math.max(targetX-HW/2,Math.min(s2x,targetX+HW/2));
    const n2y=Math.max(targetY,Math.min(s2y,targetY+HH));
    const d2=Math.hypot(s2x-n2x,s2y-n2y);
    if(d1<s1Min){s1Min=d1;s1HitT=t;}
    if(d2<s2Min){s2Min=d2;s2HitT=t;}
  }
  // 中心弹落点距离
  const cdx = Math.max(targetX-HW/2,Math.min(cEnd.x,targetX+HW/2));
  const cdy = Math.max(targetY,Math.min(cEnd.y,targetY+HH));
  const centerMiss = Math.hypot(cEnd.x-cdx, cEnd.y-cdy);

  console.log('\n=== N'+spinN+': '+r.angle+'°/'+(+r.power.toFixed(3))+'力  T='+ (+T.toFixed(3))+'  旋转≈'+turns.toFixed(3)+'圈 ===');
  console.log('  中心弹:  落点('+cEnd.x.toFixed(1)+','+cEnd.y.toFixed(1)+')  距目标框 '+centerMiss.toFixed(1)+'px' + (centerMiss<1?'  [中心弹直接命中]':''));
  console.log('  侧弹①: 最近距目标框 '+s1Min.toFixed(1)+'px @t='+s1HitT.toFixed(2)+'s' + (s1Min<1?'  [命中]':''));
  console.log('  侧弹②: 最近距目标框 '+s2Min.toFixed(1)+'px @t='+s2HitT.toFixed(2)+'s' + (s2Min<1?'  [命中]':''));
  // 旋转相位落地时
  const landRot = (omega*T*angMod*180/Math.PI);
  console.log('  落地相位: '+landRot.toFixed(0)+'° (mod360=' + (((landRot%360)+360)%360).toFixed(0)+')');
  console.log('  来源: '+(r.source||'').slice(0,16) + (r.n4PhaseBaselineValidated? ' [相位已验证]':''));
}

// 重点：N3 的角度为何是 74°，而不是无风的88°？
console.log('\n\n========== 为何 N3 角度从无风的88°降到74° ==========');
const m3 = EXCEL_TRICO.buildEmpiricalPhaseModel(sdParts,'right',3,distance);
console.log('无风锚点: angle='+m3.anchor.angle.toFixed(2)+'° power='+m3.anchor.power.toFixed(3)+' (来自识别表 dist桶3-4插值)');
console.log('无风目标时间 targetTime = '+m3.targetTime.toFixed(4));
console.log('无风重算角度(5舍6入) = '+EXCEL_TRICO.calcRederivedPhasePhysicsN123(sdParts,'right',3,distance,0,0,0).angle+'°');
// 有风时风对 xA/effGrav 的基础影响
const wp = EXCEL_TRICO.getEmpiricalWindParams(windAngle, windStrength, m3.formulaGPhase);
console.log('\n风的基础物理影响 (rederived模型在此基础上再加连续修正):');
console.log('  base xA      = cos(170)*24.8/124 = '+wp.xA.toFixed(6));
console.log('  base effGrav = formulaG('+m3.formulaGPhase.toFixed(4)+') - sin(170)*24.8/124 = '+wp.effGrav.toFixed(6));
console.log('  => 强逆风使 xA 为大负值(-0.197): 炮弹在空中被风往回(逆射击方向)推');
console.log('  => 上风分量使 effGrav 略降: 滞空更久');
// 关键: rederived 连续修正让 time/xA/effGrav 再调整, 最终 tanA 自然落到74°
const r3 = EXCEL_TRICO.calcRederivedPhasePhysicsN123(sdParts,'right',3,distance,0,windAngle,windStrength);
console.log('\nrederived 连续修正后的最终物理量:');
console.log('  targetTime = base '+m3.targetTime.toFixed(4)+' + bias '+r3.phaseTimeBias.toFixed(4)+' = '+r3.phaseTargetTime.toFixed(4));
console.log('  effGrav(最终) = '+r3.effectiveGravity.toFixed(6)+'  (gBias='+r3.rederivedGravityBias.toFixed(4)+')');
console.log('  xA(最终) = '+r3.xA.toFixed(6)+'  (xABias='+r3.rederivedXABias.toFixed(4)+')');
const tanA = (0 + 0.5*r3.effectiveGravity*r3.phaseTargetTime*r3.phaseTargetTime) / (m3.signedExcelDist - 0.5*r3.xA*r3.phaseTargetTime*r3.phaseTargetTime);
console.log('  tanA = (0.5*effGrav*T²) / (excelDist - 0.5*xA*T²) = '+tanA.toFixed(4)+' => angle='+ (Math.atan(tanA)*180/Math.PI).toFixed(2)+'°');
console.log('\  解释: 大逆风把 xA 拉成大负值, 分母 (excelDist - 0.5*xA*T²) 被放大,');
console.log('       要维持中心弹飞到仅1.308的excelDist, tanA必须大幅减小, 角度自然从88°降到74°。');
console.log('       力度则由 power=(excelDist-0.5*xA*T²)/(cosA*T) 给出, 3.762。');
"""

open(r"C:\Users\fanli\Documents\zcodegunbound\_case1b.js","w",encoding="utf-8").write(wrapper)
print("wrote _case1b.js")
