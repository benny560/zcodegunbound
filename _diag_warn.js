// 验证: 76°的ΔT=0.454>tol=0.12, 应该返回warn. 但图片显示△不是⚠.
// 检查fmtRound和返回值
const tol=0.12;
const T_raw=4.0776, T_new=3.6235;
const dT=Math.abs(T_new-T_raw);
console.log(`dT=${dT.toFixed(4)} tol=${tol} 超容忍? ${dT>tol}`);
// powerAtIntegerAngle 返回 {power, dT, warn:true}
// fmtRound: pr.warn=true -> 返回 "${angle}° / ${pr.power.toFixed(4)} ⚠"
// 但图片显示 "76° / 3.1956 △"
// △ 是哪来的? 看shotData和√/△/×按钮逻辑
console.log('\n△ 应该是"备选解"标记, 来自√/×/△按钮逻辑, 不是取整解的⚠');
console.log('检查: 取整解↓显示的是fF.txt, 如果warn应该是"76° / 3.1956 ⚠"');
console.log('但图片红框是"取整解↑ 76°/3.1956 △" — 等等, ↑是ceil=77才对!');
console.log('');
console.log('重新看图片: 红框是"取整解↑"对应76°? 还是"取整解↓"对应76°?');
console.log('raw=76.92. floor=76(↓), ceil=77(↑).');
console.log('如果图片红框在"取整解↑"且显示76°, 那floor/ceil搞反了!');
console.log('如果红框在"取整解↓"显示76°/3.1956, 那warn没显示是bug.');
