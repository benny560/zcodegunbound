function trace(side, wa, ws){
  const sdParts=20, dist=20, elev=0;
  const G=430,MASS=0.23,PF=0.004332712;
  const sd=Math.abs(dist);
  const fit = side==='right'?{a:4.1243,b:-0.01039}:{a:3.4780,b:-0.01085};
  const windRad=wa*Math.PI/180, cosW=Math.cos(windRad), sinW=Math.sin(windRad);
  const force = ws===0?0:(Math.abs(cosW+1)<0.001?ws:Math.max(0,ws-1));
  const xA=cosW*force/MASS, effGrav=G-sinW*force/MASS, wy_acc=sinW*force/MASS;
  const dT=0.0243-0.00066*wy_acc;
  const T_base=fit.a+fit.b*sd;
  let T_target=T_base+dT;
  const xDist=sd*(800/sdParts);
  let cap='-';
  if(xA>0){const Tcap=Math.sqrt(2*xDist/xA)*0.92; if(T_target>Tcap){cap=`capped ${T_target.toFixed(2)}->${Tcap.toFixed(2)}`;T_target=Tcap;}}
  if(effGrav<=0) return {wa, note:'effGrav<=0', effGrav};
  const denom=xDist-0.5*xA*T_target*T_target;
  const tanA=(elev+0.5*effGrav*T_target*T_target)/denom;
  const ang = Number.isFinite(tanA)?Math.atan(tanA)*180/Math.PI:NaN;
  return {wa, force:+force.toFixed(2), xA:+xA.toFixed(2), effGrav:+effGrav.toFixed(1), wy_acc:+wy_acc.toFixed(2), dT:+dT.toFixed(3), T_base:+T_base.toFixed(2), T_target:+T_target.toFixed(2), denom:+denom.toFixed(0), angle:isNaN(ang)?null:+ang.toFixed(1), cap};
}
console.log('N3 RIGHT dist=20 ws=26 trace:');
for(const wa of [0,30,60,90,120,150,180,210,240,270,300,330,338,350]){
  const t=trace('right',wa,26);
  console.log(JSON.stringify(t));
}
