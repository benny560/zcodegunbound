const fs = require('fs');
let src = fs.readFileSync('gunbound_calculator.html','utf8').split(/\r?\n/);
const cut = (a,b) => src.slice(a-1,b).join('\n');
const wrapper = 'const document=new Proxy({},{get:()=>({value:0,textContent:""}),set:()=>true});const window={};const localStorage={getItem:()=>null,setItem:()=>{}};const navigator={};\n'
+ cut(1472,1473) + '\n        const MAX_DISPLAY_POWER = 5;\n' + cut(1540,1872) + '\n' + cut(1879,4045) + '\n';
const body = wrapper + `
let out='';
// 右攻N4 sd=20 当前输出 + 相位分析
const r=EXCEL_TRICO.calcWithWind(20,'right',4,20,0,0,0);
out+='右攻N4 sd=20: '+(r?(r.angle+'/'+r.power.toFixed(3)+' T='+r.time.toFixed(3)+' V='+r.velocity.toFixed(0)+' ['+r.source+']'):'无解')+'\\n';
// T-fit: right:4 = {a:5.1551, b:-0.00594}
const fit=EXCEL_TRICO.timePhysicsNoWindT['right:4'];
out+='T-fit right:4: a='+fit.a+' b='+fit.b+' => T(20)='+ (fit.a+fit.b*20).toFixed(3)+'\\n';
// N4识别表(去风还原): right:4 只有2点 [9.5,86,4.76],[37.1,74,4.78]
out+='N4识别表 right:4: '+JSON.stringify(EXCEL_TRICO.empiricalPhaseTables.right[4])+'\\n';
// 用识别表插值 sd=20
const a=EXCEL_TRICO.getEmpiricalPhaseAnchor('right',4,20);
out+='识别表插值 sd=20: '+(a?(a.angle+'/'+a.power.toFixed(3)):'null(超出2点范围?)')+'\\n';
// N3对比(有完整识别表)
const r3=EXCEL_TRICO.calcWithWind(20,'right',3,20,0,0,0);
out+='右攻N3 sd=20(对比): '+(r3?(r3.angle+'/'+r3.power.toFixed(3)+' T='+r3.time.toFixed(3)):'无解')+'\\n';
// 相位公式
const pf4=EXCEL_TRICO.phaseFormulas.right[4];
out+='phaseFormulas right:4: '+JSON.stringify(pf4)+'\\n';
return out;
`;
console.log(new Function('fs', body)(fs));
