// 89.3/3.98 -> T_true=3.875 (前面_diag_truth算过)
// T_target = T_base + dT = 3.9165 + 0.0512 = 3.9677
// 差 0.093s. 拆开看: T_base 和 dT 各偏多少?
// 无风时这个距离的N3真实T是多少? 从识别表查(无风N3 dist=20)
const G=430,MASS=0.23,PF=0.004332712;
const dist=20, wa=338, ws=26;
const wr=wa*Math.PI/180, sinW=Math.sin(wr);
const force=Math.max(0,ws-1);
const wy_acc=sinW*force/MASS;

console.log('=== T 分解 ===');
console.log('T_base (fit: 4.1243-0.01039*20) = '+ (4.1243-0.01039*20).toFixed(4));
console.log('dT (0.0243-0.00066*wy_acc)      = '+ (0.0243-0.00066*wy_acc).toFixed(4) + '  (wy_acc='+wy_acc.toFixed(2)+')');
console.log('T_target                          = '+ (4.1243-0.01039*20+0.0243-0.00066*wy_acc).toFixed(4));
console.log('T_true (from 89.3/3.98)           = 3.8747');
console.log('T_target - T_true                 = '+ (3.9677-3.8747).toFixed(4));
console.log('');
// 如果用 T_true=3.875, 算出什么?
const T=3.8747;
const cosW=Math.cos(wr);
const xA=cosW*force/MASS, effGrav=G-wy_acc;
const xDist=dist*40;
const denom=xDist-0.5*xA*T*T;
const tanA=(0+0.5*effGrav*T*T)/denom;
const ang=Math.atan(tanA)*180/Math.PI;
const V=denom/(Math.cos(ang*Math.PI/180)*T);
console.log(`用 T_true=3.875 解: angle=${ang.toFixed(2)} power=${(V*PF).toFixed(3)}`);
console.log(`  vs 实测 89.3/3.98  -> 差 ${Math.abs(ang-89.3).toFixed(2)}deg / ${Math.abs(V*PF-3.98).toFixed(3)}`);
console.log('');
// T_base 偏高还是 dT 偏高? 
// 无风N3 dist=20 的真实T: 识别表right.N3 在sd=20附近
// 从 _real.json 找无风或近无风N3样本看T_base准不准
console.log('=== T_base 校准检查 ===');
console.log('T_base(20)=3.9165. 但前面_diag_n3_time3显示 T_model 整体mean err=-0.007, sd=0.077');
console.log('即 T_base+dT 对19个实测样本平均只偏低0.007s —— 模型整体不偏.');
console.log('这个89.3场景的+0.093s偏差, 可能是单个样本的dT对下风响应不够, 或T_base在此sd段略高.');
console.log('但0.6deg的angle差, 在N3高角度区(>85)被tanA放大: denom从43.5->6.7, tanA从11->550.');
console.log('高角度区对T极敏感, 这是数学特性, 不是模型大错.');
