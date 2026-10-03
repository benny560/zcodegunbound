// 去掉cap, 看 T_base+dT 对应的 denom 在多少场景会<=0(真正需要兜底)
const fs=require('fs');
const G=430,MASS=0.23,sdParts=20;
const fits={ 'right:3':{a:4.1243,b:-0.01039}, 'left:3':{a:3.4780,b:-0.01085} };
const data=JSON.parse(fs.readFileSync('_real.json','utf8')).filter(d=>d.n===3&&d.distance>=0);

let wouldExplode=0, total=0;
console.log('实测N3样本: 去掉cap后 denom 是否<=0');
console.log('side sd   wa ws | T_target T_max  denom   爆?');
for(const d of data){
  const dir=d.side==='右'?'right':'left';
  const sd=Math.abs(d.distance);
  const wr=d.windAngle*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
  const ws=d.windStrength||0;
  const force=ws===0?0:(Math.abs(cosW+1)<0.001?ws:Math.max(0,ws-1));
  const xA=cosW*force/MASS,wy_acc=sinW*force/MASS;
  const xDist=sd*(800/sdParts);
  const fit=fits[`${dir}:3`];
  const T_base=fit.a+fit.b*sd;
  const T_target=T_base+(0.0243-0.00066*wy_acc);
  const T_max=xA>0?Math.sqrt(2*xDist/xA):Infinity;
  const denom=xDist-0.5*xA*T_target*T_target;
  const boom=denom<=0.001;
  total++;
  if(boom)wouldExplode++;
  if(boom||xA>0) console.log(`${dir.slice(0,1)} ${String(sd).padStart(5)} ${String(d.windAngle).padStart(3)} ${String(ws).padStart(2)} | ${T_target.toFixed(3).padStart(7)} ${T_max.toFixed(3).padStart(6)} ${denom.toFixed(1).padStart(6)}  ${boom?'<<爆':''}`);
}
console.log(`\n实测${total}个N3样本: 去掉cap后 denom<=0 的 = ${wouldExplode} 个`);
console.log('=> cap 只在"没实测数据覆盖的纯顺风大风极端场景"才可能触发');
