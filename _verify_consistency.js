const DISTANCE_PIXELS_PER_20SD=800/20;const ELEVATION_PIXELS_PER_UNIT=516/13;const EXCEL_VEHICLE = {
            // 车辆参数表
            vehicles: {
                boomer: {
                    name: 'Boomer',
                    gravity: 0.608,
                    massBase: 85,
                    massWindCoeff: 0.005, // mass = 85 - wind^2 * 0.005
                    massType: 'wind_dependent',
                    baseTime: 3.00098,
                    distanceScale: 1.0 / 3.75, // Excel: Hook!K18/3.75 (30SD→8)
                    distanceMode: 'scaled',
                    elevationMode: 'raw', // Excel: B11=B4 (=desnivel raw); (5.17/16)*C4 项恒为0(C4=0)
                    forkTimes: {
                        bomb: 3.00098,
                        hook1: 2.928,
                        hook2: 3.110,
                        hook3: 3.388,
                        hook4: 3.613,
                        hook5: 2.603,
                    },
                },
                turtle: {
                    name: 'Turtle',
                    gravity: 0.73,
                    massBase: 149,
                    massWindCoeff: 0.02, // mass = 149 - wind^2 * 0.02
                    massType: 'wind_dependent',
                    distanceScale: 1.0 / 3.75, // Excel: 'Turtle 30 parts'!B1/3.75 (45SD→12)
                    distanceMode: 'scaled',
                    elevationMode: 'raw', // Excel: C18=B3 (=altura raw); C17=(5.17/16)*C3 项恒为0(C3空)
                    forkTimes: {
                        timebomb: 4.98,
                        fork7: 6.18,
                        fork6: 4.24,
                        fork5: 3.37,
                        fork4: 2.665,
                        fork3: 2.07,
                        fork2: 1.574,
                        fork1: 1.086,
                    },
                },
                ice: {
                    name: 'ICE',
                    gravity: 0.608,
                    massBase: 168,
                    massType: 'constant',
                    baseTime: 3.00098,
                    distanceScale: 1.0 / 3.75, // Excel: C2/3.75 (5.5→1.467)
                    distanceMode: 'scaled',
                    elevationMode: 'raw', // Excel: 高度项 raw; (5.17/16)*desnível 修正项恒为0
                },
                jd: {
                    name: 'JD',
                    gravity: 0.608,
                    massBase: 168,
                    massType: 'constant',
                    baseTime: 3.00098,
                    distanceScale: 1.0 / 3.75, // Excel: B1/3.75 (16→4.267)
                    distanceMode: 'scaled',
                    elevationMode: 'raw', // Excel: 高度项 raw; (5.17/16)*C4 修正项恒为0
                },
                aduka: {
                    name: 'Aduka',
                    gravity: 0.608,
                    massBase: 168,
                    massType: 'constant',
                    baseTime: 3.00098,
                    distanceScale: 1.0 / 3.75, // 同JD/Grub
                    distanceMode: 'scaled',
                    elevationMode: 'raw',
                },
                grub: {
                    name: 'Grub',
                    gravity: 0.608,
                    massBase: 168,
                    massType: 'constant',
                    baseTime: 3.00098,
                    distanceScale: 1.0 / 3.75, // 同JD/Aduka
                    distanceMode: 'scaled',
                    elevationMode: 'raw',
                },
                // GunBound VIP 补充坦克 (参数基于OpenBound Mass组映射)
                bigfoot: {
                    name: 'Bigfoot',
                    gravity: 0.608,
                    massBase: 168,
                    massType: 'constant',
                    baseTime: 3.00098,
                    distanceScale: 1.0 / 3.75,
                    distanceMode: 'scaled',
                    elevationMode: 'raw',
                },
                dragon: {
                    name: 'Dragon',
                    gravity: 0.608,
                    massBase: 168,
                    massType: 'constant',
                    baseTime: 3.00098,
                    distanceScale: 1.0 / 3.75,
                    distanceMode: 'scaled',
                    elevationMode: 'raw',
                },
                mage: {
                    name: 'Mage',
                    gravity: 0.608,
                    massBase: 168,
                    massType: 'constant',
                    baseTime: 3.00098,
                    distanceScale: 1.0 / 3.75,
                    distanceMode: 'scaled',
                    elevationMode: 'raw',
                },
                knight: {
                    name: 'Knight',
                    gravity: 0.608,
                    massBase: 168,
                    massType: 'constant',
                    baseTime: 3.00098,
                    distanceScale: 1.0 / 3.75,
                    distanceMode: 'scaled',
                    elevationMode: 'raw',
                },
                lightning: {
                    name: 'Lightning',
                    gravity: 0.608,
                    massBase: 168,
                    massType: 'constant',
                    baseTime: 3.00098,
                    distanceScale: 1.0 / 3.75,
                    distanceMode: 'scaled',
                    elevationMode: 'raw',
                },
                wolf: {
                    name: 'Wolf',
                    gravity: 0.608,
                    massBase: 168,
                    massType: 'constant',
                    baseTime: 3.00098,
                    distanceScale: 1.0 / 3.75,
                    distanceMode: 'scaled',
                    elevationMode: 'raw',
                },
                asate: {
                    name: 'A.Sate',
                    gravity: 0.608,
                    massBase: 168,
                    massType: 'constant',
                    baseTime: 3.00098,
                    distanceScale: 1.0 / 3.75,
                    distanceMode: 'scaled',
                    elevationMode: 'raw',
                },
            },

            // 计算有效质量
            getMass(vehicleId, windStrength) {
                const v = this.vehicles[vehicleId];
                if (!v) return 100;
                if (v.massType === 'constant') return v.massBase;
                return v.massBase - windStrength * windStrength * v.massWindCoeff;
            },

            // 核心计算: 给定参数计算angle/power
            // dist, elev: Excel内部距离单位
            // T: 飞行时间
            // g: 重力
            // mass: 有效质量
            // windX, windY: 风力分量 (已含windCoeff, 原始值)
            calcCore(dist, elev, T, g, mass, windX, windY) {
                if (T <= 0 || dist <= 0 || mass <= 0) return null;
                const wax = windX / mass; // 风力水平加速度
                const way = windY / mass; // 风力垂直加速度
                const gEff = g - way;
                const effDist = dist - 0.5 * wax * T * T;
                const effElev = elev + 0.5 * gEff * T * T;
                if (effDist <= 0) return null;
                const tanA = effElev / effDist;
                const angle = Math.atan(tanA) * 180 / Math.PI;
                if (angle < 1 || angle > 89) return null;
                const cosA = Math.cos(angle * Math.PI / 180);
                const power = effDist / (cosA * T);
                return { angle, power, T };
            },

            // 无风计算 (简化版)
            calcNoWind(dist, elev, T, g) {
                if (T <= 0 || dist <= 0) return null;
                const tanA = (elev + g / 2 * T * T) / dist;
                const angle = Math.atan(tanA) * 180 / Math.PI;
                if (angle < 1 || angle > 89) return null;
                const cosA = Math.cos(angle * Math.PI / 180);
                const power = dist / (cosA * T);
                return { angle, power, T };
            },

            // 统一接口: 计算车辆弹道
            // sdParts: 屏幕分割数
            // vehicleId: 车辆ID
            // distance: SD距离
            // elevation: 落差 (像素)
            // windAngle: 风向 (度, 0=右, 90=上)
            // windStrength: 风力
            // timeKey: 时间参数 (Turtle用fork名, 其他忽略)
            calc(sdParts, vehicleId, distance, elevation, windAngle, windStrength, timeKey) {
                const v = this.vehicles[vehicleId];
                if (!v) return null;

                // Excel使用原始SD距离, distanceScale控制缩放
                // BOMER: raw dist, BoomerRevolution: dist/3.75, Turtle: dist/3.75
                const dist = distance * v.distanceScale;
                // 高度转换: Excel公式 h = (5.17/16) * elevation, 所有车辆统一
                const elev = (5.17 / 16) * elevation;

                // 风力分量
                const windRad = windAngle * Math.PI / 180;
                const windX = windStrength * Math.cos(windRad);
                const windY = windStrength * Math.sin(windRad);

                // 有效质量
                const mass = this.getMass(vehicleId, windStrength);

                // 飞行时间
                let T;
                if (v.forkTimes) {
                    // Turtle: 使用指定的时间
                    if (!timeKey || !v.forkTimes[timeKey]) return null;
                    T = v.forkTimes[timeKey];
                } else {
                    T = v.baseTime;
                }

                // 计算
                let result;
                if (windStrength > 0.01) {
                    result = this.calcCore(dist, elev, T, v.gravity, mass, windX, windY);
                } else {
                    result = this.calcNoWind(dist, elev, T, v.gravity);
                }

                if (!result) return null;

                return result;
            },

            // 获取车辆所有可用的时间选项 (用于UI)
            getTimeOptions(vehicleId) {
                const v = this.vehicles[vehicleId];
                if (!v) return [];
                if (v.forkTimes) {
                    return Object.entries(v.forkTimes).map(([key, time]) => ({
                        key, time, label: key === 'timebomb' ? '定时弹' : key.replace('fork', '叉')
                    }));
                }
                return [{ key: 'base', time: v.baseTime, label: '标准' }];
            },
        };function getExcelUnits(vehicleId, distance, elevationInternal, sdParts) {
            const v = EXCEL_VEHICLE.vehicles[vehicleId];
            const rawElevation = elevationInternal / ELEVATION_PIXELS_PER_UNIT;
            const dist = v.distanceMode === 'raw' ? distance : distance * v.distanceScale;
            const elev = v.elevationMode === 'raw' ? rawElevation : (5.17 / 16) * rawElevation;
            const xScale = v.distanceMode === 'raw' ? DISTANCE_PIXELS_PER_20SD : DISTANCE_PIXELS_PER_20SD / v.distanceScale;
            const yScale = v.elevationMode === 'raw' ? ELEVATION_PIXELS_PER_UNIT : ELEVATION_PIXELS_PER_UNIT / (5.17 / 16);
            return { v, dist, elev, xScale, yScale };
        }function calcExcelWindParams(vehicleId, windAngleDeg, windStrength) {
            const v = EXCEL_VEHICLE.vehicles[vehicleId];
            const mass = EXCEL_VEHICLE.getMass(vehicleId, windStrength);
            const windRad = windAngleDeg * Math.PI / 180;
            const xForce = Math.cos(windRad) * windStrength;
            const yForce = Math.sin(windRad) * windStrength;
            const xA = xForce / mass;
            const effGrav = v.gravity - yForce / mass;
            return { xA, effGrav, xForce, yForce, B14: windStrength, windMass: mass };
        }function buildExcelResult(angle, velocity, time, wp, units) {
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
        }function calcExcelCenterTrajectory(vehicleId, angle, distance, windAngleDeg, windStrength, sdParts, elevationInternal) {
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
        }function calcExcelFromTime(vehicleId, time, distance, windAngleDeg, windStrength, sdParts, elevationInternal) {
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
const EPP=516/13;
let pass=0,fail=0;
function chk(d,c){if(c){pass++;console.log("  PASS",d);}else{fail++;console.log("  FAIL",d);}}
console.log("=== Module1<->Module2 self-consistency (same shot) ===");
for (const vid of ["boomer","turtle","ice","jd","aduka","grub"]) {
  const d=12, e=1.5, wd=70, ws=6, T=3.00098;
  const m1 = calcExcelFromTime(vid, T, d, wd, ws, 20, e*EPP);
  if(!m1){console.log("  ["+vid+"] m1 null (unaimable)"); continue;}
  const ang = m1.angle;
  const m2 = calcExcelCenterTrajectory(vid, ang, d, wd, ws, 20, e*EPP);
  const powerDiff = m2 ? Math.abs(m2.power - m1.power) : 999;
  const msg = "["+vid+"] m1(ang="+ang.toFixed(2)+",pow="+m1.power.toFixed(3)+") m2(pow="+(m2?m2.power.toFixed(3):"null")+") diff="+powerDiff.toFixed(4);
  chk(msg, m2 && powerDiff < 0.01);
}
console.log("\nSelf-consistency: PASS="+pass+" FAIL="+fail);
process.exit(fail?1:0);
