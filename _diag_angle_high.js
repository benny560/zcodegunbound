// 力度准但角度偏高0.5-1°. 用sd=10详细诊断.
// 实测: 84.4°/3.86, 算出: 84.95°/3.857
// 两者力度几乎一样(3.86 vs 3.857), 但角度差0.55°.
// 同样力度, 角度不同 => tanA公式算出的角度偏高.
const G=430,MASS=0.23,PF=0.004332712;
const sd=10,ws=20;
const force=Math.max(0,ws-1);
const wya=Math.sin(90*Math.PI/180)*force/MASS, eg=G-wya;
const xA=0;
const xDist=sd*40;
// 方向B在T收敛后, tanA = 0.5*eg*T²/(xDist-0.5*xA*T²)
// 实测T:
const Vr=3.86/PF, vyr=Vr*Math.sin(84.4*Math.PI/180);
const Tr=2*vyr/eg;
console.log(`实测: angle=84.4 V=${Vr.toFixed(1)} T=${Tr.toFixed(4)}`);
console.log(`  tanA(实测角度) = tan(84.4°) = ${Math.tan(84.4*Math.PI/180).toFixed(3)}`);
console.log(`  tanA(公式,用实测T) = 0.5*${eg.toFixed(1)}*${Tr.toFixed(3)}²/${xDist} = ${(0.5*eg*Tr*Tr/xDist).toFixed(3)}`);
console.log(`  atan(${(0.5*eg*Tr*Tr/xDist).toFixed(3)}) = ${(Math.atan(0.5*eg*Tr*Tr/xDist)*180/Math.PI).toFixed(2)}°`);
console.log('');
console.log('=> 用实测T代入tanA公式, 算出84.95°, 比实测84.4高0.55°');
console.log('   说明: 实测角度84.4时, tanA公式的预测是84.95, 公式系统性偏高.');
console.log('   这和"球飞过目标"是同一现象: 实测球xLand=444>xDist=400,');
console.log('   即实测时球用更低角度(84.4)就能达到需要的旋转相位.');
console.log('');
// 关键: 方向B里, T由旋转约束定, angle由tanA定.
// 如果tanA公式系统性偏高(因为假设xLand=xDist), 那angle必然偏高.
// 但方向B的denom = xDist - 0.5*xA*T², 这里xA=0, denom=xDist=400.
// 实测球xLand=444, 但公式用denom=400. 差44.
// 如果用denom=444(实测落点), angle会变多少?
const denomReal=444;
const tanA_real=0.5*eg*Tr*Tr/denomReal;
console.log(`如果denom用实测落点444: tanA=${tanA_real.toFixed(3)} angle=${(Math.atan(tanA_real)*180/Math.PI).toFixed(2)}° (实测84.4)`);
console.log('');
console.log('=== 根因确认 ===');
console.log('方向B的tanA公式仍假设denom=xDist(落点=目标).');
console.log('但Trico球质心飞过目标(xLand>xDist), denom应该用xLand不是xDist.');
console.log('=> 方向B要真正修对, tanA的denom不能用xDist, 要用旋转约束自洽求解.');
console.log('   即: 不能先用xDist定denom再解angle, 要让xLand自由(由angle/T/旋转共同决定).');
