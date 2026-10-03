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

// 案例1: dist=3.27 elev=0 风角170/风力24 右射 N3
const sdParts=20, distance=3.27, elevationInternal=0;
const windAngle=170, windStrength=24, side='right';
const targetX = distance * DISTANCE_PIXELS_PER_20SD;  // 130.8
const targetY = elevationInternal;                     // 0
const HW=40, HH=33;

const r = EXCEL_TRICO.calcWithWind(sdParts, side, 3, distance, elevationInternal, windAngle, windStrength);
const T=r.time, omega=TRICO_NEW.OMEGA_R, angMod=-1, R=TRICO_NEW.SPIN_RADIUS;
const traj=r.trajectory, last=traj.length-1;

console.log('N3: '+r.angle+'°/'+r.power+'  T='+T);
console.log('中心弹轨迹: 起点('+traj[0].x.toFixed(2)+','+traj[0].y.toFixed(2)+') 终点('+traj[last].x.toFixed(2)+','+traj[last].y.toFixed(2)+')');
console.log('中心弹最高点 y = '+r.maxHeight);
console.log('注意: trajectory.y 是数学坐标(向上为正), 起点 y=0, 终点回到 y≈0');
console.log('');

// 关键: 中心弹终点是否=目标
const cEnd=traj[last];
console.log('中心弹终点 ('+cEnd.x.toFixed(2)+','+cEnd.y.toFixed(2)+') vs 目标 ('+targetX+','+targetY+')');
console.log('  => 中心弹水平落点 = 目标 x, 但中心弹只是"载体", 真正命中的是三颗子弹');

// 采样几个时刻三颗弹的绝对位置
console.log('\n--- 三颗弹绝对位置采样 (右射: angleModifier=-1, omega_R=0.5571) ---');
console.log('t       中心(cx,cy)          side1(+R*offset*cos)        side2(-R*offset*cos)');
const samples=[0,0.05,0.1,0.2,0.4,0.6,0.8,1.0];
for (const frac of samples){
  const i=Math.round(frac*last); const p=traj[i]; const t=(i/last)*T;
  const rot=omega*t*angMod; const of=Math.min(2*t,1);
  const s1x=p.x+R*of*Math.cos(rot), s1y=p.y+R*of*Math.sin(rot);
  const s2x=p.x-R*of*Math.cos(rot), s2y=p.y-R*of*Math.sin(rot);
  console.log((t).toFixed(2)+'s  ('+p.x.toFixed(0)+','+p.y.toFixed(0)+')'.padEnd(16)+
    ' ('+s1x.toFixed(0)+','+s1y.toFixed(0)+')'.padEnd(18)+' ('+s2x.toFixed(0)+','+s2y.toFixed(0)+')');
}

// 每颗弹何时进入目标框
console.log('\n--- 各弹进入目标框的时刻 (框 x['+(targetX-HW/2)+'..'+(targetX+HW/2)+'] y['+targetY+'..'+(targetY+HH)+']) ---');
function boxDist(x,y){
  const nx=Math.max(targetX-HW/2,Math.min(x,targetX+HW/2));
  const ny=Math.max(targetY,Math.min(y,targetY+HH));
  return Math.hypot(x-nx,y-ny);
}
let cEnter=null,s1Enter=null,s2Enter=null;
let cMin=1e9,s1Min=1e9,s2Min=1e9;
for(let i=0;i<=last;i++){
  const p=traj[i]; const t=(i/last)*T;
  const rot=omega*t*angMod; const of=Math.min(2*t,1);
  const s1x=p.x+R*of*Math.cos(rot), s1y=p.y+R*of*Math.sin(rot);
  const s2x=p.x-R*of*Math.cos(rot), s2y=p.y-R*of*Math.sin(rot);
  const dc=boxDist(p.x,p.y), d1=boxDist(s1x,s1y), d2=boxDist(s2x,s2y);
  if(dc<cMin)cMin=dc; if(d1<s1Min)s1Min=d1; if(d2<s2Min)s2Min=d2;
  if(cEnter===null&&dc<0.5)cEnter=t;
  if(s1Enter===null&&d1<0.5)s1Enter=t;
  if(s2Enter===null&&d2<0.5)s2Enter=t;
}
console.log('中心弹: 最近 '+cMin.toFixed(2)+'px'+(cEnter!==null?' 首次入框@'+cEnter.toFixed(2)+'s':' 未入框'));
console.log('side1:  最近 '+s1Min.toFixed(2)+'px'+(s1Enter!==null?' 首次入框@'+s1Enter.toFixed(2)+'s':' 未入框'));
console.log('side2:  最近 '+s2Min.toFixed(2)+'px'+(s2Enter!==null?' 首次入框@'+s2Enter.toFixed(2)+'s':' 未入框'));

// 旋转相位演化
console.log('\n--- 旋转相位 (右射顺时针, omega=0.5571 rad/s) ---');
for(const frac of samples){
  const t=frac*T; const rotDeg=(omega*t*angMod*180/Math.PI);
  const mod360=((rotDeg%360)+360)%360;
  console.log('t='+t.toFixed(2)+'s  旋转角='+rotDeg.toFixed(1)+'° (mod360='+mod360.toFixed(1)+'°)');
}
console.log('总旋转 = '+(omega*T).toFixed(3)+' rad = '+(omega*T*180/Math.PI).toFixed(1)+'° = '+(omega*T/(2*Math.PI)).toFixed(3)+'圈');
"""

open(r"C:\Users\fanli\Documents\zcodegunbound\_case1c.js","w",encoding="utf-8").write(wrapper)
print("ok")
