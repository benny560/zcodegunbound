// Real measured: 89.3deg / 3.98 at right dist=20 wa=338 ws=26 elev=0
// Reverse-engineer the TRUE flight time implied by this real shot,
// compare to: T_model_uncapped, T_capped(current), and the denom health.
const G=430,MASS=0.23,PF=0.004332712,sdParts=20,dist=20,elev=0,wa=338,ws=26;
const sd=Math.abs(dist);
const wr=wa*Math.PI/180, cosW=Math.cos(wr), sinW=Math.sin(wr);
const force=Math.max(0,ws-1);
const xA=cosW*force/MASS, effGrav=G-sinW*force/MASS, wy_acc=sinW*force/MASS;
const xDist=sd*(800/sdParts);

// Real shot
const realA=89.3, realP=3.98;
const V=realP/PF, aR=realA*Math.PI/180;
const vx=V*Math.cos(aR), vy=V*Math.sin(aR);
// x equation: vx*T + 0.5*xA*T^2 = xDist
const A=0.5*xA,B=vx,C=-xDist;
const disc=B*B-4*A*C;
const T_true=(-B+Math.sqrt(disc))/(2*A);
// verify y landing
const yL=vy*T_true-0.5*effGrav*T_true*T_true;

console.log('=== Real shot 89.3deg/3.98 ===');
console.log('V='+V.toFixed(1)+' vx='+vx.toFixed(2)+' vy='+vy.toFixed(2));
console.log('T_true (from x-eq) = '+T_true.toFixed(4)+' s');
console.log('y at T_true = '+yL.toFixed(1)+' (elev=0, should be ~0)  -> landing check');
console.log('');
console.log('=== Model comparison ===');
const fit={a:4.1243,b:-0.01039};
const T_base=fit.a+fit.b*sd;
const dT=0.0243-0.00066*wy_acc;
const T_uncapped=T_base+dT;
const T_cap=Math.sqrt(2*xDist/xA)*0.92;
const T_capped=Math.min(T_uncapped,T_cap);
console.log('T_base    = '+T_base.toFixed(4));
console.log('dT(wy)    = '+dT.toFixed(4)+'  (wy_acc='+wy_acc.toFixed(2)+', 下风->正->加T, 方向对)');
console.log('T_uncapped= '+T_uncapped.toFixed(4)+'   vs T_true '+T_true.toFixed(4)+'  err='+(T_uncapped-T_true).toFixed(4));
console.log('T_cap     = '+T_cap.toFixed(4)+'   (sqrt(2*xDist/xA)*0.92)');
console.log('T_capped  = '+T_capped.toFixed(4)+'   vs T_true '+T_true.toFixed(4)+'  err='+(T_capped-T_true).toFixed(4));
console.log('');
console.log('=== denom health (xDist - 0.5*xA*T^2) ===');
for(const [lbl,T] of [['T_true',T_true],['T_uncapped',T_uncapped],['T_capped',T_capped]]){
  const d=xDist-0.5*xA*T*T;
  const tanA=(elev+0.5*effGrav*T*T)/d;
  const ang=Math.atan(tanA)*180/Math.PI;
  const V=d/(Math.cos(ang*Math.PI/180)*T);
  console.log(`${lbl.padEnd(12)} T=${T.toFixed(3)} denom=${d.toFixed(1).padStart(6)} -> angle=${ang.toFixed(2)} power=${(V*PF).toFixed(3)}`);
}
console.log('');
console.log('=== Verdict ===');
console.log('T_true    = '+T_true.toFixed(3)+'  (REAL, from 89.3/3.98)');
console.log('T_uncapped= '+T_uncapped.toFixed(3)+'  err '+(T_uncapped-T_true>=0?'+':'')+(T_uncapped-T_true).toFixed(3)+'  <- closest, slightly high');
console.log('T_capped  = '+T_capped.toFixed(3)+'  err '+(T_capped-T_true>=0?'+':'')+(T_capped-T_true).toFixed(3)+'  <- CAP砍太多, 反向');
