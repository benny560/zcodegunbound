// The image case: right dist=20 wa=338 ws=26 elev=0 -> N3 = 87.8/3.74
// The "cap" logic clamps T_target. Let's see what the UNCAPPED result would be,
// and whether the cap is what causes the 87-degree blowup.
const G=430,MASS=0.23,PF=0.004332712,sdParts=20,dist=20,elev=0,wa=338,ws=26;
const sd=Math.abs(dist);
const fit={a:4.1243,b:-0.01039};
const windRad=wa*Math.PI/180, cosW=Math.cos(windRad), sinW=Math.sin(windRad);
const force=Math.max(0,ws-1);  // wa=338: cosW!=−1
const xA=cosW*force/MASS, effGrav=G-sinW*force/MASS, wy_acc=sinW*force/MASS;
const T_base=fit.a+fit.b*sd;
const dT=0.0243-0.00066*wy_acc;
const T_uncapped=T_base+dT;
const xDist=sd*(800/sdParts);
const T_cap=Math.sqrt(2*xDist/xA)*0.92;
const T_target=Math.min(T_uncapped, T_cap);
console.log('wa=338 ws=26: xA='+xA.toFixed(2)+' wy_acc='+wy_acc.toFixed(2));
console.log('T_base='+T_base.toFixed(3)+' dT='+dT.toFixed(3)+' T_uncapped='+T_uncapped.toFixed(3));
console.log('T_cap(sqrt(2*xDist/xA)*0.92)='+T_cap.toFixed(3)+'  xDist='+xDist.toFixed(0));
console.log('T_target='+T_target.toFixed(3)+' (capped='+(T_uncapped>T_cap)+')');
console.log('');
// Solve angle/power at T_target
const half_g_T2=0.5*effGrav*T_target*T_target;
const denom=xDist-0.5*xA*T_target*T_target;
const tanA=(elev+half_g_T2)/denom;
const ang=Math.atan(tanA)*180/Math.PI;
const V=denom/(Math.cos(ang*Math.PI/180)*T_target);
console.log('CAPPED: angle='+ang.toFixed(2)+' power='+(V*PF).toFixed(3));
// Solve at T_uncapped
const denomU=xDist-0.5*xA*T_uncapped*T_uncapped;
console.log('UNCAPPED denom='+denomU.toFixed(1)+' (xDist='+xDist.toFixed(0)+', half_xA_T2='+(0.5*xA*T_uncapped*T_uncapped).toFixed(0)+')');
if(denomU<=0){console.log('  denom<=0 -> tanA negative -> angle invalid (this is why cap exists)');}
else{const tanU=(elev+0.5*effGrav*T_uncapped*T_uncapped)/denomU; const angU=Math.atan(tanU)*180/Math.PI; console.log('  UNCAPPED angle='+angU.toFixed(2));}
console.log('');
console.log('KEY: denom = xDist - 0.5*xA*T^2. With xA>0 (tailwind) the wind PUSHES the ball');
console.log('forward, so over a long flight T the horizontal distance EXCEEDS target ->');
console.log('solver caps T to keep denom>0, but capping T to the PHYSICAL ceiling makes');
console.log('tanA huge -> angle ~88deg. The cap is the wrong fix.');
