// Analyze the image case deeply: right, dist=20, wa=338, ws=26, elev=0
// N3 output: angle=87.77, power=3.7409, T=3.67
// Question: is this a reasonable N3 shot? Compare the measured N3 samples at similar
// distance & wind to see if 87.8deg/3.74 is wildly off.
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('_real.json','utf8')).filter(d => d.n === 3 && d.distance >= 0);
console.log('Measured N3 forward samples, sorted by distance:');
console.log('s sd    elv  wa ws | realA realP | note');
const sorted = data.slice().sort((a,b)=>a.distance-b.distance);
for(const d of sorted){
  const dir = d.side==='右'?'R':'L';
  // wind quadrant
  const wa=d.windAngle;
  let wq='?';
  if(wa>=315||wa<45) wq='tail→';
  else if(wa>=45&&wa<135) wq='lift↑';
  else if(wa>=135&&wa<225) wq='head←';
  else wq='sink↓';
  console.log(`${dir} ${String(d.distance).padStart(5)} ${String(d.elevation||0).padStart(5)} ${String(d.windAngle).padStart(3)} ${String(d.windStrength).padStart(2)} | ${String(d.angle).padStart(5)} ${d.power.toFixed(2)} | ${wq}`);
}
console.log('\n--- Image case: RIGHT dist=20 wa=338(sink↓+tail→) ws=26 ---');
console.log('Calc N3 output: angle=87.8 power=3.74');
console.log('Nearest measured right-N3 samples:');
for(const d of data.filter(x=>x.side==='右')){
  console.log(`  sd=${d.distance} wa=${d.windAngle} ws=${d.windStrength} elev=${d.elevation||0} -> A=${d.angle} P=${d.power}`);
}
