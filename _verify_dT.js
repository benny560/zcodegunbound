// 用全量v1实测数据反推真实T_true, 然后拟合 T_true vs (sd, wx, wy)
// 看 T 到底响应哪些变量, dT该不该包含xA项
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;

const samples=[]; // {n, side, sd, wx, wy, ws, T_true}
for(const d of data){
  if(d.distance<0) continue; // 背射另算
  const dir=d.side==='右'?'right':'left';
  const wa=effWa(d.side,d.windAngle);
  const wr=wa*Math.PI/180;
  const wx=Math.cos(wr)*(d.windStrength||0), wy=Math.sin(wr)*(d.windStrength||0);
  const force=Math.max(0,(d.windStrength||0)-1);
  const xA=Math.cos(wr)*force/MASS;
  const wy_acc=Math.sin(wr)*force/MASS;
  const effGrav=G-wy_acc;
  // 反推真实T (y方程: 落地高度=elev)
  const V=d.power/PF, aR=d.angle*Math.PI/180;
  const vy=V*Math.sin(aR), vx=V*Math.cos(aR);
  const elevPx=(d.elevation||0)*EP;
  const disc=vy*vy-2*effGrav*elevPx;
  if(disc<0) continue;
  const T=(vy+Math.sqrt(disc))/effGrav;
  samples.push({n:d.n,side:dir,sd:d.distance,wx,wy,ws:d.windStrength||0,xA,wy_acc,T_true:T,effGrav});
}
console.log(`反推成功 ${samples.length} 个样本`);

// 对每个N, 拟合 T_true = a + b*sd + c*wx + e*wy  (最小二乘)
function fitLin(rows, feats, target){
  // feats: array of feature functions; target: string
  const nfeat=feats.length;
  const X=rows.map(r=>feats.map(f=>f(r)));
  const y=rows.map(r=>r[target]);
  // normal equations
  const M=Array.from({length:nfeat},()=>Array(nfeat).fill(0));
  const V=Array(nfeat).fill(0);
  for(let i=0;i<rows.length;i++){
    for(let a=0;a<nfeat;a++){V[a]+=X[i][a]*y[i];
      for(let b=0;b<nfeat;b++)M[a][b]+=X[i][a]*X[i][b];}
  }
  // solve Gaussian
  for(let i=0;i<nfeat;i++){let p=i;for(let k=i+1;k<nfeat;k++)if(Math.abs(M[k][i])>Math.abs(M[p][i]))p=k;[M[i],M[p]]=[M[p],M[i]];[V[i],V[p]]=[V[p],V[i]];
    for(let k=i+1;k<nfeat;k++){const f=M[k][i]/M[i][i];for(let j=i;j<nfeat;j++)M[k][j]-=f*M[i][j];V[k]-=f*V[i];}}
  const coef=Array(nfeat).fill(0);
  for(let i=nfeat-1;i>=0;i--){let s=V[i];for(let j=i+1;j<nfeat;j++)s-=M[i][j]*coef[j];coef[i]=s/M[i][i];}
  // residual
  let mae=0;for(let i=0;i<rows.length;i++){let p=0;for(let a=0;a<nfeat;a++)p+=coef[a]*X[i][a];mae+=Math.abs(p-y[i]);}
  return {coef, mae:mae/rows.length};
}
for(const n of [1,2,3,4]){
  const sub=samples.filter(s=>s.n===n);
  if(sub.length<5) continue;
  // 模型1: a + b*sd (当前T_base)
  const m1=fitLin(sub,[r=>1,r=>r.sd],'T_true');
  // 模型2: a + b*sd + c*wy_acc (当前T_base+dT形式)
  const m2=fitLin(sub,[r=>1,r=>r.sd,r=>r.wy_acc],'T_true');
  // 模型3: a + b*sd + c*xA + e*wy_acc (加xA项)
  const m3=fitLin(sub,[r=>1,r=>r.sd,r=>r.xA,r=>r.wy_acc],'T_true');
  console.log(`\nN${n} (n=${sub.length}):`);
  console.log(`  T=a+b·sd:            a=${m1.coef[0].toFixed(3)} b=${m1.coef[1].toFixed(4)} MAE=${m1.mae.toFixed(4)}`);
  console.log(`  T=a+b·sd+c·wy_acc:   a=${m2.coef[0].toFixed(3)} b=${m2.coef[1].toFixed(4)} c=${m2.coef[2].toFixed(5)} MAE=${m2.mae.toFixed(4)}`);
  console.log(`  T=a+b·sd+c·xA+e·wy:  a=${m3.coef[0].toFixed(3)} b=${m3.coef[1].toFixed(4)} c=${m3.coef[2].toFixed(5)} e=${m3.coef[3].toFixed(5)} MAE=${m3.mae.toFixed(4)}`);
  console.log(`  => xA项系数=${m3.coef[2].toFixed(5)} ${Math.abs(m3.coef[2])>0.001?'(显著≠0, T响应xA)':'(≈0, T不响应xA)'}`);
}
