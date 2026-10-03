# -*- coding: utf-8 -*-
# 提取计算器核心 JS，并生成针对案例1的深度诊断脚本
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

// ============ 案例1 深度诊断 ============
// dist=3.27 elev=0 风角=170 风力=24 右射 实测 N3 = 74°/3.76226675881133
const sdParts = 20;
const distance = 3.27;
const elevInput = 0;
const elevationInternal = elevInput * ELEVATION_PIXELS_PER_UNIT;  // = 0
const windAngle = 170;        // 右射原样
const windStrength = 24;
const side = 'right';
const spinN = 3;

function dump(label, obj) {
    console.log('--- ' + label + ' ---');
    if (obj == null) { console.log('  (null)'); return; }
    const keys = Object.keys(obj).filter(k => typeof obj[k] !== 'function' && !Array.isArray(obj[k]) || k==='trajectory');
    for (const k of keys) {
        const v = obj[k];
        if (typeof v === 'number') console.log('  ' + k + ' = ' + (+v.toFixed(6)));
        else if (typeof v === 'string' || typeof v === 'boolean') console.log('  ' + k + ' = ' + v);
        else if (k === 'trajectory') console.log('  trajectory: [' + v.length + ' pts]');
        else console.log('  ' + k + ' = ' + JSON.stringify(v));
    }
}

console.log('========== 案例1：N3 在 74°/3.762 下为何能命中 ==========');
console.log('输入: dist=' + distance + ' elev=' + elevInput + ' 风角=' + windAngle + ' 风力=' + windStrength + ' ' + side + ' N' + spinN);
console.log('elevationInternal = ' + elevInput + ' * (516/13) = ' + elevationInternal + ' px');
console.log('xDistance(像素) = dist * 40 = ' + (distance * DISTANCE_PIXELS_PER_20SD));

// 1. 风的分解
const wf = EXCEL_TRICO.lookupWind(windStrength);
const wr = windAngle * Math.PI / 180;
const windX = Math.cos(wr) * wf;
const windY = Math.sin(wr) * wf;
console.log('\n[1] 风的分解 (N1-N3 用 lookupWind 表 + /124 质量)');
console.log('  lookupWind(24) = ' + wf);
console.log('  cos(170°) = ' + Math.cos(wr).toFixed(4) + ', sin(170°) = ' + Math.sin(wr).toFixed(4));
console.log('  windX = ' + windX.toFixed(4) + '  (负=逆风，x轴朝射击方向)');
console.log('  windY = ' + windY.toFixed(4) + '  (正=上风，减小有效重力)');
console.log('  物理含义: 接近纯逆风(170°≈180°)的大风，水平方向强烈阻碍炮弹前进');

// 2. 识别表锚点 (无风基线)
const anchor = EXCEL_TRICO.getEmpiricalPhaseAnchor(side, spinN, distance);
dump('[2] N3 识别表锚点 (无风基线, dist=' + distance + ')', anchor);
console.log('  说明: 距离3.27落在 dist桶3(80°/1.62) 和桶... 之间，线性插值得到无风基线角/力');

// 3. 相位模型 (从锚点反推 localGPhase / formulaGPhase / targetTime)
const model = EXCEL_TRICO.buildEmpiricalPhaseModel(sdParts, side, spinN, distance);
dump('[3] buildEmpiricalPhaseModel', model);

// 4. 无风时的解 (对照基准)
const noWind = EXCEL_TRICO.calcRederivedPhasePhysicsN123(sdParts, side, spinN, distance, 0, 0, 0);
console.log('\n[4] 无风零落差时 N3 的解 (对照基准):');
console.log('  角度=' + noWind.angle + '°  力度=' + noWind.power + '  时间=' + noWind.time);
console.log('  => 无风时近距离 N3 本来就是高抛小力度，73°附近');

// 5. 有风时的完整 rederived 物理模型
const res = EXCEL_TRICO.calcRederivedPhasePhysicsN123(sdParts, side, spinN, distance, elevationInternal, windAngle, windStrength);
console.log('\n[5] 有风(170°/24)时的 rederived 相位物理解:');
dump('  最终结果', res);

// 6. 手动验证弹道方程：用最终 angle/power 反算中心弹落点
console.log('\n[6] 弹道方程验证：用最终 ' + res.angle + '°/' + res.power.toFixed(4) + ' 反算中心弹落点');
const aRad = res.angle * Math.PI / 180;
const cosA = Math.cos(aRad), sinA = Math.sin(aRad);
// 速度单位：power 是 excel 单位速度
const vx = res.power * cosA;
const vy = res.power * sinA;
console.log('  vx(excel单位) = ' + vx.toFixed(4) + ', vy = ' + vy.toFixed(4));
console.log('  effGrav = ' + res.effectiveGravity + ', xA = ' + res.xA);
// 飞行时间从结果取
const T = res.time;
console.log('  飞行时间 T = ' + T);
// excel 坐标系落点
const xLand = vx * T + 0.5 * res.xA * T * T;
const yLand = vy * T - 0.5 * res.effectiveGravity * T * T;
const conv = sdParts / 8.0;  // = 2.5
console.log('  excel落点 x = vx*T + 0.5*xA*T² = ' + xLand.toFixed(4));
console.log('  excel落点 y = vy*T - 0.5*effGrav*T² = ' + yLand.toFixed(4));
console.log('  目标 excelDist = |distance|/(20/8) = ' + (Math.abs(distance)/conv).toFixed(4) + ', excelElev = ' + (elevationInternal/100));
console.log('  => x误差=' + (xLand - Math.abs(distance)/conv).toFixed(4) + ', y误差=' + (yLand - elevationInternal/100).toFixed(4) + '  (应≈0)');

// 7. 三球相位闭合验证 (为什么N3能命中：侧弹旋转3圈)
console.log('\n[7] 三球相位闭合：为什么是 N3 (旋转约3圈) 而非其它');
const omega = TRICO_NEW.OMEGA_R;  // 右射 0.5571
const angleModifier = -1;  // 右射顺时针
const R = TRICO_NEW.SPIN_RADIUS;   // 35
const totalRot = omega * T * angleModifier;
const turns = Math.abs(totalRot) / (2 * Math.PI);
console.log('  omega_R = ' + omega + ' (右射旋转角速度)');
console.log('  总旋转角 = omega*T = ' + (omega*T).toFixed(4) + ' rad = ' + (omega*T*180/Math.PI).toFixed(2) + '°');
console.log('  旋转圈数 = ' + turns.toFixed(4) + ' 圈  (N3期望≈3圈，相位闭合点)');
console.log('  落地时侧弹相对中心偏移: dx=' + (R*Math.cos(totalRot)).toFixed(2) + ', dy=' + (R*Math.sin(totalRot)).toFixed(2));
console.log('  minHitDist(侧弹最近命中距离) = ' + res.minHitDist + ' px  (<=35半径即聚簇命中)');

// 8. 各 N 解横向对比
console.log('\n[8] 同一输入下 N1-N4 全部解 (印证多解=不同圈数)');
for (let n = 1; n <= 4; n++) {
    let r = null;
    try { r = EXCEL_TRICO.calcWithWind(sdParts, side, n, distance, elevationInternal, windAngle, windStrength); } catch(e){}
    if (r) {
        const om = side==='left'?TRICO_NEW.OMEGA_L:TRICO_NEW.OMEGA_R;
        const tr = (om * r.time) / (2*Math.PI);
        console.log('  N'+n+': ' + r.angle + '°/' + (+r.power.toFixed(3)) + '力  T=' + (+r.time.toFixed(3)) + '  旋转≈' + tr.toFixed(3) + '圈  minHit=' + r.minHitDist + 'px  [' + (r.source||'').slice(0,12) + ']');
    } else {
        console.log('  N'+n+': 无解');
    }
}
"""

open(r"C:\Users\fanli\Documents\zcodegunbound\_case1.js", "w", encoding="utf-8").write(wrapper)
print("wrote _case1.js")
