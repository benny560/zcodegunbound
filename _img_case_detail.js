// 图片场景: 左4 sd=33 wa=90 ws=12 实测70/3.81
// 标准点: 左4 sd=30 wa=90 ws=20 实测70/3.46
// 同wa=90纯上风, 但ws不同(12 vs 20), sd不同(33 vs 30)
// 实测角度都是70°! 但力度3.81 vs 3.46差0.35
// 这说明: 同角度70°, ws=12需要更大力度(3.81>3.46), 因为风小球转得少?
const G=430,MASS=0.23,PF=0.004332712;
const omegaL = V => 0.687878 * Math.pow(V, 0.299291);
// 标准点 sd=30 ws=20 A=70 P=3.46
const t1={sd:30,ws:20,a:70,p:3.46};
const force1=Math.max(0,t1.ws-1);
const wya1=Math.sin(90*Math.PI/180)*force1/MASS, eg1=G-wya1;
const V1=t1.p/PF, vy1=V1*Math.sin(t1.a*Math.PI/180);
const T1=2*vy1/eg1;
const om1=omegaL(V1), turns1=om1*T1/(2*Math.PI);
console.log(`标准点 sd=30 ws=20 A=70 P=3.46:`);
console.log(`  eg=${eg1.toFixed(1)} T=${T1.toFixed(3)} omega=${om1.toFixed(4)} turns=${turns1.toFixed(4)}`);
// 图片场景 sd=33 ws=12 A=70 P=3.81
const t2={sd:33,ws:12,a:70,p:3.81};
const force2=Math.max(0,t2.ws-1);
const wya2=Math.sin(90*Math.PI/180)*force2/MASS, eg2=G-wya2;
const V2=t2.p/PF, vy2=V2*Math.sin(t2.a*Math.PI/180);
const T2=2*vy2/eg2;
const om2=omegaL(V2), turns2=om2*T2/(2*Math.PI);
console.log(`\n图片场景 sd=33 ws=12 A=70 P=3.81:`);
console.log(`  eg=${eg2.toFixed(1)} T=${T2.toFixed(3)} omega=${om2.toFixed(4)} turns=${turns2.toFixed(4)}`);
console.log('');
console.log(`两者都是A=70°, 但:`);
console.log(`  ws=20: eg=347, T=4.32, turns=${turns1.toFixed(3)}`);
console.log(`  ws=12: eg=385, T=4.03, turns=${turns2.toFixed(3)}`);
console.log(`  ws小->eg大(风托力小)->T小->turns小`);
console.log(`  但rotPi(sd=33)应该固定(只依赖sd).`);
console.log(`  sd=30 rotPi≈${(2*turns1).toFixed(3)}, sd=33 rotPi应该≈7.0`);
console.log(`  图片场景turns=${turns2.toFixed(3)} (rotPi=${(2*turns2).toFixed(3)})`);
console.log(`  如果rotPi(sd=33)应该=7.0, 那turns应该=3.5, 但实际${turns2.toFixed(3)}`);
console.log(`  差${(3.5-turns2).toFixed(3)}圈`);
console.log('');
// 关键: 图片场景实测turns和rotPi(sd)是否吻合?
const rotPi33=7.1067-0.003430*33;
console.log(`rotPi(sd=33) = ${rotPi33.toFixed(4)}, 期望turns = ${rotPi33/2}`);
console.log(`实测turns = ${turns2.toFixed(4)}`);
console.log(`差 = ${(rotPi33/2 - turns2).toFixed(4)}圈`);
console.log('');
// 如果用rotPi约束, 算出的T应该让turns=rotPi/2
// T_target = rotPi*π/omega(V)
// 但V取决于power, power是未知的(要求解的)
// 实测P=3.81时 turns=3.46, 但rotPi要求3.54
// 说明要么omega模型在V=879时不准, 要么rotPi(33)不准
