const fs = require('fs');
const G = 430, MASS = 0.23, PF = 0.004332712, sdParts = 20;
const data = JSON.parse(fs.readFileSync('_real.json','utf8')).filter(d => d.n === 3 && d.distance >= 0);
const fits = { 'right:3': {a:4.1243,b:-0.01039}, 'left:3': {a:3.4780,b:-0.01085} };
const ELEV_PX = 516/13;

console.log('s sd    elv  wa  ws |realA/realP | Tmodel Ttrue | Terr  | wy_acc  cosW');
let sumT=0,n=0; const terrs=[];
for (const d of data) {
    const dir = d.side==='右'?'right':'left';
    const elevPx = (d.elevation||0)*ELEV_PX;
    const wr = d.windAngle*Math.PI/180, cosW=Math.cos(wr), sinW=Math.sin(wr);
    const ws = Math.max(0,d.windStrength||0);
    const force = ws===0?0:(Math.abs(cosW+1)<0.001?ws:Math.max(0,ws-1));
    const xA = cosW*force/MASS, wy_acc = sinW*force/MASS;
    const V = d.power/PF, aR=d.angle*Math.PI/180;
    const vx=V*Math.cos(aR), vy=V*Math.sin(aR);
    const xDist = Math.abs(d.distance)*(800/sdParts);
    const A=0.5*xA, B=vx, C=-xDist;
    let tx;
    if(Math.abs(A)<1e-9) tx=-C/B;
    else{const disc=B*B-4*A*C; if(disc<0){console.log(`${dir.slice(0,1)} sd=${d.distance} DISC<0`);continue;}tx=(-B+Math.sqrt(disc))/(2*A);}
    if(!Number.isFinite(tx)||tx<=0){console.log(`${dir.slice(0,1)} sd=${d.distance} t<=0`);continue;}
    const effGrav = G - wy_acc;
    const yL = vy*tx - 0.5*effGrav*tx*tx;
    const fit=fits[`${dir}:3`];
    const Tmodel = fit.a+fit.b*d.distance + (0.0243-0.00066*wy_acc);
    const Terr = Tmodel-tx;
    sumT+=Terr;n++;terrs.push(Terr);
    console.log(`${dir.slice(0,1)} ${String(d.distance).padStart(5)} ${String((d.elevation||0)).padStart(5)} ${String(d.windAngle).padStart(3)} ${String(d.windStrength).padStart(2)} |${String(d.angle).padStart(4)}/${d.power.toFixed(2)} | ${Tmodel.toFixed(3)} ${tx.toFixed(3)} | ${(Terr>=0?'+':'')+Terr.toFixed(3)} | ${wy_acc.toFixed(2).padStart(6)} ${cosW.toFixed(2).padStart(5)} | yLand=${yL.toFixed(0)}(elevPx=${elevPx.toFixed(0)})`);
}
const mean=sumT/n, sd=Math.sqrt(terrs.reduce((s,v)=>s+(v-mean)**2,0)/n);
console.log(`\nN=${n}  T_err(model-true): mean=${mean.toFixed(4)} sd=${sd.toFixed(4)} min=${Math.min(...terrs).toFixed(3)} max=${Math.max(...terrs).toFixed(3)}`);
