// 复现图片场景: 右攻, dist=19.8, elev=-5.5, wind=16, windAngle=118
// side='right', N3
// 物理参数
const G = 430, PF = 0.004332712;
const DISTANCE_PIXELS_PER_20SD = 800/20;  // 40
const ELEVATION_PIXELS_PER_UNIT = 516/13;  // ~39.69
const sdParts = 20;
const conv = sdParts/8.0;  // 2.5

// 风力查找 (lookupWind 模拟, 见下面)
// 先看 lookupWind
