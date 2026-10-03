// 验证: _上矩阵大偏差是积分精度问题还是物理问题
// 对比 欧拉(DT=0.0015) vs RK4(DT=0.002) vs 欧拉(DT=0.0001)
const G = 0.608;

function simEuler(power, ang, wa, ws, DT, TMAX=14) {
  const Vo = power, rad = ang*Math.PI/180;
  const mass = 85 - ws*ws*0.005, war = wa*Math.PI/180, force = ws;
  const xA = Math.cos(war)*force/mass, effGrav = G - Math.sin(war)*force/mass;
  let vx = Vo*Math.cos(rad), vy = Vo*Math.sin(rad), x=0, y=0, t=0;
  for (let i=0;i<200000;i++){
    vx += xA*DT; vy -= effGrav*DT; x += vx*DT; y += vy*DT; t += DT;
    if (y<0 && t>DT) break; if (t>TMAX) break;
  }
  return x;
}

function simRK4(power, ang, wa, ws, DT, TMAX=14) {
  const Vo = power, rad = ang*Math.PI/180;
  const mass = 85 - ws*ws*0.005, war = wa*Math.PI/180, force = ws;
  const xA = Math.cos(war)*force/mass, effGrav = G - Math.sin(war)*force/mass;
  // 状态 [x,y,vx,vy], 导数 [vx,vy,xA,-effGrav]
  let s = [0,0,Vo*Math.cos(rad),Vo*Math.sin(rad)];
  let t=0;
  const deriv = st => [st[2],st[3],xA,-effGrav];
  for (let i=0;i<200000;i++){
    const k1=deriv(s);
    const s2=s.map((v,i)=>v+k1[i]*DT/2);
    const k2=deriv(s2);
    const s3=s.map((v,i)=>v+k2[i]*DT/2);
    const k3=deriv(s3);
    const s4=s.map((v,i)=>v+k3[i]*DT);
    const k4=deriv(s4);
    s = s.map((v,i)=>v+(k1[i]+2*k2[i]+2*k3[i]+k4[i])*DT/6);
    t += DT;
    if (s[1]<0 && t>DT) break; if (t>TMAX) break;
  }
  return s[0];
}

// 大偏差点: 81_上 ws5wa70 (表落点应=8, 欧拉算19.45sd偏差-0.55)
// 注意: 这是用表角度86.8+力度3.967 正向算
console.log('=== 81_上 ws=5 wa=70 表角度86.8 力度3.967 (目标落点8.0=20sd) ===');
for (const [name, fn, dt] of [['欧拉DT0.0015', simEuler, 0.0015], ['欧拉DT0.0001', simEuler, 0.0001], ['RK4 DT0.002', simRK4, 0.002], ['RK4 DT0.0005', simRK4, 0.0005]]) {
  const x = fn(3.967, 86.8, 70, 5, dt);
  console.log(`  ${name}: 落点=${x.toFixed(4)} = ${x/0.4}sd (偏差${(x/0.4-20).toFixed(3)}sd)`);
}

// 另一个大偏差: 50_上 ws=19 wa=45 (表落点=0.017sd?! 离谱)
// 看表值
const fs = require('fs');
const table = JSON.parse(fs.readFileSync('_boomer_table_v4.json','utf-8'));
const m = table.matrices['50_上'];
for (const e of m.entries) {
  if (e.ws===19 && e.wa===45) {
    console.log(`\n=== 50_上 ws=19 wa=45 表记录: ${JSON.stringify(e)} ===`);
    // 基础50/2.222, 表角度? 力度?
  }
}

// 检查 70_上 ws=20 wa=80 (err -1.69sd)
console.log('\n=== 70_上 ws=20 wa=80 ===');
for (const e of m.entries) {} // 不同矩阵
const m70 = table.matrices['70_上'];
for (const e of m70.entries) {
  if (e.ws===20 && e.wa===80) {
    console.log(`  表记录: ${JSON.stringify(e)}`);
    if (e.mode==='angle') {
      for (const [name, fn, dt] of [['欧拉0.0015',simEuler,0.0015],['RK4 0.002',simRK4,0.002],['RK4 0.0005',simRK4,0.0005]]) {
        const x = fn(2.751, e.angle, 80, 20, dt);
        console.log(`  ${name}: 落点=${(x/0.4).toFixed(3)}sd (偏差${(x/0.4-20).toFixed(3)})`);
      }
    } else {
      const p = 2.751 + e.dpower;
      for (const [name, fn, dt] of [['欧拉0.0015',simEuler,0.0015],['RK4 0.002',simRK4,0.002]]) {
        const x = fn(p, 90, 80, 20, dt);
        console.log(`  ${name}: 落点=${(x/0.4).toFixed(3)}sd (偏差${(x/0.4-20).toFixed(3)})`);
      }
    }
  }
}

// 关键: 看一个纯顺风无偏差点 vs 大偏差点 的飞行时间差异
console.log('\n=== 飞行时间对比 (积分误差随T累积) ===');
const cases = [
  {name:'81_上 ws1wa0 (小偏差)', p:3.967, a:82.1, wa:0, ws:1},
  {name:'81_上 ws5wa70 (大偏差)', p:3.967, a:86.8, wa:70, ws:5},
  {name:'81_上 ws9wa50 (大偏差)', p:3.967, a:89.8, wa:50, ws:9},
];
for (const c of cases) {
  const x1 = simEuler(c.p, c.a, c.wa, c.ws, 0.0015);
  const x2 = simRK4(c.p, c.a, c.wa, c.ws, 0.0005);
  // 算飞行时间
  let t=0; let vx=c.p*Math.cos(c.a*Math.PI/180),vy=c.p*Math.sin(c.a*Math.PI/180),y=0;
  const mass=85-c.ws*c.ws*0.005, xA=Math.cos(c.wa*Math.PI/180)*c.ws/mass, effGrav=G-Math.sin(c.wa*Math.PI/180)*c.ws/mass;
  for(let i=0;i<200000;i++){vx+=xA*0.0015;vy-=effGrav*0.0015;y+=vy*0.0015;t+=0.0015;if(y<0&&t>0.0015)break;}
  console.log(`  ${c.name}: T=${t.toFixed(2)}s 欧拉落${(x1/0.4).toFixed(3)} RK4落${(x2/0.4).toFixed(3)} 差${((x1-x2)/0.4).toFixed(3)}sd`);
}
