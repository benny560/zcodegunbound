// 混合策略: N4 right用方向B(xErrSD angle-only模型), N4 left用旧法(v1.07)
// N1-N3全用旧法
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
const sandbox = { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(sb+';globalThis.__api={searchTrico3in1Physics};',sandbox,{filename:'c.js'});
const api=sandbox.__api;

// 方向B求解器(N4 right only)
const G=430,MASS=0.23,PF=0.004332712;
const omegaR = V => 0.023623 * Math.pow(V, 0.764315);
const rotPiN4R = sd => 6.906-0.001204*sd;
const xErrN4R = ang => 5.2587-0.0508*ang;
function solveN4right(sdParts, distance, elev, wa, ws){
  const sd=Math.abs(distance);
  const rp=rotPiN4R(sd);
  const wr=wa*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
  const force=ws===0?0:(Math.abs(cosW+1)<0.001?ws:Math.max(0,ws-1));
  const xA=cosW*force/MASS, eg=G-sinW*force/MASS;
  if(eg<=0)return null;
  const xDist=sd*(800/sdParts);
  let T=4.5;
  for(let i=0;i<200;i++){
    let denom=xDist,ang=0;
    for(let j=0;j<10;j++){
      const tanA=(elev+0.5*eg*T*T)/denom;
      if(tanA<=0){denom=-1;break;}
      ang=Math.atan(tanA)*180/Math.PI;
      if(ang<1){denom=-1;break;}
      denom=xDist+40*xErrN4R(ang)-0.5*xA*T*T;
      if(denom<=0.001){denom=-1;break;}
    }
    if(denom<=0.001)return null;
    const cosA=Math.cos(ang*Math.PI/180);
    if(cosA<=0.001)return null;
    const V=denom/(cosA*T);
    if(V<=0||V>2000)return null;
    if(V*PF<=0||V*PF>5)return null;
    const Tn=rp*Math.PI/omegaR(V);
    if(!Number.isFinite(Tn)||Tn<=0)return null;
    if(Math.abs(Tn-T)<1e-4)break;
    T=0.5*(T+Tn);
  }
  let denom=xDist,ang=0;
  for(let j=0;j<20;j++){
    const tanA=(elev+0.5*eg*T*T)/denom;
    ang=Math.atan(tanA)*180/Math.PI;
    denom=xDist+40*xErrN4R(ang)-0.5*xA*T*T;
    if(denom<=0.001)return null;
  }
  const cosA=Math.cos(ang*Math.PI/180);
  const V=denom/(cosA*T);
  return {angle:ang, power:V*PF, T};
}

const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const EP=516/13,effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
console.log('=== 混合策略全量回归 ===');
const stats={};
for(const d of data){
  const dir=d.side==='右'?'right':'left';
  const wa=effWa(d.side,d.windAngle);
  const k='N'+d.n; if(!stats[k])stats[k]={n:0,ok:0,sA:0,sP:0};stats[k].n++;
  let r=null;
  // N4 right: 方向B
  if(d.n===4&&dir==='right'&&d.distance>=0){
    r=solveN4right(20,d.distance,(d.elevation||0)*EP,wa,d.windStrength);
  }
  // 其他: 旧法
  if(!r){
    const all=api.searchTrico3in1Physics(d.distance,20,dir,wa,d.windStrength,(d.elevation||0)*EP);
    r=(all||[]).find(x=>x.spinN===d.n);
  }
  if(r){stats[k].ok++;stats[k].sA+=Math.abs(r.angle-d.angle);stats[k].sP+=Math.abs(r.power-d.power);}
}
for(const k of ['N1','N2','N3','N4']){
  const s=stats[k];
  console.log(`${k}: ${s.ok}/${s.n} dA_MAE=${(s.sA/s.ok).toFixed(2)} dP_MAE=${(s.sP/s.ok).toFixed(3)}`);
}
// 4标准点
console.log('\n4标准点(N4 right 方向B):');
for(const t of [{sd:10,ws:20,a:84.4,p:3.86},{sd:20,ws:20,a:79.3,p:3.88},{sd:30,ws:20,a:73.9,p:3.93},{sd:40,ws:21,a:68.4,p:3.97}]){
  const r=solveN4right(20,t.sd,0,90,t.ws);
  console.log(`  sd=${t.sd}: ${r?r.angle.toFixed(2)+'/'+r.power.toFixed(3):'NULL'} (实测${t.a}/${t.p}) dA${r?(r.angle-t.a).toFixed(2):'-'} dP${r?(r.power-t.p).toFixed(3):'-'}`);
}
