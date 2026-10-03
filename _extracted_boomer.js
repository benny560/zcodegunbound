const DISTANCE_PIXELS_PER_20SD=800/20, ELEVATION_PIXELS_PER_UNIT=516/13, MAX_DISPLAY_POWER=5, BOOMER_MAX_POWER=5;
const document={getElementById:(id)=>({value:id==="fixed-power"?"3.0":"0"})};
const EXCEL_VEHICLE={vehicles:{boomer:{name:'Boomer',gravity:0.608,massBase:85,massWindCoeff:0.005,massType:'wind_dependent',baseTime:3.00098,distanceScale:0.4,distanceMode:'scaled',elevationMode:'raw'}},getMass(id,w){const v=this.vehicles[id];return v.massType==='constant'?v.massBase:v.massBase-w*w*v.massWindCoeff}};
function getExcelUnits(vehicleId, distance, elevationInternal, sdParts) {
            const v = EXCEL_VEHICLE.vehicles[vehicleId];
            const rawElevation = elevationInternal / ELEVATION_PIXELS_PER_UNIT;
            const dist = v.distanceMode === 'raw' ? distance : distance * v.distanceScale;
            const elev = v.elevationMode === 'raw' ? rawElevation : (5.17 / 16) * rawElevation;
            const xScale = v.distanceMode === 'raw' ? DISTANCE_PIXELS_PER_20SD : DISTANCE_PIXELS_PER_20SD / v.distanceScale;
            const yScale = v.elevationMode === 'raw' ? ELEVATION_PIXELS_PER_UNIT : ELEVATION_PIXELS_PER_UNIT / (5.17 / 16);
            return { v, dist, elev, xScale, yScale };
        }
function calcExcelWindParams(vehicleId, windAngleDeg, windStrength) {
            const v = EXCEL_VEHICLE.vehicles[vehicleId];
            const mass = EXCEL_VEHICLE.getMass(vehicleId, windStrength);
            const windRad = windAngleDeg * Math.PI / 180;
            const xForce = Math.cos(windRad) * windStrength;
            const yForce = Math.sin(windRad) * windStrength;
            const xA = xForce / mass;
            const effGrav = v.gravity - yForce / mass;
            return { xA, effGrav, xForce, yForce, B14: windStrength, windMass: mass };
        }
function buildExcelResult(angle, velocity, time, wp, units) {
            if (velocity <= 0 || time <= 0 || wp.effGrav <= 0) return null;

            const radians = (angle + 0.00001) * Math.PI / 180;
            const cosA = Math.cos(radians);
            const sinA = Math.sin(radians);
            const xVelocity = velocity * cosA;
            const yVelocity = velocity * sinA;
            const maxHeight = (yVelocity * yVelocity) / (2 * wp.effGrav);

            const trajectory = [];
            const steps = 200;
            for (let i = 0; i <= steps; i++) {
                const tt = (i / steps) * time;
                trajectory.push({
                    x: (xVelocity * tt + 0.5 * wp.xA * tt * tt) * units.xScale,
                    y: (yVelocity * tt - 0.5 * wp.effGrav * tt * tt) * units.yScale
                });
            }

            return {
                angle,
                velocity: +velocity.toFixed(4),
                xVelocity: +xVelocity.toFixed(4),
                yVelocity: +yVelocity.toFixed(4),
                time: +time.toFixed(4),
                power: +velocity.toFixed(4),
                trajectory,
                maxHeight: +(maxHeight * units.yScale).toFixed(2),
                effectiveGravity: +wp.effGrav.toFixed(6),
                xA: +wp.xA.toFixed(6),
                windMass: +wp.windMass.toFixed(4),
                source: 'Excel原公式'
            };
        }
function calcExcelCenterTrajectory(vehicleId, angle, distance, windAngleDeg, windStrength, sdParts, elevationInternal) {
            const units = getExcelUnits(vehicleId, distance, elevationInternal, sdParts);
            const wp = calcExcelWindParams(vehicleId, windAngleDeg, windStrength);
            if (wp.effGrav <= 0) return null;

            const radians = (angle + 0.00001) * Math.PI / 180;
            const cosA = Math.cos(radians);
            const sinA = Math.sin(radians);
            const tanA = sinA / cosA;
            if (tanA <= 0) return null;

            const excelDist = units.dist - units.elev / tanA;
            const denom = (2 * cosA * sinA) / wp.effGrav +
                          (2 * wp.xA * sinA * sinA) / (wp.effGrav * wp.effGrav);
            const velocitySquared = excelDist / denom;
            if (!Number.isFinite(velocitySquared) || velocitySquared <= 0) return null;

            const velocity = Math.sqrt(velocitySquared);
            const time = 2 * velocity * sinA / wp.effGrav;
            const displayVelocity = (units.dist - 0.5 * wp.xA * time * time) / (cosA * time);
            const result = buildExcelResult(angle, velocity, time, wp, units);
            return result ? { ...result, power: +displayVelocity.toFixed(4) } : null;
        }
function calcExcelFromTime(vehicleId, time, distance, windAngleDeg, windStrength, sdParts, elevationInternal) {
            const units = getExcelUnits(vehicleId, distance, elevationInternal, sdParts);
            const wp = calcExcelWindParams(vehicleId, windAngleDeg, windStrength);
            if (wp.effGrav <= 0 || time <= 0) return null;

            const denom = units.dist - 0.5 * wp.xA * time * time;
            if (denom <= 0) return null;
            const tanA = (units.elev + 0.5 * wp.effGrav * time * time) / denom;
            const angle = Math.atan(tanA) * 180 / Math.PI;
            if (angle <= 0 || angle >= 90) return null;

            const cosA = Math.cos((angle + 0.00001) * Math.PI / 180);
            const velocity = denom / (cosA * time);
            const result = buildExcelResult(angle, velocity, time, wp, units);
            return result ? { ...result, angleRaw: +angle.toFixed(2) } : null;
        }
function calcExcelFromPower(vehicleId, power, distance, windAngleDeg, windStrength, sdParts, elevationInternal) {
            if (power <= 0) return [];
            const f = (angle) => {
                const r = calcExcelCenterTrajectory(vehicleId, angle, distance, windAngleDeg, windStrength, sdParts, elevationInternal);
                return r ? r.power - power : null;
            };
            const roots = [];
            let prevAngle = 1;
            let prevValue = f(prevAngle);
            for (let angle = 1.25; angle < 89; angle += 0.25) {
                const value = f(angle);
                if (prevValue !== null && value !== null) {
                    if (Math.abs(value) < 0.0001) {
                        roots.push(angle);
                    } else if (prevValue * value < 0) {
                        let lo = prevAngle, hi = angle;
                        for (let i = 0; i < 40; i++) {
                            const mid = (lo + hi) / 2;
                            const midValue = f(mid);
                            const loValue = f(lo);
                            if (midValue === null || loValue === null) break;
                            if (loValue * midValue <= 0) hi = mid;
                            else lo = mid;
                        }
                        roots.push((lo + hi) / 2);
                    }
                }
                prevAngle = angle;
                prevValue = value;
            }
            const results = [];
            roots.forEach(angleDeg => {
                // 只保留高射解(>45°): Turtle 恒力 / Boomer Hook Full / Boomer BS 背射 都用高抛弹道
                if (angleDeg <= 45) return;
                // 角化力: 高射角度取整(最接近的整数度), 反算该整数角度所需力度
                const roundedAngle = Math.round(angleDeg);
                const roundedResult = calcExcelCenterTrajectory(vehicleId, roundedAngle, distance, windAngleDeg, windStrength, sdParts, elevationInternal);
                if (!roundedResult) return;
                results.push({
                    ...roundedResult,
                    angle: roundedAngle,
                    angleRaw: +angleDeg.toFixed(2),
                    power: +roundedResult.power.toFixed(4),
                    type: '高射'
                });
            });
            // 大角在前
            results.sort((a, b) => b.angle - a.angle);
            return results;
        }
function simBoomerTrajectory(power, angleDeg, wp, elevExcel, dt, tmax) {
            if (dt === undefined) dt = 0.002;
            if (tmax === undefined) tmax = 16;
            const Vo = power;
            const rad = angleDeg * Math.PI / 180;
            const xA = wp.xA, effGrav = wp.effGrav;
            // RK4 状态 [x, y, vx, vy]
            let s = [0, elevExcel, Vo * Math.cos(rad), Vo * Math.sin(rad)];
            const deriv = (st) => [st[2], st[3], xA, -effGrav];
            let t = 0, wentBack = false, prevVx = s[2], maxX = 0;
            // 轨迹采样: 每隔一定步采样, 收集<=200点用于绘制
            const sampleEvery = Math.max(1, Math.round((tmax / dt) / 200));
            const traj = [{x: s[0], y: s[1]}];
            let stepCnt = 0;
            for (let i = 0; i < 100000; i++) {
                const k1 = deriv(s);
                const s2 = s.map((v, j) => v + k1[j] * dt / 2);
                const k2 = deriv(s2);
                const s3 = s.map((v, j) => v + k2[j] * dt / 2);
                const k3 = deriv(s3);
                const s4 = s.map((v, j) => v + k3[j] * dt);
                const k4 = deriv(s4);
                s = s.map((v, j) => v + (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]) * dt / 6);
                t += dt;
                if (s[2] < 0 && prevVx >= 0) wentBack = true; // 水平速度由正转负 = 回旋
                prevVx = s[2];
                if (s[0] > maxX) maxX = s[0];
                stepCnt++;
                if (stepCnt % sampleEvery === 0) traj.push({x: s[0], y: s[1]});
                if (s[1] < 0 && t > dt) break; // 落地
                if (t > tmax) break;
            }
            // 确保最后一个点(落地点)被收录
            traj.push({x: s[0], y: s[1]});
            return { landingX: s[0], landingT: t, wentBack, maxX, trajectory: traj };
        }
function calcBoomerTestPower(angleDeg, wp, targetDist, elevExcel) {
            let lo = 0.1, hi = 6;
            let loR = simBoomerTrajectory(lo, angleDeg, wp, elevExcel);
            let hiR = simBoomerTrajectory(hi, angleDeg, wp, elevExcel);
            // 单调性: 力度越大落点越远(无回旋时成立)
            if (loR.landingX >= targetDist) return null; // 最小力度已超
            if (hiR.landingX < targetDist) return null;  // 最大力度仍不够
            for (let it = 0; it < 50; it++) {
                const mid = (lo + hi) / 2;
                const r = simBoomerTrajectory(mid, angleDeg, wp, elevExcel);
                if (r.landingX < targetDist) lo = mid; else hi = mid;
            }
            return (lo + hi) / 2;
        }
function calcBoomerTestAngle(power, wp, targetDist, elevExcel, sel) {
            const step = 0.3;
            const roots = [];
            let prevA = 5, prevR = simBoomerTrajectory(power, prevA, wp, elevExcel);
            let prevDelta = prevR.landingX - targetDist;
            for (let a = 5 + step; a <= 89.9; a += step) {
                const r = simBoomerTrajectory(power, a, wp, elevExcel);
                const delta = r.landingX - targetDist;
                // 检测穿过target(符号变化), 排除回旋突变(落点跳变过大)
                if (prevDelta !== 0 && prevDelta * delta < 0 && Math.abs(r.landingX - prevR.landingX) < Math.abs(targetDist) * 2 + 4) {
                    let lo = prevA, hi = a, dLo = prevDelta;
                    for (let it = 0; it < 50; it++) {
                        const mid = (lo + hi) / 2;
                        const dm = simBoomerTrajectory(power, mid, wp, elevExcel).landingX - targetDist;
                        if (dLo * dm <= 0) hi = mid; else { lo = mid; dLo = dm; }
                    }
                    const rootA = (lo + hi) / 2;
                    const rf = simBoomerTrajectory(power, rootA, wp, elevExcel);
                    if (Math.abs(rf.landingX - targetDist) < 0.05) {
                        roots.push({ angle: rootA, result: rf });
                    }
                }
                prevA = a; prevR = r; prevDelta = delta;
            }
            if (roots.length === 0) return null;
            const pool = (sel === 'hook') ? roots.filter(r => r.result.wentBack) : roots;
            if (pool.length === 0) return null;
            return pool.reduce((best, r) => r.angle > best.angle ? r : best, pool[0]);
        }
function calcBoomerTestMode(modeType, fixedVal, distance, windAngleDeg, windStrength, sdParts, elevationInternal) {
            const units = getExcelUnits('boomer', Math.abs(distance), elevationInternal, sdParts);
            const wp = calcExcelWindParams('boomer', windAngleDeg, windStrength);
            if (wp.effGrav <= 0) return null;
            // 背射: 目标在身后, excelDist取负(落点为负值)
            const isBackshot = (modeType === 'bs');
            const targetDist = isBackshot ? -Math.abs(units.dist) : units.dist;
            const elev = units.elev;

            let result = null;
            if (modeType === 'time') {
                // BOMB: 固定时间T, 闭式解给出初始angle/power, 再用数值积分验证
                const T = fixedVal;
                if (T <= 0) return null;
                const denom = targetDist - 0.5 * wp.xA * T * T;
                if (denom <= 0.001) return null;
                const tanA = (elev + 0.5 * wp.effGrav * T * T) / denom;
                const angle = Math.atan(tanA) * 180 / Math.PI;
                if (angle <= 0 || angle >= 90) return null;
                const cosA = Math.cos((angle + 0.00001) * Math.PI / 180);
                const power = denom / (cosA * T);
                if (power <= 0 || power > MAX_DISPLAY_POWER) return null;
                // 数值验证: 用这个angle/power积分, 看落点是否真命中targetDist
                const sim = simBoomerTrajectory(power, angle, wp, elev);
                // BOMB 固定时间法在回旋时闭式解可能给假解, 数值验证标注
                result = {
                    angle, power, time: T, trajectory: sim.trajectory,
                    wentBack: sim.wentBack, windMass: wp.windMass,
                    landingErr: Math.abs(sim.landingX - targetDist),
                    source: 'BOMB固定时间'
                };
            } else if (modeType === 'angle') {
                // Hook: 固定角度, 数值找力度
                const angle = fixedVal;
                const power = calcBoomerTestPower(angle, wp, targetDist, elev);
                if (power === null || power > MAX_DISPLAY_POWER) return null;
                const sim = simBoomerTrajectory(power, angle, wp, elev);
                result = {
                    angle, power, time: sim.landingT, trajectory: sim.trajectory,
                    wentBack: sim.wentBack, windMass: wp.windMass,
                    landingErr: Math.abs(sim.landingX - targetDist),
                    source: 'Hook固定角度'
                };
            } else if (modeType === 'power' || modeType === 'bs' || modeType === 'hook') {
                // Hook Full / 背射 / 折射回旋: 固定力度, 数值找高抛角度
                // 'hook' 只取回旋解(wentBack): 球先飞出再折回命中前方目标
                const power = fixedVal;
                const sol = calcBoomerTestAngle(power, wp, targetDist, elev, modeType === 'hook' ? 'hook' : 'high');
                if (sol === null) return null;
                result = {
                    angle: sol.angle, power, time: sol.result.landingT, trajectory: sol.result.trajectory,
                    wentBack: sol.result.wentBack, windMass: wp.windMass,
                    landingErr: Math.abs(sol.result.landingX - targetDist),
                    source: modeType === 'bs' ? 'BS背射(满力找角)' : (modeType === 'hook' ? '折射回旋(满力回旋解)' : 'Hook Full(满力找角)')
                };
            }
            return result;
        }
function calcBoomerModes(distance, windInfluence, windAngleDeg, windStrength, sdParts, elevationInternal) {
            const results = [];
            const hasElevation = Math.abs(elevationInternal) > 0.001;
            // 风区判定(射击坐标系, 风向已按攻击方向镜像): windX<0=逆风, 回旋系(背射)才生效
            const windX = Math.cos(windAngleDeg * Math.PI / 180) * windStrength;
            const isHeadwind = windX < -0.01;
            // 回旋系力度取'力度'输入框(默认3.0): 背射/折射支持任意力(1.0/2.0等)
            const _pwEl = document.getElementById('fixed-power');
            const hookPower = (_pwEl && Number.isFinite(parseFloat(_pwEl.value)) && parseFloat(_pwEl.value) > 0) ? parseFloat(_pwEl.value) : 3.0;

            // 基准求解器: 给定 (mode, 风, 落差, distance符号) 算单个结果
            const solveAt = (mode, wd, w, elev, dist) => {
                const d = (mode.type === 'bs') ? -Math.abs(dist) : dist;
                if (mode.type === 'time') {
                    return calcExcelFromTime('boomer', mode.time, d, wd, w, sdParts, elev);
                }
                if (mode.type === 'angle') {
                    return calcExcelCenterTrajectory('boomer', mode.angle, d, wd, w, sdParts, elev);
                }
                // power / bs: 取第一个(高射)解
                const ar = calcExcelFromPower('boomer', mode.power, d, wd, w, sdParts, elev);
                return ar.length ? ar[0] : null;
            };
            // 闭式解无法感知回旋: 用数值积分给结果打回旋标记(wentBack), 并顺带生成像素轨迹供画布
            const tagWentBack = (r) => {
                if (!r) return r;
                try {
                    const wp0 = calcExcelWindParams('boomer', windAngleDeg, windStrength);
                    const u0 = getExcelUnits('boomer', Math.abs(distance), elevationInternal, sdParts);
                    const simT = simBoomerTrajectory(r.velocity || r.power, r.angle, wp0, u0.elev);
                    r.wentBack = simT.wentBack;
                    if (simT.trajectory && simT.trajectory.length > 1) {
                        r.trajectory = simT.trajectory.map(p => ({ x: p.x * u0.xScale, y: p.y * u0.yScale }));
                    }
                } catch (e) {}
                return r;
            };

            for (const _m of BOOMER_MODES) {
                // 回旋系打法(背射)仅逆风生效, 顺风/无风不与直飞系混显
                if (_m.sector === 'against' && !isHeadwind) {
                    results.push({ ..._m, result: null, failReason: 'needHeadwind' });
                    continue;
                }
                const mode = (_m.type === 'bs') ? { ..._m, power: hookPower } : _m;
                // 无风基准 (风=0, 落差=0)
                const noWindBase = solveAt(mode, 0, 0, 0, distance);
                // 去落差基准 (同风, 落差=0)
                const zeroElevBase = (windStrength > 0 || hasElevation) ? solveAt(mode, windAngleDeg, windStrength, 0, distance) : null;
                // BS 背射: 距离取负
                const effDist = (mode.type === 'bs') ? -Math.abs(distance) : distance;

                let finalResult = null;
                let failReason = null;
                if (mode.type === 'time') {
                    finalResult = calcExcelFromTime('boomer', mode.time, effDist, windAngleDeg, windStrength, sdParts, elevationInternal);
                } else if (mode.type === 'angle') {
                    finalResult = calcExcelCenterTrajectory('boomer', mode.angle, effDist, windAngleDeg, windStrength, sdParts, elevationInternal);
                    if (finalResult) finalResult = { ...finalResult, fixedAngle: mode.angle };
                } else if (mode.type === 'power' || mode.type === 'bs') {
                    const ar = calcExcelFromPower('boomer', mode.power, effDist, windAngleDeg, windStrength, sdParts, elevationInternal);
                    if (ar.length) {
                        ar.forEach((r, idx) => {
                            results.push({
                                ...mode,
                                name: ar.length > 1 ? `${mode.name} (${r.type})` : mode.name,
                                result: { ...tagWentBack({ ...r }), fixedPower: mode.power },
                                noWindBase, zeroElevBase,
                            });
                        });
                        continue;
                    }
                    failReason = 'impossible';
                }

                if (!finalResult) {
                    results.push({ ...mode, result: null, failReason: failReason || 'impossible', noWindBase, zeroElevBase });
                    continue;
                }
                if (finalResult.power > BOOMER_MAX_POWER) {
                    results.push({ ...mode, result: null, failReason: 'overpower', noWindBase, zeroElevBase });
                    continue;
                }
                results.push({
                    ...mode,
                    result: tagWentBack(finalResult),
                    noWindBase, zeroElevBase,
                });
            }
            return results;
        }
function buildBoomerFan(distance, windAngleDeg, windStrength, sdParts, elevationInternal) {
            const wp = calcExcelWindParams('boomer', windAngleDeg, windStrength);
            const u = getExcelUnits('boomer', Math.abs(distance), elevationInternal, sdParts);
            const fan = [];
            for (let a = 5; a <= 89; a += 2) {
                const sim = simBoomerTrajectory(3.0, a, wp, u.elev, 0.012);
                if (!sim.trajectory || sim.trajectory.length < 2) continue;
                const cls = !sim.wentBack ? 'direct' : (sim.landingX < 0 ? 'bs' : 'hook');
                fan.push({ angle: a, _noLabel: true, _lineWidth: 1.2,
                    trajectory: sim.trajectory.map(p => ({ x: p.x * u.xScale, y: p.y * u.yScale })),
                    _color: cls === 'hook' ? 'rgba(245,158,11,0.55)' : cls === 'bs' ? 'rgba(239,68,68,0.55)' : 'rgba(100,116,139,0.25)' });
            }
            return fan;
        }
function boomerChartAngle(power, wp, targetDist, elev, wantBack) {
            const dt = 0.008, step = 1.0;
            const roots = [];
            let prevA = 5, prevR = simBoomerTrajectory(power, prevA, wp, elev, dt);
            let prevD = prevR.landingX - targetDist;
            for (let a = 5 + step; a <= 89.9; a += step) {
                const r = simBoomerTrajectory(power, a, wp, elev, dt);
                const d = r.landingX - targetDist;
                if (prevD !== 0 && prevD * d < 0 && Math.abs(r.landingX - prevR.landingX) < Math.abs(targetDist) * 2 + 4) {
                    let lo = prevA, hi = a, dl = prevD;
                    for (let it = 0; it < 30; it++) {
                        const mid = (lo + hi) / 2;
                        const dm = simBoomerTrajectory(power, mid, wp, elev, dt).landingX - targetDist;
                        if (dl * dm <= 0) hi = mid; else { lo = mid; dl = dm; }
                    }
                    const A = (lo + hi) / 2;
                    const rf = simBoomerTrajectory(power, A, wp, elev, dt);
                    if (Math.abs(rf.landingX - targetDist) < 0.08) roots.push({ a: A, back: rf.wentBack });
                }
                prevA = a; prevR = r; prevD = d;
            }
            const pool = wantBack ? roots.filter(r => r.back) : roots;
            if (!pool.length) return null;
            return pool.reduce((b, r) => r.a > b.a ? r : b).a;
        }
const BOOMER_MODES = [
            // 风区分区(对照 boomer revolution.xlsm): sector='any' 直飞系(顺风/逆风均可)
            // sector='against' 回旋系, 仅逆风(水平风往射击反方向吹, cos(wa)*ws<0)生效
            // BOMB: 固定飞行时间 (源表 BOMER!tiempo=3.00098)
            { name: 'BOMB',      type: 'time',  time: 3.00098, sector: 'any' },
            // Hook 固定角度 (源表 Hooke/Hook MENOS): 固定角, 算力度
            { name: 'Hook 35°',  type: 'angle', angle: 35, sector: 'any' },
            { name: 'Hook 40°',  type: 'angle', angle: 40, sector: 'any' },
            { name: 'Hook 45°',  type: 'angle', angle: 45, sector: 'any' },
            { name: 'Hook 50°',  type: 'angle', angle: 50, sector: 'any' },
            { name: 'Hook 55°',  type: 'angle', angle: 55, sector: 'any' },
            // Hook Full: 满力, 算角度 (源表 HOOKFUL)
            { name: 'Hook Full', type: 'power', power: 3.0, sector: 'any' },
            // BS 背射: distance取负(身后), 满力, 算角度 (源表 BS; 需逆风吹回)
            { name: 'BS 背射',   type: 'bs',    power: 3.0, sector: 'against' },
        ];
module.exports={calcBoomerModes,calcBoomerTestMode,calcExcelCenterTrajectory,BOOMER_MODES,buildBoomerFan,boomerChartAngle,calcExcelWindParams};
