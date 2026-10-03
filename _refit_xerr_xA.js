// 重新拟合 xErrSD = c0 + c1·angle + c2·xA, 分left/right
// 用标准点(wa=90, xA=0) + 旧样本(wa≠90, xA≠0)
const fs=require('fs');
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
function fit(rows,feats,target){
  const nf=feats.length,X=rows.map(r=>feats.map(f=>f(r))),y=rows.map(r=>r[target]);
  const M=Array.from({length:nf},()=>Array(nf).fill(0)),V=Array(nf).fill(0);
  for(let i=0;i<rows.length;i++)for(let a=0;a<nf;a++){V[a]+=X[i][a]*y[i];for(let b=0;b<nf;b++)M[a][b]+=X[i][a]*X[i][b];}
  for(let i=0;i<nf;i++){let p=i;for(let k=i+1;k<nf;k++)if(Math.abs(M[k][i])>Math.abs(M[p][i]))p=k;[M[i],M[p]]=[M[p],M[i]];[V[i],V[p]]=[V[p],V[i]];
    for(let k=i+1;k<nf;k++){const f=M[k][i]/M[i][i];for(let j=i;j<nf;j++)M[k][j]-=f*M[i][j];V[k]-=f*V[i];}}
  const c=Array(nf).fill(0);for(let i=nf-1;i>=0;i--){let s=V[i];for(let j=i+1;j<nf;j++)s-=M[i][j]*c[j];c[i]=s/M[i][i];}
  let mae=0;for(let i=0;i<rows.length;i++){let p=0;for(let a=0;a<nf;a++)p+=c[a]*X[i][a];mae+=Math.abs(p-y[i]);}
  return {c,mae:mae/rows.length};
}
// 收集N4样本(含标准点)
const stdLeft=[
  {sd:10,ws:20,a:83.6,p:3.35},{sd:20,ws:20,a:76.6,p:3.38},
  {sd:30,ws:20,a:70,p:3.46},{sd:40,ws:20,a:63.5,p:3.59},
];
const stdRight=[
  {sd:10,ws:20,a:84.4,p:3.86},{sd:20,ws:20,a:79.3,p:3.88},
  {sd:30,ws:20,a:73.9,p:3.93},{sd:40,ws:21,a:68.4,p:3.97},
];
function buildRows(stds, side){
  const rows=[];
  for(const t of stds){
    const wa=90,r=wa*Math.PI/180;
    const force=Math.max(0,t.ws-1);
    const xA=Math.cos(r)*force/MASS, wya=Math.sin(r)*force/MASS, eg=G-wya;
    const V=t.p/PF,ar=t.a*Math.PI/180,vx=V*Math.cos(ar),vy=V*Math.sin(ar);
    const T=2*vy/eg;
    rows.push({angle:t.a,T,xA,xErrSD:(vx*T+0.5*xA*T*T-t.sd*40)/40,std:true});
  }
  for(const d of data){
    if(d.n!==4||d.distance<0)continue;
    const dir=d.side==='右'?'right':'left';
    if(dir!==side)continue;
    const wa=effWa(d.side,d.windAngle);const r=wa*Math.PI/180;
    const force=Math.max(0,(d.windStrength||0)-1);
    const xA=Math.cos(r)*force/MASS, wya=Math.sin(r)*force/MASS, eg=G-wya;
    const V=d.power/PF,ar=d.angle*Math.PI/180,vx=V*Math.cos(ar),vy=V*Math.sin(ar);
    const disc=vy*vy-2*eg*(d.elevation||0)*EP;
    if(disc<0)continue;
    const T=(vy+Math.sqrt(disc))/eg;
    rows.push({angle:d.angle,T,xA,xErrSD:(vx*T+0.5*xA*T*T-d.distance*40)/40,std:false});
  }
  return rows;
}
for(const side of ['right','left']){
  const stds=side==='right'?stdRight:stdLeft;
  const rows=buildRows(stds,side);
  console.log(`\n=== N4 ${side} (n=${rows.length}, 含${rows.filter(r=>r.std).length}标准点) ===`);
  // angle only
  const m1=fit(rows,[r=>1,r=>r.angle],'xErrSD');
  console.log(`  angle only: [${m1.c.map(x=>x.toFixed(4))}] MAE=${m1.mae.toFixed(3)}`);
  // angle + xA
  const m2=fit(rows,[r=>1,r=>r.angle,r=>r.xA],'xErrSD');
  console.log(`  angle+xA: [${m2.c.map(x=>x.toFixed(4))}] MAE=${m2.mae.toFixed(3)}`);
  // angle + xA + T
  const m3=fit(rows,[r=>1,r=>r.angle,r=>r.xA,r=>r.T],'xErrSD');
  console.log(`  angle+xA+T: [${m3.c.map(x=>x.toFixed(4))}] MAE=${m3.mae.toFixed(3)}`);
}
