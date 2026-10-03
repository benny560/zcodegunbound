// Reverse-engineer the true flight time T implied by each measured N3 sample,
// then compare to the model's T_base + dT. This isolates whether N3 error is
// a TIME-model error or an angle/power reconstruction error.
const fs = require('fs');
const G = 430;            // TRICO.gravity (N2-N4 standard G)
const PF = 0.004332712;
const MASS = 0.2;         // TRICO.mass (verify)
const sdParts = 20;

const data = JSON.parse(fs.readFileSync('_real.json','utf8')).filter(d => d.n === 3 && d.distance >= 0);
const fits = { 'right:3': {a:4.1243,b:-0.01039}, 'left:3': {a:3.4780,b:-0.01085} };

function inferTrueT(distance, elevPx, windAngle, windStrength, angleDeg, power, side) {
    // Wind params identical to calcTimePhysicsSolver
    const windRad = windAngle * Math.PI/180;
    const cosW = Math.cos(windRad), sinW = Math.sin(windRad);
    const ws = Math.max(0, windStrength||0);
    const force = ws===0 ? 0 : (Math.abs(cosW+1)<0.001 ? ws : Math.max(0, ws-1));
    const xA = cosW*force/MASS;
    const effGrav = G - sinW*force/MASS;
    const wy_acc = sinW*force/MASS;
    const V = power / PF;
    const aRad = angleDeg*Math.PI/180;
    const vx = V*Math.cos(aRad), vy = V*Math.sin(aRad);
    const xDist = Math.abs(distance)*(800/sdParts);
    // x(t): vx*t + 0.5*xA*t^2 = xDist  -> solve for t (positive root)
    // 0.5*xA t^2 + vx t - xDist = 0
    const A = 0.5*xA, Bc = vx, Cc = -xDist;
    let tx;
    if (Math.abs(A) < 1e-9) { tx = -Cc/Bc; }
    else { const disc = Bc*Bc - 4*A*Cc; if(disc<0) return null; tx = (-Bc+Math.sqrt(disc))/(2*A); }
    if (!Number.isFinite(tx) || tx<=0) return null;
    // y(t) landing check: vy*t - 0.5*effGrav*t^2 should be ~ elevPx (landing height)
    return { T_true: tx, effGrav, xA, wy_acc, vx, vy, V };
}

console.log('side  sd   elev  wa   ws | realA realP  | T_model T_true  dT_model dT(wind) | T_err   note');
let sumTerr=0, n=0;
for (const d of data) {
    const dir = d.side==='右'?'right':'left';
    const elevPx = (d.elevation||0) * (516/13);
    const r = inferTrueT(d.distance, elevPx, d.windAngle, d.windStrength, d.angle, d.power, dir);
    if (!r) { console.log(`${dir.slice(0,1)} sd=${d.distance} elev=${d.elevation} wa=${d.windAngle} ws=${d.windStrength} | FAILED to invert`); continue; }
    const fit = fits[`${dir}:3`];
    const T_base = fit.a + fit.b * d.distance;
    const dT = 0.0243 - 0.00066*r.wy_acc;
    const T_model = T_base + dT;
    const Terr = T_model - r.T_true;
    sumTerr += Terr; n++;
    console.log(`${dir.slice(0,1)}    ${String(d.distance).padStart(5)} ${String(d.elevation||0).padStart(5)} ${String(d.windAngle).padStart(3)} ${String(d.windStrength).padStart(2)} | ${String(d.angle).padStart(5)} ${d.power.toFixed(2)} | ${T_model.toFixed(3)}  ${r.T_true.toFixed(3)}  ${dT.toFixed(3)}    | ${(Terr>=0?'+':'')+Terr.toFixed(3)}`);
}
console.log(`\nMean T_err (model - true) = ${(sumTerr/n).toFixed(4)} s over ${n} samples`);
