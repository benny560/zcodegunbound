// N3 xErrSD 更细致分析: 加sd项, 或看是否需要风项
const fs=require('fs');
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const rows=[];
for(const d of data){
  if(d.n!==3||d.distance<0)continue;
  const dir=d.side==='右'?'right':'left';
  const wa=effWa(d.side,d.windAngle);const r=wa*Math.PI/180;
  const force=Math.max(0,(d.windStrength||0)-1);
  const xA=Math.cos(r)*force/MASS, wya=Math.sin(r)*force/MASS, eg=G-wya;
  const V=d.power/PF, ar=d.angle*Math.PI/180;
  const vx=V*Math.cos(ar), vy=V*Math.sin(ar);
  const disc=vy*vy-2*eg*(d.elevation||0)*EP;
  if(disc<0)continue;
  const T=(vy+Math.sqrt(disc))/eg;
  const xLand=vx*T+0.5*xA*T*T;
  rows.push({side:dir,sd:d.distance,angle:d.angle,T,xErrSD:(xLand-d.distance*40)/40,wa_eff:wa,ws:d.windStrength||0,xA,wya,eg,elev:d.elevation||0});
}
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
// N3 全量(不分side), 加side哑变量
console.log('=== N3 xErrSD 多变量拟合 ===');
// 基线: angle only
const m0=fit(rows,[r=>1,r=>r.angle],'xErrSD');
console.log(`xErrSD ~ angle: [${m0.c.map(x=>x.toFixed(4))}] MAE=${m0.mae.toFixed(3)}`);
// +sd
const m1=fit(rows,[r=>1,r=>r.angle,r=>r.sd],'xErrSD');
console.log(`xErrSD ~ angle+sd: [${m1.c.map(x=>x.toFixed(4))}] MAE=${m1.mae.toFixed(3)}`);
// +side
const m2=fit(rows,[r=>1,r=>r.angle,r=>r.sd,r=>r.side==='left'?1:0],'xErrSD');
console.log(`xErrSD ~ angle+sd+side: [${m2.c.map(x=>x.toFixed(4))}] MAE=${m2.mae.toFixed(3)}`);
// +T
const m3=fit(rows,[r=>1,r=>r.angle,r=>r.T],'xErrSD');
console.log(`xErrSD ~ angle+T: [${m3.c.map(x=>x.toFixed(4))}] MAE=${m3.mae.toFixed(3)}`);
// angle + sd + side + angle·side
const m4=fit(rows,[r=>1,r=>r.angle,r=>r.sd,r=>r.side==='left'?1:0,r=>r.angle*(r.side==='left'?1:0)],'xErrSD');
console.log(`xErrSD ~ angle+sd+side+angle·side: [${m4.c.map(x=>x.toFixed(4))}] MAE=${m4.mae.toFixed(3)}`);
// 只看 N3 不分side, angle+sd+T
const m5=fit(rows,[r=>1,r=>r.angle,r=>r.sd,r=>r.T],'xErrSD');
console.log(`xErrSD ~ angle+sd+T: [${m5.c.map(x=>x.toFixed(4))}] MAE=${m5.mae.toFixed(3)}`);
