// Comprehensive N3 residual analysis
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('gunbound_calculator.html', 'utf8');
const scriptBody = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fakeEl = () => ({
    value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} },
    setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){},
    querySelectorAll(){return [];}, querySelector(){return fakeEl();},
    addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;},
    getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [],
    innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){},
});
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
const sandbox = {
    document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {},
    requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>{},
    addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console,
    Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean,
    Event: function(){}, CustomEvent: function(){},
    getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};},
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''},
};
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const exposure = `;globalThis.__api = { searchTrico3in1Physics, EXCEL_TRICO, TRICO, TRICO_NEW };`;
vm.runInContext(scriptBody + exposure, sandbox, { filename: 'calc.js' });
const api = sandbox.__api;

const ELEVATION_PIXELS_PER_UNIT = 516/13;
const sdParts = 20;
const data = JSON.parse(fs.readFileSync('_real.json','utf8')).filter(d => d.n === 3);

const rows = [];
for (const d of data) {
    const dir = d.side === '右' ? 'right' : 'left';
    const elevInternal = (d.elevation || 0) * ELEVATION_PIXELS_PER_UNIT;
    // effective wind angle in shot frame
    const effWa = dir === 'left' ? ((180 - d.windAngle) % 360 + 360) % 360 : d.windAngle;
    const all = api.searchTrico3in1Physics(d.distance, sdParts, dir, effWa, d.windStrength, elevInternal);
    const res = (all||[]).find(r => r.spinN === 3) || null;
    if (!res) { rows.push({d, dir, effWa, err:'NULL'}); continue; }
    // Wind decomposition in shot frame
    const wr = effWa * Math.PI/180;
    const wx = Math.cos(wr) * d.windStrength;   // + = tailwind (pushes forward)
    const wy = Math.sin(wr) * d.windStrength;   // + = lifts up
    rows.push({
        d, dir, effWa,
        realA: d.angle, realP: d.power,
        predA: res.angle, predP: res.power, predT: res.T, src: res.source,
        dA: res.angle - d.angle, dP: res.power - d.power,
        wx, wy, ws: d.windStrength,
        elev: d.elevation, sd: d.distance,
        backshot: d.distance < 0,
    });
}

// Filter out backshots for the forward-shot analysis (they use different physics route)
const fwd = rows.filter(r => !r.err && !r.backshot);
const back = rows.filter(r => !r.err && r.backshot);

function summarise(label, arr) {
    if (!arr.length) return console.log(`${label}: no data`);
    const dA = arr.map(r=>r.dA), dP = arr.map(r=>r.dP);
    const mean = a => a.reduce((x,y)=>x+y,0)/a.length;
    const mae = a => a.map(Math.abs).reduce((x,y)=>x+y,0)/a.length;
    const sd = a => Math.sqrt(a.reduce((s,v)=>s+(v-mean(a))**2,0)/a.length);
    console.log(`${label} (n=${arr.length}): dA mean=${mean(dA).toFixed(2)} MAE=${mae(dA).toFixed(2)} sd=${sd(dA).toFixed(2)} | dP mean=${mean(dP).toFixed(3)} MAE=${mae(dP).toFixed(3)} sd=${sd(dP).toFixed(3)}`);
}

console.log('===== OVERALL =====');
summarise('All forward N3', fwd);
summarise('Right N3 forward', fwd.filter(r=>r.dir==='right'));
summarise('Left  N3 forward', fwd.filter(r=>r.dir==='left'));
summarise('Backshots', back);

console.log('\n===== BY WIND HORIZONTAL DIRECTION (shot frame) =====');
const tail = fwd.filter(r=>r.wx > 1);   //顺风
const head = fwd.filter(r=>r.wx < -1);  //逆风
const cross = fwd.filter(r=>Math.abs(r.wx) <= 1);
summarise('Tailwind (wx>0)', tail);
summarise('Headwind (wx<0)', head);
summarise('Cross/near-zero wx', cross);

console.log('\n===== BY WIND VERTICAL (shot frame) =====');
const lift = fwd.filter(r=>r.wy > 1);   //上风(lift)
const sink = fwd.filter(r=>r.wy < -1);  //下风
summarise('Lift wind (wy>0)', lift);
summarise('Sink wind (wy<0)', sink);

console.log('\n===== BY WIND STRENGTH =====');
for (const [lo,hi,lbl] of [[0,9,'low 0-9'],[10,15,'mid 10-15'],[16,20,'high 16-20'],[21,99,'vhigh 21+']]) {
    summarise(lbl, fwd.filter(r=>r.ws>=lo && r.ws<=hi));
}

console.log('\n===== BY ELEVATION =====');
summarise('flat |e|<1', fwd.filter(r=>Math.abs(r.elev)<1));
summarise('high target elev>1', fwd.filter(r=>r.elev>1));
summarise('low target elev<-1', fwd.filter(r=>r.elev<-1));

console.log('\n===== BY DISTANCE =====');
for (const [lo,hi,lbl] of [[0,8,'short 0-8'],[8,16,'med 8-16'],[16,25,'long 16-25'],[25,99,'vlong 25+']]) {
    summarise(lbl, fwd.filter(r=>Math.abs(r.sd)>=lo && Math.abs(r.sd)<hi));
}

console.log('\n===== WORST 8 BY |dA| =====');
const sorted = fwd.slice().sort((a,b)=>Math.abs(b.dA)-Math.abs(a.dA));
for (const r of sorted.slice(0,8)) {
    console.log(`  ${r.dir.slice(0,1)} sd=${String(r.sd).padStart(6)} elev=${String(r.elev).padStart(5)} wa=${String(r.d.windAngle).padStart(3)} ws=${String(r.ws).padStart(2)} wx=${r.wx.toFixed(1).padStart(6)} wy=${r.wy.toFixed(1).padStart(6)} | realA=${String(r.realA).padStart(3)} predA=${r.predA.toFixed(1).padStart(5)} | dA=${(r.dA>=0?'+':'')+r.dA.toFixed(2)} dP=${(r.dP>=0?'+':'')+r.dP.toFixed(3)} src=${r.src}`);
}

// Hypothesis test: does dA correlate with wx (tailwind)?
function corr(xs, ys) {
    const mx = xs.reduce((a,b)=>a+b,0)/xs.length;
    const my = ys.reduce((a,b)=>a+b,0)/ys.length;
    let num=0, dx=0, dy=0;
    for (let i=0;i<xs.length;i++){ num+=(xs[i]-mx)*(ys[i]-my); dx+=(xs[i]-mx)**2; dy+=(ys[i]-my)**2; }
    return num/Math.sqrt(dx*dy);
}
const wxs = fwd.map(r=>r.wx), dAs = fwd.map(r=>r.dA);
const wys = fwd.map(r=>r.wy);
console.log('\n===== CORRELATIONS (forward N3) =====');
console.log('corr(dA, wx) =', corr(wxs, dAs).toFixed(3), ' (positive => more tailwind -> predict too high)');
console.log('corr(dA, wy) =', corr(wys, dAs).toFixed(3));
console.log('corr(dA, ws) =', corr(fwd.map(r=>r.ws), dAs).toFixed(3));
console.log('corr(dA, elev)=', corr(fwd.map(r=>r.elev), dAs).toFixed(3));
console.log('corr(dA, |sd|)=', corr(fwd.map(r=>Math.abs(r.sd)), dAs).toFixed(3));
console.log('corr(dP, wx) =', corr(wxs, fwd.map(r=>r.dP)).toFixed(3));

// Linear fit dA = a + b*wx + c*wy
function fit3() {
    const n=fwd.length;
    let Sx=0,Sy=0,Sz=0,Sxx=0,Sxy=0,Sxz=0,Syy=0,Syz=0,Szz=0,Sa=0,Sbx=0,Sby=0,Sbz=0;
    for (const r of fwd){const x=r.wx,y=r.wy,z=1; const t=r.dA;
        Sx+=x;Sy+=y;Sz+=z;Sxx+=x*x;Sxy+=x*y;Sxz+=x*z;Syy+=y*y;Syz+=y*z;Szz+=z*z;
        Sa+=t;Sbx+=x*t;Sby+=y*t;Sbz+=t;}
    // Normal equations 3x3
    const M=[[Sxx,Sxy,Sxz],[Sxy,Syy,Syz],[Sxz,Syz,Szz]];
    const V=[Sbx,Sby,Sa];
    // solve
    function solve3(M,V){const a=[...M.map(r=>[...r])], b=[...V];
        for(let i=0;i<3;i++){let p=i;for(let k=i+1;k<3;k++)if(Math.abs(a[k][i])>Math.abs(a[p][i]))p=k;[a[i],a[p]]=[a[p],a[i]];[b[i],b[p]]=[b[p],b[i]];
            for(let k=i+1;k<3;k++){const f=a[k][i]/a[i][i];for(let j=i;j<3;j++)a[k][j]-=f*a[i][j];b[k]-=f*b[i];}}
        const x=[0,0,0];for(let i=2;i>=0;i--){let s=b[i];for(let j=i+1;j<3;j++)s-=a[i][j]*x[j];x[i]=s/a[i][i];}return x;}
    const [bwx,bwy,c]=solve3(M,V);
    return {bwx, bwy, c};
}
const fit = fit3();
console.log(`\nLinear fit dA ≈ ${fit.c.toFixed(3)} + (${fit.bwx.toFixed(4)})*wx + (${fit.bwy.toFixed(4)})*wy`);
// residual MAE after this fit
let post=[]; for(const r of fwd){const pred=fit.c+fit.bwx*r.wx+fit.bwy*r.wy; post.push(Math.abs(r.dA-pred));}
console.log(`post-fit |dA| MAE = ${(post.reduce((a,b)=>a+b,0)/post.length).toFixed(3)}`);

fs.writeFileSync('_n3_full.json', JSON.stringify({rows, fwd}, null, 2));
