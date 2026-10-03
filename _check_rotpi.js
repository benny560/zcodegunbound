// 从实测反推真实turns, 对比rot/pi多项式
const G=430,MASS=0.23,PF=0.004332712;
const omegaRight = V => 0.023623 * Math.pow(V, 0.764315);
const tests=[
  {sd:10,ws:20,a:84.4,p:3.86},{sd:20,ws:20,a:79.3,p:3.88},
  {sd:30,ws:20,a:73.9,p:3.93},{sd:40,ws:21,a:68.4,p:3.97},
];
// rot/pi多项式 right N4
const rotPi = sd => 7.9144 - 0.01168*sd + 0.0001761*sd*sd;
console.log('=== 实测反推turns vs rot/pi多项式 ===');
console.log('sd | 实测A/P | T_true | omega(V) | turns_true | rotPi(sd) | rotPi/2(应=turns)');
for(const t of tests){
  const force=Math.max(0,t.ws-1);
  const wya=Math.sin(90*Math.PI/180)*force/MASS, eg=G-wya;
  const V=t.p/PF, vy=V*Math.sin(t.a*Math.PI/180);
  const T=2*vy/eg;
  const om=omegaRight(V);
  const turns=om*T/(2*Math.PI);
  const rp=rotPi(t.sd);
  console.log(`${String(t.sd).padStart(3)} | ${t.a}/${t.p} | ${T.toFixed(3)} | ${om.toFixed(4)} | ${turns.toFixed(4)} | ${rp.toFixed(4)} | ${(rp/2).toFixed(4)}`);
}
console.log('');
console.log('如果rotPi/2 ≈ turns_true, 多项式正确.');
console.log('如果差很多, 多项式需要重拟合.');
