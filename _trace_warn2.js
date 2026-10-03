// 用已知的raw值直接算(从前面_diag_redbox.js得到: raw=76.9189/3.5944 T=4.0776)
const G=430,MASS=0.23,PF=0.004332712;
const wa=157,ws=18;
const wr=wa*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
const force=Math.max(0,ws-1);
const xA=cosW*force/MASS, effGrav=G-sinW*force/MASS;
const rawA=76.91885679510904, rawP=3.5944, T_raw=4.0776;
const rawV=rawP/PF;
const cosRaw=Math.cos(rawA*Math.PI/180), sinRaw=Math.sin(rawA*Math.PI/180);
const xTarget=rawV*cosRaw*T_raw+0.5*xA*T_raw*T_raw;
const yTarget=rawV*sinRaw*T_raw-0.5*effGrav*T_raw*T_raw;
console.log('rawA='+rawA.toFixed(4)+' T_raw='+T_raw+' xA='+xA.toFixed(2)+' effGrav='+effGrav.toFixed(1));
console.log('xTarget='+xTarget.toFixed(2)+' yTarget='+yTarget.toFixed(2));
console.log('');
for(const targetAngle of [76,77]){
  const tanT=Math.tan(targetAngle*Math.PI/180), cosT=Math.cos(targetAngle*Math.PI/180);
  const denom=effGrav+xA*tanT;
  const T2=2*(tanT*xTarget-yTarget)/denom;
  const T_new=Math.sqrt(T2);
  const V_new=(xTarget-0.5*xA*T_new*T_new)/(cosT*T_new);
  const p=V_new*PF;
  const dT=Math.abs(T_new-T_raw);
  const tol=0.12; // N3
  const warn = dT>tol;
  console.log(`${targetAngle}°: T_new=${T_new.toFixed(4)} power=${p.toFixed(4)} dT=${dT.toFixed(4)} ${warn?'⚠WARN(dT>0.12)':'ok'}`);
  console.log(`  fmtRound返回: ${warn?`{txt:"${targetAngle}° / ${p.toFixed(4)} ⚠"}`:`{txt:"${targetAngle}° / ${p.toFixed(4)}"}`}`);
}
console.log('\n=== 结论 ===');
console.log('76°: dT=0.454>0.12, 应该显示"76° / 3.1956 ⚠".');
console.log('但图片显示"76° / 3.1956"无⚠. 说明warn逻辑有bug, 或ΔT容忍检查没生效.');
