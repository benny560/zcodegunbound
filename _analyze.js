const fs=require("fs"),vm=require("vm");
const html=fs.readFileSync("gunbound_calculator.html","utf8");
let script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const mkEl=()=>new Proxy({},{get(t,p){if(p==="getContext")return()=>({});if(p==="style"||p==="dataset"){if(!t[p])t[p]={};return t[p];}if(p==="classList"){if(!t[p])t[p]={add:()=>{},remove:()=>{},toggle:()=>{},contains:()=>false};return t[p];}if(p==="options"){if(!t[p])t[p]=[];return t[p];}if(p==="value"||p==="checked"||p==="innerHTML"||p==="textContent")return t[p]!=null?t[p]:(p==="value"?"0":"");if(p==="selectedIndex")return t[p]!=null?t[p]:0;if(p==="querySelectorAll")return()=>[];if(p==="querySelector")return()=>null;if(p==="addEventListener"||p==="removeEventListener")return()=>{};if(p==="dispatchEvent")return()=>true;if(p in t)return t[p];return()=>{};},set(t,p,v){t[p]=v;return true;}});
const fakeDoc=new Proxy({},{get(t,p){if(p==="getElementById"||p==="createElement")return()=>mkEl();if(p==="querySelector")return()=>null;if(p==="querySelectorAll")return()=>[];if(p==="addEventListener")return()=>{};if(p==="body"||p==="documentElement")return mkEl();if(p in t)return t[p];return undefined;}});
const win={addEventListener:()=>{},innerWidth:800,innerHeight:600,devicePixelRatio:1,scrollTo:()=>{},location:{},requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},getComputedStyle:()=>({getPropertyValue:()=>""})};
const sandbox={document:fakeDoc,window:win,navigator:{userAgent:"node"},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},requestAnimationFrame:()=>{},cancelAnimationFrame:()=>{},setTimeout:()=>0,setInterval:()=>0,clearTimeout:()=>{},clearInterval:()=>{},getComputedStyle:()=>({getPropertyValue:()=>""}),console,Math,Date,JSON,parseInt,parseFloat,isNaN,isFinite,Number,String,Boolean,Array,Object,Uint8ClampedArray,Float32Array,Map,Set,Symbol,Promise,Reflect,Proxy,Event:function(){},MouseEvent:function(){},KeyboardEvent:function(){},TouchEvent:function(){},Image:function(){return{};},URL:{createObjectURL:()=>""},Blob:function(){},FileReader:function(){}};
win.document=fakeDoc;sandbox.globalThis=sandbox;vm.createContext(sandbox);
try{vm.runInContext(script,sandbox);}catch(e){}
const f=sandbox.searchTrico3in1Physics;
const EPPU=516/13;
const real=JSON.parse(fs.readFileSync("_rd.json","utf8"));
// 用raw值分析(不用取整解,排除取整干扰),看raw本身的系统性偏差
const rows=[];
for(const r of real){
  const side=r.dir==="左"?"left":"right";
  let wa=r.wa;if(side==="left")wa=((180-r.wa)%360+360)%360;
  const res=f(r.dist,20,side,wa,r.ws,EPPU*r.elev);
  const m=res.find(x=>x.spinN===r.n);
  if(!m)continue;
  const dA=m.angle-r.ang, dP=m.power-r.pw;
  rows.push({...r,calcA:m.angle,calcP:m.power,dA,dP,absA:Math.abs(dA),absP:Math.abs(dP)});
}
// 按偏差大小排序,看最大的
rows.sort((a,b)=>b.absP-a.absP);
console.log("=== 力度偏差最大的15条(raw对比) ===");
console.log("dist dir wa/ws N elev | 实测A/P | 计算A/P | dA dP");
rows.slice(0,15).forEach(r=>{
  console.log(`${r.dist.toFixed(1).padStart(5)} ${r.dir} ${String(r.wa).padStart(3)}/${String(r.ws).padStart(2)} N${r.n} e${String(r.elev).padStart(5)} | ${r.ang}°/${r.pw.toFixed(3)} | ${r.calcA.toFixed(2)}°/${r.calcP.toFixed(3)} | ${r.dA>=0?'+':''}${r.dA.toFixed(2)}° ${r.dP>=0?'+':''}${r.dP.toFixed(3)}`);
});
// 分析偏差方向是否有系统性(全正/全负)
console.log("\n=== 偏差方向分析 ===");
const posA=rows.filter(r=>r.dA>0.1).length, negA=rows.filter(r=>r.dA<-0.1).length;
const posP=rows.filter(r=>r.dP>0.02).length, negP=rows.filter(r=>r.dP<-0.02).length;
console.log(`角度偏差: 正(计算偏高)${posA}条 负(计算偏低)${negA}条 → ${posA>negA*1.5?'系统偏高':negA>posA*1.5?'系统偏低':'无明显偏向'}`);
console.log(`力度偏差: 正(计算偏高)${posP}条 负(计算偏低)${negP}条 → ${posP>negP*1.5?'系统偏高':negP>posP*1.5?'系统偏低':'无明显偏向'}`);
// 按N分
console.log("\n=== 按N分组的偏差(raw) ===");
for(const n of[1,2,3,4]){
  const a=rows.filter(r=>r.n===n);
  if(!a.length)continue;
  const aA=a.reduce((s,x)=>s+x.absA,0)/a.length;
  const aP=a.reduce((s,x)=>s+x.absP,0)/a.length;
  const mA=a.reduce((s,x)=>s+x.dA,0)/a.length;
  const mP=a.reduce((s,x)=>s+x.dP,0)/a.length;
  console.log(`N${n}: ${a.length}条 平均偏差${aA.toFixed(2)}°/${aP.toFixed(3)} 系统偏移${mA>=0?'+':''}${mA.toFixed(2)}°/${mP>=0?'+':''}${mP.toFixed(3)}`);
}
// 按风力分
console.log("\n=== 按风力分组(raw力度偏差) ===");
for(const wsR of[[6,12],[12,18],[18,26]]){
  const a=rows.filter(r=>r.ws>=wsR[0]&&r.ws<wsR[1]);
  if(!a.length)continue;
  const aP=a.reduce((s,x)=>s+x.absP,0)/a.length;
  console.log(`风${wsR[0]}-${wsR[1]}: ${a.length}条 平均力度偏差${aP.toFixed(3)}`);
}
