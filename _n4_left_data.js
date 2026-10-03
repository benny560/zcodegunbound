// N4 left 标准数据: wa=90 ws=20
// 反推T_true, xErrSD, rotPi, 看left规律
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const omegaL = V => 0.687878 * Math.pow(V, 0.299291);
const tests=[
  {sd:10,ws:20,a:83.6,p:3.35},{sd:20,ws:20,a:76.6,p:3.38},
  {sd:30,ws:20,a:70,p:3.46},{sd:40,ws:20,a:63.5,p:3.59},
];
console.log('=== N4 left 标准数据反推 (wa=90 ws=20) ===');
console.log('sd | 实测A/P | T_true | omega | turns | rotPi(=turns*2) | xLand | xErrSD');
const subs=[];
for(const t of tests){
  const force=Math.max(0,t.ws-1);
  const wya=Math.sin(90*Math.PI/180)*force/MASS, eg=G-wya;
  const V=t.p/PF, ar=t.a*Math.PI/180;
  const vx=V*Math.cos(ar), vy=V*Math.sin(ar);
  const T=2*vy/eg;
  const om=omegaL(V);
  const turns=om*T/(2*Math.PI);
  const rotPi=turns*2;
  const xLand=vx*T;
  const xDist=t.sd*40;
  const xErrSD=(xLand-xDist)/40;
  subs.push({sd:t.sd,T,turns,rotPi,xErrSD,angle:t.a});
  console.log(`${String(t.sd).padStart(3)} | ${t.a}/${t.p} | ${T.toFixed(3)} | ${om.toFixed(4)} | ${turns.toFixed(4)} | ${rotPi.toFixed(4)} | ${xLand.toFixed(0)} | ${(xErrSD>=0?'+':'')+xErrSD.toFixed(3)}`);
}
console.log('');
// 拟合 rotPi(sd)
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
const rpFit=fit(subs,[r=>1,r=>r.sd],'rotPi');
console.log(`rotPi(sd) 拟合: ${rpFit.c[0].toFixed(4)} + (${rpFit.c[1].toFixed(6)})·sd  MAE=${rpFit.mae.toFixed(5)}`);
// xErrSD vs angle
const xeFit=fit(subs,[r=>1,r=>r.angle],'xErrSD');
console.log(`xErrSD(angle) 拟合: ${xeFit.c[0].toFixed(4)} + (${xeFit.c[1].toFixed(5)})·angle  MAE=${xeFit.mae.toFixed(4)}`);
console.log('');
// 对比right
console.log('=== 对比 right(N4) ===');
console.log('right: rotPi≈6.906-0.0012sd, xErrSD=5.259-0.0508·angle (MAE=0.092)');
console.log(`left:  rotPi=${rpFit.c[0].toFixed(3)}${rpFit.c[1].toFixed(6)}sd, xErrSD=${xeFit.c[0].toFixed(3)}${xeFit.c[1].toFixed(5)}·angle (MAE=${xeFit.mae.toFixed(3)})`);
