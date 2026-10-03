// 1. 实测样本(左4 sd=33 wa=68 ws=11 A=69 P=4)反推真实T
// 2. 对比图片场景(左4 sd=33 wa=90 ws=12)模型给的T和power
const G=430,MASS=0.23,PF=0.004332712;
const fits={'left:4':{a:4.819,b:-0.018}};

function analyze(label, side, dist, wa0, ws, elev, realA, realP){
  const effWa = side==='left'?((180-wa0)%360+360)%360:wa0;
  const wr=effWa*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
  const force=Math.max(0,ws-1);
  const wy_acc=sinW*force/MASS;
  const effGrav=G-wy_acc;
  console.log(`=== ${label} ===`);
  console.log(`  side=${side} sd=${dist} wa=${wa0} effWa=${effWa.toFixed(0)} ws=${ws} elev=${elev}`);
  console.log(`  force=${force} wy_acc=${wy_acc.toFixed(2)} effGrav=${effGrav.toFixed(2)}`);
  // 模型T
  const T_base=fits['left:4'].a+fits['left:4'].b*dist;
  const dT=0.0243-0.00066*wy_acc;
  const T_model=T_base+dT;
  console.log(`  模型: T_base=${T_base.toFixed(4)} dT=${dT.toFixed(4)} T_model=${T_model.toFixed(4)}`);
  if(realA&&realP){
    // 实测反推T (y方程落地)
    const V=realP/PF, ar=realA*Math.PI/180;
    const vy=V*Math.sin(ar);
    const EP=516/13, elevPx=(elev||0)*EP;
    const disc=vy*vy-2*effGrav*elevPx;
    if(disc>=0){
      const T_true=(vy+Math.sqrt(disc))/effGrav;
      console.log(`  实测反推: vy=${vy.toFixed(1)} T_true=${T_true.toFixed(4)}`);
      console.log(`  T_model - T_true = ${(T_model-T_true).toFixed(4)}`);
      // 用T_true算模型该给的power
      const xDist=dist*40;
      const denom=xDist-0.5*cosW*force/MASS*T_true*T_true;
      const tanA=(elevPx+0.5*effGrav*T_true*T_true)/denom;
      const ang=Math.atan(tanA)*180/Math.PI;
      const V_calc=denom/(Math.cos(ang*Math.PI/180)*T_true);
      console.log(`  若用T_true: angle=${ang.toFixed(2)} power=${(V_calc*PF).toFixed(4)} (实测${realA}/${realP})`);
    }
  }
  console.log('');
}
analyze('实测样本', '左', 33, 68, 11, 0, 69, 4);
analyze('图片场景', '左', 33, 90, 12, 0, null, null);
