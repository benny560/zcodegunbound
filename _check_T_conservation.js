// 76°取整解: 落点守恒法算出 T_new=3.62(偏0.45s), 圈数会偏.
// 对比: 如果用T守恒法(保持T_raw=4.08不变, 只调power), 力度是多少? 圈数保持吗?
const G=430,MASS=0.23,PF=0.004332712;
const rawA=76.9189,rawP=3.5944,T_raw=4.0776;
const wa=157,ws=18;
const wr=wa*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
const force=Math.max(0,ws-1);
const xA=cosW*force/MASS,effGrav=G-sinW*force/MASS;
const rawV=rawP/PF;
// T守恒法: 保持T_raw不变, 在整数角度上, 用y方程求V(满足垂直落点), 再验x落点
// y(T)=V*sin(A)*T - 0.5*g*T^2 = yTarget
// yTarget = rawV*sinRaw*T_raw - 0.5*effGrav*T_raw^2
const sinRaw=Math.sin(rawA*Math.PI/180);
const yTarget=rawV*sinRaw*T_raw-0.5*effGrav*T_raw*T_raw;
console.log('=== T守恒法(保持T=4.078不变) ===');
for(const a of [76,77]){
  const sinA=Math.sin(a*Math.PI/180),cosA=Math.cos(a*Math.PI/180);
  // V*sinA*T - 0.5*g*T^2 = yTarget => V = (yTarget+0.5*g*T^2)/(sinA*T)
  const V=(yTarget+0.5*effGrav*T_raw*T_raw)/(sinA*T_raw);
  const p=V*PF;
  // 验证x落点
  const xLand=V*cosA*T_raw+0.5*xA*T_raw*T_raw;
  const xTarget=rawV*Math.cos(rawA*Math.PI/180)*T_raw+0.5*xA*T_raw*T_raw;
  console.log(`${a}°: power=${p.toFixed(4)} T=${T_raw}(不变) xLand=${xLand.toFixed(1)}(目标${xTarget.toFixed(1)}) xErr=${(xLand-xTarget).toFixed(1)}`);
}
console.log('');
console.log('=== 落点守恒法(当前用的, T自适应) ===');
const cosRaw=Math.cos(rawA*Math.PI/180);
const xTarget=rawV*cosRaw*T_raw+0.5*xA*T_raw*T_raw;
for(const a of [76,77]){
  const tanT=Math.tan(a*Math.PI/180),cosT=Math.cos(a*Math.PI/180);
  const T2=2*(tanT*xTarget-yTarget)/(effGrav+xA*tanT);
  const T_new=Math.sqrt(T2);
  const V_new=(xTarget-0.5*xA*T_new*T_new)/(cosT*T_new);
  const p=V_new*PF;
  console.log(`${a}°: power=${p.toFixed(4)} T=${T_new.toFixed(4)}(变了${(T_new-T_raw).toFixed(3)}) 落点守恒`);
}
console.log('');
console.log('结论: 76°时落点守恒法T偏0.45s(圈数偏,三球脱靶).');
console.log('  T守恒法保持T但xErr偏大(落点偏).');
console.log('  两者都妥协了一个维度. 但对Trico, 圈数(=T)比落点更关键(旋转命中).');
console.log('  => T偏过大时应优先T守恒, 或标注raw更佳.');
