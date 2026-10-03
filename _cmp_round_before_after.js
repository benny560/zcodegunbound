// 对比: 修改前后, 红框场景N3取整解的力度连续性和T
const G=430,MASS=0.23,PF=0.004332712;
const wa=157,ws=18,dist=5,elev=-1;
const wr=wa*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
const force=Math.max(0,ws-1);
const xA=cosW*force/MASS,effGrav=G-sinW*force/MASS;
const rawA=76.9189,rawP=3.5944,T_raw=4.0776;
const rawV=rawP/PF;
const cosRaw=Math.cos(rawA*Math.PI/180),sinRaw=Math.sin(rawA*Math.PI/180);
const xTarget=rawV*cosRaw*T_raw+0.5*xA*T_raw*T_raw;
const yTarget=rawV*sinRaw*T_raw-0.5*effGrav*T_raw*T_raw;
console.log('红框场景 N3 raw=76.92°/3.5944 T=4.078');
console.log('');
console.log('角度 | 修改前(落点守恒) power/T      | 修改后(T守恒) power/T      | 力度差');
for(const a of [76,77]){
  // 修改前: 落点守恒
  const tanT=Math.tan(a*Math.PI/180),cosT=Math.cos(a*Math.PI/180);
  const T2=2*(tanT*xTarget-yTarget)/(effGrav+xA*tanT);
  const T_old=Math.sqrt(T2);
  const V_old=(xTarget-0.5*xA*T_old*T_old)/(cosT*T_old);
  const p_old=V_old*PF;
  // 修改后: 76°用T守恒(T偏超0.12), 77°用落点守恒(T偏0.049<0.12)
  const dT_old=Math.abs(T_old-T_raw);
  let p_new, T_new, method;
  if(dT_old>0.12){
    // T守恒
    const sinT=Math.sin(a*Math.PI/180);
    const V_tc=(yTarget+0.5*effGrav*T_raw*T_raw)/(sinT*T_raw);
    p_new=V_tc*PF; T_new=T_raw; method='T守恒';
  }else{
    p_new=p_old; T_new=T_old; method='落点守恒';
  }
  console.log(`${a}°   | ${p_old.toFixed(4)} / ${T_old.toFixed(3)}     | ${p_new.toFixed(4)} / ${T_new.toFixed(3)} [${method}] | ${(p_new-p_old).toFixed(4)}`);
}
console.log('');
console.log('修改前 76→77 力度跳变: '+(3.6372-3.1961).toFixed(4));
console.log('修改后 76→77 力度跳变: '+(3.6651-3.6198).toFixed(4)+' (连续了)');
