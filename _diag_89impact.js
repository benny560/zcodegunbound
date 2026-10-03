// 放宽 >89 -> >89.5, 对N1/N2/N4 有多少样本的angleRaw落在 (89, 89.5]?
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('_real.json','utf8'));
const G=430,MASS=0.23;
const fits={ 'right:1':{a:1.7998,b:-0.04357},'right:2':{a:2.8655,b:-0.01427},'right:3':{a:4.1243,b:-0.01039},'left:2':{a:2.4008,b:-0.02506},'left:3':{a:3.4780,b:-0.01085},'right:4':{a:5.1551,b:-0.00594},'left:4':{a:4.8190,b:-0.0180} };
console.log('各N的实测angle最大值 + 删cap后落在(89,89.5]的样本:');
for(const n of [1,2,3,4]){
  const ds=data.filter(d=>d.n===n&&d.distance>=0);
  const maxA=ds.length?Math.max(...ds.map(d=>d.angle)):'-';
  let in89=[];
  for(const d of ds){
    const dir=d.side==='右'?'right':'left';
    const fit=fits[`${dir}:${n}`]; if(!fit)continue;
    const sd=Math.abs(d.distance);
    const wr=d.windAngle*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
    const ws=d.windStrength||0;
    const force=ws===0?0:(Math.abs(cosW+1)<0.001?ws:Math.max(0,ws-1));
    const xA=cosW*force/MASS,wy_acc=sinW*force/MASS;
    const effGrav=430-wy_acc;
    const xDist=sd*40;
    const T_target=fit.a+fit.b*sd+(0.0243-0.00066*wy_acc);
    const denom=xDist-0.5*xA*T_target*T_target;
    if(denom<=0.001)continue;
    const tanA=(0+0.5*effGrav*T_target*T_target)/denom;
    const ang=Math.atan(tanA)*180/Math.PI;
    if(ang>89&&ang<=89.5) in89.push(`${dir.slice(0,1)}${d.distance}=${ang.toFixed(2)}`);
  }
  console.log(`  N${n}: 实测max=${maxA}  (89,89.5]样本=[${in89.join(', ')}]`);
}
