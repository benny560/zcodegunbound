// 定力4.0算角: 给定距离/风, 数值找高抛角度
const G=0.608, M=85, MC=0.005, IPS=0.4;
function mass(w){return M-MC*w*w;}
function wt(wd,w){const m=mass(w);return [Math.cos(wd*Math.PI/180)*w/m, G-Math.sin(wd*Math.PI/180)*w/m];}
function sim(power, ang, wa, ws, elev=0, dt=0.002, tmax=16){
  const m=mass(ws), war=wa*Math.PI/180;
  const xA=Math.cos(war)*ws/m, effGrav=G-Math.sin(war)*ws/m;
  let s=[0,elev,power*Math.cos(ang*Math.PI/180),power*Math.sin(ang*Math.PI/180)];
  const deriv=st=>[st[2],st[3],xA,-effGrav];
  let t=0,prevVx=s[2],back=false,maxX=0;
  for(let i=0;i<100000;i++){
    const k1=deriv(s);const s2=s.map((v,j)=>v+k1[j]*dt/2);const k2=deriv(s2);
    const s3=s.map((v,j)=>v+k2[j]*dt/2);const k3=deriv(s3);const s4=s.map((v,j)=>v+k3[j]*dt);
    const k4=deriv(s4);s=s.map((v,j)=>v+(k1[j]+2*k2[j]+2*k3[j]+k4[j])*dt/6);t+=dt;
    if(s[2]<0&&prevVx>=0)back=true;prevVx=s[2];if(s[0]>maxX)maxX=s[0];
    if(s[1]<0&&t>dt)break;if(t>tmax)break;
  }
  return {x:s[0]/IPS, back, t, maxX:s[0]/IPS};
}
// 固定力度找高抛角度(落点=targetSd)
function angleFor(power, wa, ws, targetSd){
  const target=targetSd*IPS;
  const step=0.2; const roots=[]; let prevA=5, prevD=sim(power,5,wa,ws).x*IPS-target;
  for(let a=5+step;a<=89.9;a+=step){
    const d=sim(power,a,wa,ws).x*IPS-target;
    if(prevD!==0&&prevD*d<0){
      let lo=prevA,hi=a,dLo=prevD;
      for(let it=0;it<50;it++){const mid=(lo+hi)/2;const dm=sim(power,mid,wa,ws).x*IPS-target;if(dLo*dm<=0)hi=mid;else{lo=mid;dLo=dm;}}
      const ra=(lo+hi)/2; const rf=sim(power,ra,wa,ws);
      if(Math.abs(rf.x-targetSd)<0.05) roots.push({a:ra,back:rf.back,t:rf.t});
    }
    prevA=a;prevD=d;
  }
  if(!roots.length) return null;
  const normal=roots.filter(r=>!r.back);
  const pool=normal.length?normal:roots;
  return pool.reduce((b,r)=>r.a>b.a?r:b,pool[0]);
}

const POWER=4.0;
console.log('═'.repeat(60));
console.log(`  定力 ${POWER} 算角 (Boomer, 高抛解)`);
console.log(`  物理: g=0.608, mass=85-0.005w², 4.0力=Vo`);
console.log('═'.repeat(60));

const scenarios = [
  {wa:0,   label:'无风对照'},
  {wa:135, label:'135°左上斜逆风(逆风+上风)'},
  {wa:180, label:'180°纯逆风(正左)'},
  {wa:225, label:'225°左下斜逆风(逆风+下风)'},
];
const ws=2;
console.log(`\n风力 ws=${ws}, mass=${mass(ws).toFixed(3)}\n`);
console.log('风向'.padEnd(28)+'│ 10sd'.padEnd(14)+'│ 20sd'.padEnd(14)+'│ 30sd');
console.log('─'.repeat(70));
for(const sc of scenarios){
  let row=sc.label.padEnd(26)+'│';
  for(const sd of [10,20,30]){
    const r=angleFor(POWER, sc.wa, ws, sd);
    if(r) row += ` ${r.a.toFixed(1)}°${r.back?'↺':''}`.padEnd(13)+'│';
    else row += ' 无解'.padEnd(13)+'│';
  }
  console.log(row);
}

console.log('\n─'.repeat(70));
console.log('详细(135°左上斜逆风 ws=2, 定力4.0):');
for(const sd of [10,20,30]){
  const r=angleFor(POWER,135,ws,sd);
  if(r){
    const check=sim(POWER,r.a,135,ws);
    console.log(`  ${sd}sd → ${r.a.toFixed(2)}° (取整${Math.round(r.a)}°), 飞行${r.t.toFixed(2)}s, 实落${check.x.toFixed(2)}sd ${r.back?'[回旋]':''}`);
  }
}

// 取整后重算(角化力反向: 整数角度配什么力)
console.log('\n取整解(整数角度 + 该角度下精确力度):');
function powerFor(ang,wa,ws,targetSd){
  const target=targetSd*IPS; let lo=0.1,hi=6;
  for(let it=0;it<60;it++){const mid=(lo+hi)/2;const x=sim(mid,ang,wa,ws).x*IPS;if(x<target)lo=mid;else hi=mid;}
  return (lo+hi)/2;
}
for(const sd of [10,20,30]){
  const r=angleFor(POWER,135,ws,sd);
  if(r){
    const ai=Math.round(r.a);
    // 定力4.0用整数角度会打偏, 算整数角度需要的精确力
    const pInt=powerFor(ai,135,ws,sd);
    const verify=sim(pInt,ai,135,ws);
    console.log(`  ${sd}sd → ${ai}° / ${pInt.toFixed(3)}力 (落${verify.x.toFixed(2)}sd)  [定力4.0对应小数角${r.a.toFixed(1)}°]`);
  }
}
