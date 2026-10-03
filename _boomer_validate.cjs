// 最终验证：用数值积分(RK4高精度)完整重建开炮表v4的角度调整，对照实测
// 开炮表v4 矩阵_81° 给的是：基础81°/力度3.967，在不同风(ws,wa)下要用的【实际角度】
// 例如 ws=1,wa=0°: "1.137 / 82.1" → 角度系数1.137, 实际角度82.1°
//   含义: 无风81°打20sd，1风正顺风(wa=0,吹右)时，要把角度抬到82.1°仍能命中
// 物理解释: 顺风把球吹远，所以要抬高角度(更陡)来抵消，仍打20sd
//
// 反过来验证: 固定力度3.967+目标20sd(excelDist8), 不同风下要多少角度才能落点=8?
// 用 RK4 数值积分 + 二分搜索角度

const G = 0.608;
const dt = 0.001; // 高精度

function rk4(power, ang, wa, ws) {
  const Vo = power;
  const rad = ang*Math.PI/180;
  const mass = 85 - ws*ws*0.005;
  const war = wa*Math.PI/180;
  const force = ws;
  const xA = Math.cos(war)*force/mass;
  const effGrav = G - Math.sin(war)*force/mass;
  // 状态 [x, y, vx, vy]
  let s = [0, 0, Vo*Math.cos(rad), Vo*Math.sin(rad)];
  let t = 0, maxX=0, wentBack=false;
  const deriv = (st) => [st[2], st[3], xA, -effGrav];
  let prevVx = s[2];
  for (let i=0; i<20000; i++) {
    const k1 = deriv(s);
    const s2 = s.map((v,i)=>v+k1[i]*dt/2);
    const k2 = deriv(s2);
    const s3 = s.map((v,i)=>v+k2[i]*dt/2);
    const k3 = deriv(s3);
    const s4 = s.map((v,i)=>v+k3[i]*dt);
    const k4 = deriv(s4);
    const ns = s.map((v,i)=>v+(k1[i]+2*k2[i]+2*k3[i]+k4[i])*dt/6);
    s = ns; t += dt;
    if (s[0]>maxX) maxX=s[0];
    if (s[2]<0 && prevVx>=0) wentBack=true;
    prevVx = s[2];
    if (s[1] < 0 && t > dt) break;
  }
  return {x:s[0], y:s[1], t, maxX, wentBack, vx:s[2]};
}

// 二分搜索角度: 固定力度power, 风wa/ws, 找使落点=8的角度
function angleForLanding(power, wa, ws, target=8, angLo=20, angHi=89.99) {
  // 单调性: 角度越高(接近90)，落点越近(对无风成立)。有风时可能不单调，先用二分
  let lo=angLo, hi=angHi;
  for (let i=0;i<50;i++){
    const mid=(lo+hi)/2;
    const r=rk4(power,mid,wa,ws);
    // 回旋的情况落点可能<0，需要特殊处理
    if (r.wentBack) {
      // 回旋了，角度要降低
      hi=mid;
    } else {
      if (r.x < target) lo=mid; else hi=mid;
    }
  }
  return (lo+hi)/2;
}

const tableV4 = {
  // ws: {wa: 实际角度}  来自矩阵_81°_上 (基础81°/力度3.967, 顺风wa0-90)
  1: {0:82.1, 10:82.2, 20:82.1, 30:82.1, 40:82.0, 45:81.9, 50:81.9, 60:81.7, 70:81.6, 80:81.4, 90:81.2},
  2: {0:83.3, 10:83.3, 20:83.3, 30:83.2, 40:83.0, 45:82.9, 50:82.8, 60:82.5, 70:82.1, 80:81.8, 90:81.4},
  3: {0:84.4, 10:84.5, 20:84.4, 30:84.3, 40:84.1, 45:83.9, 50:83.7, 60:83.3, 70:82.7, 80:82.2, 90:81.5},
  4: {0:85.5, 10:85.7, 20:85.6, 30:85.4, 40:85.1, 45:84.9, 50:84.6, 60:84.1, 70:83.3, 80:82.6, 90:81.7},
  5: {0:86.7, 10:86.8, 20:86.7, 30:86.6, 40:86.2, 45:85.9, 50:85.6, 60:84.9, 70:84.0, 80:83.0, 90:81.9},
};

console.log('最终验证: RK4数值积分 vs 开炮表v4 矩阵_81° (基础81°/力度3.967/目标20sd)');
console.log('理论: 固定力度3.967, 不同风下找使落点=8(excelDist)的角度\n');
console.log('ws  wa   表角度   计算角度  偏差');
let totalErr=0, cnt=0;
for (const ws of [1,2,3,4,5]) {
  for (const wa of [0,20,40,60,80,90]) {
    const expected = tableV4[ws][wa];
    if (expected===undefined) continue;
    const calc = angleForLanding(3.967, wa, ws);
    const err = calc - expected;
    totalErr += Math.abs(err); cnt++;
    console.log(`${ws}   ${String(wa).padStart(2)}   ${expected.toFixed(1)}    ${calc.toFixed(2)}   ${err>=0?'+':''}${err.toFixed(2)}`);
  }
  console.log('');
}
console.log(`平均绝对偏差: ${(totalErr/cnt).toFixed(2)}° (${cnt}点)`);
console.log('\n若偏差<0.5° → Excel物理(g=0.608,mass=85)能完整重建Boomer弹道');
console.log('若偏差大 → 开炮表用了额外的经验修正项(角度系数不是纯物理)');
