// 【纯分析】按风向分组看 v1.12 求解器预测误差, 判断哪些风需要调整、是角度还是弹道问题
// 反推每条实测的隐含T和落点, 与求解器对比. 用法: node _wind_analysis.cjs
const fs=require('fs');
const PF=0.004332712, MASS=0.23, G=430, EPPU=516/13;
const Tfit={'right:2':{a:2.8655,b:-0.01427},'right:3':{a:4.1243,b:-0.01039},'right:4':{a:5.1541,b:-0.00462},
            'left:2':{a:2.4008,b:-0.02506},'left:3':{a:3.4780,b:-0.01085},'left:4':{a:4.5933,b:-0.00545}};
const data=JSON.parse(fs.readFileSync('_excel_real.json','utf8'));

function analyze(d){
  const side=d.side==='右'?'right':'left', n=d.n;
  const fit=Tfit[`${side}:${n}`]; if(!fit||d.distance<=0) return null;
  const wa=side==='left'?((180-d.windAngle)%360+360)%360:d.windAngle;
  const wr=wa*Math.PI/180, cosW=Math.cos(wr), sinW=Math.sin(wr);
  const ws=d.windStrength||0;
  const force=ws===0?0:(Math.abs(cosW+1)<0.001?ws:Math.max(0,ws-1));
  const xA=cosW*force/MASS, effGrav=G-sinW*force/MASS; if(effGrav<=0)return null;
  const wy_acc=sinW*force/MASS, dT=0.0243-0.00066*wy_acc;
  const sd=d.distance, xDist=sd*40, elev=(d.elevation||0)*EPPU;
  const T_base=fit.a+fit.b*sd, T_target=T_base+dT;
  // 求解器预测(given-time, 瞄xDist)
  const denom=xDist-0.5*xA*T_target*T_target;
  const angP=Math.atan((elev+0.5*effGrav*T_target*T_target)/denom)*180/Math.PI;
  const Vp=denom/(Math.cos(angP*Math.PI/180)*T_target), powP=Vp*PF;
  // 实测反推: 隐含落地时间T_r(y方程), 落点xLand_r
  const Vr=d.power/PF, aR=d.angle*Math.PI/180, vyr=Vr*Math.sin(aR), vxr=Vr*Math.cos(aR);
  const disc=vyr*vyr-2*effGrav*elev; if(disc<0)return null;
  const Tr=(vyr+Math.sqrt(disc))/effGrav;
  const xLandR=vxr*Tr+0.5*xA*Tr*Tr;
  const centroidSD=(xLandR-xDist)/40;        // >0: 实测中心弹飞过目标(靠旋转命中)
  const dT_need=Tr-T_base;                    // 实测隐含的dT(对比模型dT)
  return { side, n, sd, ws, wa, cosW, sinW, elev:d.elevation||0,
           dAngle:angP-d.angle, dPower:powP-d.power, centroidSD, dT_model:dT, dT_need, dTerr:dT-dT_need };
}

const rows=data.map(analyze).filter(Boolean);

// 分组器
function grp(name, filt){
  const a=rows.filter(filt); if(!a.length) return;
  const mean=(k)=>a.reduce((s,r)=>s+r[k],0)/a.length;
  const mabs=(k)=>a.reduce((s,r)=>s+Math.abs(r[k]),0)/a.length;
  console.log(`${name.padEnd(22)} n=${String(a.length).padStart(2)} | dAngle均=${(mean('dAngle')>=0?'+':'')+mean('dAngle').toFixed(2)} |dA|=${mabs('dAngle').toFixed(2)} | dPow均=${(mean('dPower')>=0?'+':'')+mean('dPower').toFixed(3)} | 实测中心偏移=${(mean('centroidSD')>=0?'+':'')+mean('centroidSD').toFixed(2)}SD | dTerr均=${(mean('dTerr')>=0?'+':'')+mean('dTerr').toFixed(3)}`);
}
console.log('说明: dAngle/dPow=求解器预测−实测(>0=角度/力度偏高); 实测中心偏移>0=中心弹飞过目标(需靠旋转); dTerr=模型dT−实测隐含dT');
console.log('\n===== 按 上风/下风 × 顺/逆 分组 (全部N2-4, 左右合并; 左已翻转风向) =====');
grp('上风(sin>0.3)', r=>r.sinW>0.3);
grp('  上+顺(cos>0.2)', r=>r.sinW>0.3&&r.cosW>0.2);
grp('  上+逆(cos<-0.2)', r=>r.sinW>0.3&&r.cosW<-0.2);
grp('  上+侧(|cos|<0.2)', r=>r.sinW>0.3&&Math.abs(r.cosW)<=0.2);
grp('下风(sin<-0.3)', r=>r.sinW<-0.3);
grp('  下+顺', r=>r.sinW<-0.3&&r.cosW>0.2);
grp('  下+逆', r=>r.sinW<-0.3&&r.cosW<-0.2);
grp('平风(|sin|<=0.3)', r=>Math.abs(r.sinW)<=0.3);

console.log('\n===== 按风力大小 =====');
grp('小风(ws<=12)', r=>r.ws<=12);
grp('中风(13-19)', r=>r.ws>=13&&r.ws<=19);
grp('大风(>=20)', r=>r.ws>=20);

console.log('\n===== 上风区再按风力(看是否风越大偏移越大) =====');
grp('上风+小风(<=15)', r=>r.sinW>0.3&&r.ws<=15);
grp('上风+大风(>=20)', r=>r.sinW>0.3&&r.ws>=20);

console.log('\n===== ★分左右 × 上/下/平风 (质心偏移左右相反, 合并会抵消) =====');
for(const sd of ['right','left']){
  grp(`${sd==='right'?'右':'左'} 上风(sin>0.3)`, r=>r.side===sd && r.sinW>0.3);
  grp(`${sd==='right'?'右':'左'} 平风(|sin|<=0.3)`, r=>r.side===sd && Math.abs(r.sinW)<=0.3);
  grp(`${sd==='right'?'右':'左'} 下风(sin<-0.3)`, r=>r.side===sd && r.sinW<-0.3);
}

console.log('\n===== 逐条(上风区, 按中心偏移排序) =====');
console.log('side N  sd  ws effWa 落差 | dAngle dPow  中心偏移SD');
for(const r of rows.filter(r=>r.sinW>0.3).sort((x,y)=>y.centroidSD-x.centroidSD)){
  console.log(`${r.side.padEnd(5)}N${r.n} ${String(r.sd).padStart(5)} ${String(r.ws).padStart(2)} ${String(r.wa).padStart(4)} ${String(r.elev).padStart(5)} | ${(r.dAngle>=0?'+':'')+r.dAngle.toFixed(2)} ${(r.dPower>=0?'+':'')+r.dPower.toFixed(2)}  ${(r.centroidSD>=0?'+':'')+r.centroidSD.toFixed(2)}`);
}
