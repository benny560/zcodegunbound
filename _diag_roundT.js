// 红框场景: 右 sd=5 wa=157 ws=18 elev=-1, N3 raw=76.92/3.5944 T=4.078
// 算 76°和77°的取整解, 看T_new偏离多少
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const sd=5,wa=157,ws=18,elev=-1;
const wr=wa*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
const force=Math.max(0,ws-1);
const xA=cosW*force/MASS,effGrav=G-sinW*force/MASS;
const T_raw=4.0776, rawA=76.9189, rawP=3.5944;
const rawV=rawP/PF;
const cosRaw=Math.cos(rawA*Math.PI/180), sinRaw=Math.sin(rawA*Math.PI/180);
const xTarget=rawV*cosRaw*T_raw+0.5*xA*T_raw*T_raw;
const yTarget=rawV*sinRaw*T_raw-0.5*effGrav*T_raw*T_raw;
console.log(`raw: A=${rawA} P=${rawP} T=${T_raw} xTarget=${xTarget.toFixed(1)} yTarget=${yTarget.toFixed(1)}`);
console.log(`  xA=${xA.toFixed(2)} effGrav=${effGrav.toFixed(1)}`);
console.log('');
for(const a of [76,77]){
  const tanT=Math.tan(a*Math.PI/180),cosT=Math.cos(a*Math.PI/180);
  const denom=effGrav+xA*tanT;
  const T2=2*(tanT*xTarget-yTarget)/denom;
  const T_new=Math.sqrt(T2);
  const V_new=(xTarget-0.5*xA*T_new*T_new)/(cosT*T_new);
  const p=V_new*PF;
  const dT=Math.abs(T_new-T_raw);
  console.log(`${a}°: T_new=${T_new.toFixed(4)} ΔT=${dT.toFixed(4)} (tol=0.12) power=${p.toFixed(4)} ${dT>0.12?'⚠超tol':''}`);
}
console.log('');
console.log('raw=76.92°, floor=76, ceil=77.');
console.log('看: 76°和77°的T_new和power, 是否一个跳变大.');
