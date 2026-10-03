// 验证omega幂律模型: 用4个left标准点看omega*T/(2pi)是否=rotPi/2
const G=430,MASS=0.23,PF=0.004332712;
const omegaL = V => 0.687878 * Math.pow(V, 0.299291);
const tests=[
  {sd:10,ws:20,a:83.6,p:3.35},{sd:20,ws:20,a:76.6,p:3.38},
  {sd:30,ws:20,a:70,p:3.46},{sd:40,ws:20,a:63.5,p:3.59},
];
console.log('=== N4 left 4标准点: omega模型自洽检查 ===');
console.log('sd | V    | omega  | T     | turns | rotPi/2(期望)');
for(const t of tests){
  const force=Math.max(0,t.ws-1);
  const eg=G-Math.sin(90*Math.PI/180)*force/MASS;
  const V=t.p/PF, vy=V*Math.sin(t.a*Math.PI/180);
  const T=2*vy/eg;
  const om=omegaL(V);
  const turns=om*T/(2*Math.PI);
  const rotPi=7.1067-0.003430*t.sd;
  console.log(`${String(t.sd).padStart(3)} | ${V.toFixed(0)} | ${om.toFixed(4)} | ${T.toFixed(3)} | ${turns.toFixed(4)} | ${(rotPi/2).toFixed(4)} | 差${(turns-rotPi/2).toFixed(4)}`);
}
console.log('');
console.log('如果差≈0, omega模型+rotPi自洽.');
console.log('如果差大, omega或rotPi有问题.');
console.log('');
// 图片场景
console.log('=== 图片场景 sd=33 ws=12 P=3.81 ===');
const V=3.81/PF;
const force=Math.max(0,12-1);
const eg=G-Math.sin(90*Math.PI/180)*force/MASS;
const vy=V*Math.sin(70*Math.PI/180);
const T=2*vy/eg;
const om=omegaL(V);
const turns=om*T/(2*Math.PI);
const rotPi33=7.1067-0.003430*33;
console.log(`V=${V.toFixed(0)} omega=${om.toFixed(4)} T=${T.toFixed(3)} turns=${turns.toFixed(4)}`);
console.log(`rotPi(33)/2=${(rotPi33/2).toFixed(4)} 差=${(turns-rotPi33/2).toFixed(4)}`);
console.log('');
// 关键: 4标准点turns≈3.50, 图片场景turns=3.60. 差0.1.
// 但4标准点ws=20, 图片ws=12. 同sd(≈30-33)不同ws.
// ws影响eg->影响T->影响turns. 但rotPi应该不变.
// 如果omega模型准, 不同ws下算出turns应该都=rotPi/2.
// 但实际: ws=20时turns=3.50, ws=12时turns=3.60. 说明omega(V)在V不同时算出的turns不同.
// 即: omega(V)·T = rotPi·π 不自洽(随V变).
console.log('=== 核心矛盾 ===');
console.log('旋转约束 ω(V)·T = rotPi·π 要求: 给定sd, 不管ws/V多少, ω·T恒定.');
console.log('但实测: ws=20(V=798)时 ω·T=21.96, ws=12(V=879)时 ω·T=22.62. 不恒定!');
console.log('=> omega幂律模型 V^0.299 在V=798-879范围不够准, 或rotPi实际随V(ws)微变.');
