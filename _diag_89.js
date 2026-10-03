// 哪些N3场景 angleRaw 会 >89? 都是顺风大风高角度. 实测里有没有>89的?
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('_real.json','utf8')).filter(d=>d.n===3&&d.distance>=0);
console.log('实测N3 forward, angle分布:');
const angles=data.map(d=>d.angle).sort((a,b)=>a-b);
console.log('min='+angles[0]+' max='+angles[angles.length-1]);
console.log('>85的:', data.filter(d=>d.angle>85).map(d=>`${d.side}${d.distance} wa${d.windAngle} ws${d.windStrength}=${d.angle}deg`).join(', '));
console.log('');
// 算每个样本删cap后的angleRaw, 看多少个>89
const G=430,MASS=0.23;
const fits={ 'right:3':{a:4.1243,b:-0.01039}, 'left:3':{a:3.4780,b:-0.01085} };
let over89=0;
console.log('删cap后 angleRaw>89 的样本:');
for(const d of data){
  const dir=d.side==='右'?'right':'left';
  const sd=Math.abs(d.distance);
  const wr=d.windAngle*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
  const ws=d.windStrength||0;
  const force=ws===0?0:(Math.abs(cosW+1)<0.001?ws:Math.max(0,ws-1));
  const xA=cosW*force/MASS,wy_acc=sinW*force/MASS;
  const effGrav=430-wy_acc;
  const xDist=sd*40;
  const fit=fits[`${dir}:3`];
  const T_target=fit.a+fit.b*sd+(0.0243-0.00066*wy_acc);
  const denom=xDist-0.5*xA*T_target*T_target;
  if(denom<=0.001) continue;
  const tanA=(0+0.5*effGrav*T_target*T_target)/denom;
  const ang=Math.atan(tanA)*180/Math.PI;
  if(ang>89){over89++; console.log(`  ${dir.slice(0,1)} sd=${sd} wa=${d.windAngle} ws=${ws} -> angleRaw=${ang.toFixed(2)} (实测${d.angle}deg)`);}
}
console.log(`共 ${over89} 个样本 angleRaw>89`);
