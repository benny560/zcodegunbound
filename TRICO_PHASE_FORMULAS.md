# Trico 相位公式完整文档

> 本文档记录 Trico 3in1 计算器的全部相位公式细节，供后续推导、校验、扩展使用。
> 最后更新：2026-06-25

---

## 一、物理参数（权威值）

| 参数 | 值 | 说明 |
|------|-----|------|
| `gravity` G | 430 | 体系A（G=430物理）重力加速度 |
| `mass` | 0.23 | 炮弹质量（风加速度换算） |
| `PF` (power factor) | 0.004332712 | 力度→速度换算：V = power / PF |
| `ELEVATION_PIXELS_PER_UNIT` | 516/13 ≈ 39.69 | 落差单位→像素：elevPx = elevUI × 516/13 |
| `DISTANCE_PIXELS_PER_20SD` | 800/20 = 40 | sd→像素距离：xDist = sd × 40 |
| `MAX_DISPLAY_POWER` | 5 | 最大力度（超过则无解） |
| `SPIN_RADIUS` R | 35 | 三球绕中心弹的旋转半径（px） |
| `OFFSET_RAMP_RATE` | 2 | 侧弹 offset 渐增速率（0.5s 达到满半径 R） |

### 1.1 风力公式（Excel 权威）
```
force = windStrength - 1           （纯逆风 180°除外，用原始 windStrength）
windX = cos(windAngle) × force     （水平风力分量）
windY = sin(windAngle) × force     （垂直风力分量）
xA = windX / mass                  （水平风加速度 px/s²）
effGrav = G - windY / mass         （有效重力：风Y减小重力）
```

### 1.2 omega 模型（角速度，随速度 V 变化的幂律）
```
right: omega = 0.023623 × V^0.764315
left:  omega = 0.687878 × V^0.299291
```
其中 V = power / PF（初速度）。

> **重要修正**：旧代码用常数 `OMEGA_R=0.5571, OMEGA_L=0.6544`，算出的圈数比真实值小约 4 倍。
> FINDINGS 文档第 60-65 行已标定正确幂律模型。

---

## 二、N 的物理本质：三球 3in1 命中相位

### 2.1 三球模型
Trico 三颗炮弹：
- **中心弹**（ball0）：offset = 0，直射
- **侧弹①**（ball1）：+R 方向偏移
- **侧弹②**（ball2）：-R 方向偏移（与 ball1 关于中心对称）

每个时刻 t，侧弹相对中心弹的偏移：
```
rotAngle = omega × t × angleModifier     （angleModifier: right=-1, left=+1）
offsetFactor = min(OFFSET_RAMP_RATE × t, 1)   （渐增到 1，0.5s 满半径）
ballOffset_x = ±R × offsetFactor × cos(rotAngle)
ballOffset_y = ±R × offsetFactor × sin(rotAngle)
```

### 2.2 命中相位约束（rot/pi）
3in1 命中 = 三球在落地时汇聚到目标点。每个 N 对应一个特定的**落地旋转相位**：

从识别表（N1-N3，权威数据）反推每个 N 的 `rot/pi = omega × T / π`：

⚠️ **重要修正**：rot/pi **不是常数**，而是 **sd 的二次函数**。早期版本误用常数导致圈数不随距离变化（错误）。
实际 rot/pi 随 sd 变化（如 rightN3：sd=5→5.33，sd=40→5.10），圈数也随之变化。

#### 各 N 的 rot/pi(sd) 二次多项式（rot/pi = c0 + c1·sd + c2·sd²）

| 方向 | N | c0 | c1 | c2 | 来源 |
|------|---|----|----|----|----|
| right | 1 | 1.2638 | -0.04410 | 0.0019351 | R1 识别表拟合 |
| right | 2 | 2.9244 | -0.02620 | 0.0007192 | R2 识别表拟合 |
| right | 3 | 5.4193 | -0.01912 | 0.0002769 | R3 识别表拟合 |
| right | 4 | 7.9144 | -0.01168 | 0.0001761 | N2/N3 外推(2×N3-N2) |
| left | 2 | 3.1883 | -0.01990 | 0.0000615 | L2 识别表拟合 |
| left | 3 | 5.4637 | -0.01490 | 0.0000595 | L3 识别表拟合 (rot/pi, 未变) |
| left | 4 | 7.7391 | -0.00990 | 0.0000575 | N2/N3 外推(2×N3-N2) |

> 注意 N1 的 c2 较大（0.0019），因为 N1 低角度数据离散度高。
> N4 多项式 = 2×N3多项式 - N2多项式（层级线性外推）。

#### 圈数随距离变化示例（right N3）
| sd | angle | power | 圈数 | rot/pi |
|----|-------|-------|------|--------|
| 5 | 87° | 3.76 | 2.67 | 5.331 |
| 20 | 76° | 3.74 | 2.57 | 5.148 |
| 40 | 62° | 3.93 | 2.55 | 5.098 |

> 圈数从 sd=5 的 2.67 降到 sd=40 的 2.55——**近距转得更多，远距转得更少**，符合物理（近距角度高、滞空久、转得多）。

### 2.3 N4 多项式推导
N4 的 rot/pi(sd) 多项式由 N2/N3 外推：**c_N4 = 2×c_N3 − c_N2**（每项系数分别外推）。
这是"层级线性外推"——假设 N3→N4 的变化与 N2→N3 相同。

> 早期用"rot/pi 常数 + N 的二次外推"（N4=8.2243）是错误的方法，已废弃。
> 正确方法：rot/pi(sd) 多项式 + N4 系数外推。

### 2.4 求解算法（rot/pi(sd) 约束）
给定 sd 和 rot/pi(sd) 目标值，迭代求解 angle/power/T：
```
约束: omega(V) × T = rot_pi(sd) × π       （rot/pi 现在是 sd 的函数）
距离: V × cos(angle) × T = sd × 40
高度: V × sin(angle) = 0.5 × G × T

迭代(需阻尼避免振荡):
  1. T = 4.0 (初始)
  2. tan(angle) = 0.5×G×T² / (sd×40)  →  angle
  3. V = sd×40 / (cos(angle) × T)  →  power = V × PF
  4. omega = 幂律(V)
  5. T_new = rot_pi(sd) × π / omega
  6. 收敛 |T_new - T| < 1e-4, 否则 T = 0.5×(T + T_new) 重复
```

> **阻尼**（T = 0.5×(T+T_new)）必须，否则 omega↔T 形成正反馈振荡不收敛。

### 2.5 方法验证（rot/pi(sd) 多项式 vs 识别表）
| 方向 | N | 识别点 | 匹配(±1°/0.1) | 角度均偏 | 力度均偏 |
|------|---|--------|-------------|---------|---------|
| right | N2 | 40 | **40/40 (100%)** | 0.28° | 0.022 |
| right | N3 | 36 | **36/36 (100%)** | 0.50° | 0.034 |
| left | N2 | 33 | 30/33 (91%) | 0.64° | 0.063 |
| left | N3 | 40 | **40/40 (100%)** | 0.25° | 0.054 |

N2/N3 精度极高（均偏 0.25-0.64°，100% 匹配）。N1 较差（3.8°，低角度数据离散）。

### 2.6 left N3 重标定记录（2026-07-20）

用户反馈"右攻左 N3 远距打不准"，提供 7 点 0 风无落差实测锚点：
```
sd=20→70.5/3.21, sd=25→65.4/3.27, sd=30→60.4/3.37,
sd=35→55.5/3.49, sd=40→50.8/3.64, sd=45→46.4/3.82, sd=49→43.1/3.99
```

**问题诊断**：旧 left:3 表 angle 系统偏高 0.5°-2.1°（误差随 sd 增大而加剧），根因是旧表 gPhase≈0.886 比实测 0.811 系统偏高 9%。实测 gPhase 守恒度极高（std 仅 0.0012，范围 0.8095-0.8129），数据质量优于识别表。另发现旧表 sd=39-42 段有录入 bug（angle 先降后升再降）。

**重标定方法**（同 right:3 双基准重标定流程）：
- sd=20-49：cubic angle 拟合 + gPhase cubic 反算 power（cubic max 残差 0.011°）
- sd=1-19：保留旧表（无实测，不破坏；与 right:3 处理一致）
- sd=50：sd=49 切线外推

**结果**：7 实测锚点 0 偏差精确复现（ΔA=0.00°, ΔP=0.000）。`phaseFormulas['left'][3]` 重拟合为 `[0.79486599, 0.00125450, -0.00002894, 0.00000020]`（旧 `[0.8856715, -0.01400086, 0.00066965, -0.00000926]` 作废）。

### 2.7 right N3 重标定记录（2026-07-20）

用户提供 10 点 0 风无落差实测锚点（左打右 N3 = `right:3`，sd=14-26）：
```
sd=14→80.2/3.72, sd=15→79.4/3.72, sd=16→78.7/3.73, sd=17→78.0/3.73,
sd=18→77.2/3.73, sd=19→76.5/3.74, sd=20→75.8/3.74, sd=22→74.3/3.75,
sd=24→72.8/3.76, sd=26→71.4/3.78
```

**实测 gPhase 守恒度极好**：均值 0.833，std 0.0021，斜率仅 -0.0001/sd（几乎完全守恒），外推可靠性高。

**问题诊断**（2026-07-05 双基准版的遗留问题）：sd=21-37 段 power 系统偏高 0.05-0.07（angle 偏高 0.5°-0.8°）。根因是旧版用 sd=20/40 双基准做 cubic 时，中段 cubic 曲率没控制好（power 增长过快）。实测 sd=26=3.78 与旧表 sd=27=3.85 之间出现 0.07 跳变。

**sd=40 外推验证**：用 gPhase 守恒假设（斜率近 0）+ 2 次 angle 多项式外推 sd=40 = 61.27°/3.98，与现表 61.0°/3.95 仅差 0.3°/0.026，确认现表 sd=40 基准可信，可作为 Hermite 远端锚点。

**重标定方法**（三段式）：
- sd=1-13：保留旧表（无实测，不破坏）
- sd=14-26：cubic angle 拟合 + gPhase cubic 反算 power（10 实测点，max 残差 0.04°）
- sd=27-40：Hermite 平滑外推（sd=26 实测 → sd=40 外推锚点 61.3°/3.98，切线约束）
- sd=41-50：保留旧表（无实测，不破坏）

**结果**：10 实测锚点 0 偏差精确复现（ΔA=0.00°, ΔP=0.000）。angle 全程严格单调，power 仅 sd=13→14 衔接处微回退 0.01（新旧段交界，无影响）。`phaseFormulas['right'][3]` 保留 `[0.81710158, 0.0012643, -0.00004293, 0.00000045]` 不动（用 sd=14-26 重拟合会在 sd=50 跑飞到 gPhase=1.30；现系数基于 sd=20-50 拟合覆盖广，实测 0.833 vs 公式 0.828 仅差 0.005）。

---

## 三、识别表（empiricalPhaseTables）

### 3.1 数据来源
- **R1/R2/R3**（right N1/N2/N3）：`识别数据.xlsx`，无风实测
- **L2/L3**（left N2/N3）：同上
- **N4**（right:4 / left:4）：rot/pi 相位约束法推导（无实测，物理推理）
- **left:1**：无数据（不存在 left N1）

格式：`[sd, angle, power]`，sd 范围 1-40（步进 0.5-1）。

### 3.2 识别表插值（getEmpiricalPhaseAnchor）
```js
getEmpiricalPhaseAnchor(side, spinN, distance)
```
- 参数 `distance` = **sd（识别距离单位）**，不是 UI 距离
- 在 [sd_min, sd_max] 范围内线性插值 angle/power
- 超出范围返回 null（right:1 有 2.0 的尾部外推容限）

> **单位陷阱**（RULES.md 第一条）：`distance` = sd = UI 输入值，三者同一量，**禁止换算**。

### 3.3 无风结果（calcNoWindFromTable）
无风（ws=0, elev=0）时直接用识别表插值：
```js
calcNoWindFromTable(sdParts, side, spinN, distance, elevationInternal)
  → getEmpiricalPhaseAnchor(side, spinN, abs(distance))  // 注意:直接用distance作sd
  → 用无风物理(G=430, xA=0)生成 trajectory/time
  → angle/power 完全取自表（0 偏差）
```
识别表 angle/power 在 G=430 抛物线下**不自洽**（落点误差上千像素），所以无风必须走纯插值。

---

## 四、相位公式（phaseFormulas / gPhase）

### 4.1 gPhase 定义
```js
localGPhase = 2 × power × sin(angle) / anchorTime
```
其中 `anchorTime = anchorDist / (cos(angle) × power)`，`anchorDist = sd / conv`（conv = sdParts/8）。

展开：
```
localGPhase = 2 × power² × sin(angle) × cos(angle) / anchorDist
```

gPhase 是**体系B（Excel）的有效重力系数**，随 sd 变化。

### 4.2 phaseFormulas 系数（3 次多项式）
```
gPhase(sd) = c0 + c1×sd + c2×sd² + c3×sd³
```

| side | N | c0 | c1 | c2 | c3 | 来源 |
|------|---|----|----|----|----|------|
| right | 1 | 0.86144931 | -0.02835377 | 0.00238252 | -0.00006503 | R1 识别表拟合 |
| right | 2 | 0.75256044 | 0.0081878 | -0.00038579 | 0.00000554 | R2 识别表拟合 |
| right | 3 | 0.87607799 | -0.00300752 | 0.00005641 | -0.0000003 | R3 识别表拟合 |
| right | 4 | 0.54592563 | 0.04536129 | -0.00218172 | 0.00003102 | N4 推导表拟合 |
| left | 2 | 0.75819029 | 0.00181701 | 0.00004231 | -0.00000217 | L2 识别表拟合 |
| left | 3 | 0.79486599 | 0.00125450 | -0.00002894 | 0.00000020 | L3 识别表拟合 (2026-07-20 重标) |
| left | 4 | 1.08415035 | -0.04875384 | 0.00233429 | -0.00003294 | N4 推导表拟合 |

### 4.3 求值（evalEmpiricalPhaseFormula）
```js
evalEmpiricalPhaseFormula(side, spinN, distance)
  → sd = abs(distance)    // distance = sd
  → g = Σ coeffs[i] × sd^i
  → 返回 g（gPhase）
```

### 4.4 核对结论
用识别表 localGPhase 重新拟合，**5 组（N1-N3）系数逐位复现**，无错误。
N4 系数从 rot/pi 推导表拟合，残差均 0.05-0.06（同 N1-N3 量级）。

---

## 五、有风计算路径

### 5.1 路由（calcWithWind）
```
calcWithWind(sdParts, side, spinN, distance, elevationInternal, windAngle, windStrength)
  ├─ 无风(ws=0, elev=0, dist>0): calcNoWindFromTable → 识别表插值（0偏差）
  ├─ calcTimePhysicsSolver（落地时间求解器, N1-N4+背射）
  ├─ calcRederivedPhasePhysicsN123（rederived, N1-3, 75系数补偿）
  └─ calcBackshotWithWind（背射专用）
```

### 5.2 落地时间求解器（calcTimePhysicsSolver）
```
T_有风 = T_无风(sd) + ΔT(wy)
T_无风 = a + b × sd        （timePhysicsNoWindT 系数）
ΔT = 0.0243 - 0.00066 × (wy / mass)   （范围约 [-0.22, +0.15]s）

给定 T_target, 角度扫描 a ∈ [1°, 89°] 步长 0.1°:
  V = (0.5 × effGrav × T² + elev) / (sinA × T)
  power = V × PF, 过滤 power ∈ (0, 5]
  xLand = V × cosA × T + 0.5 × xA × T²
  选 xLand 最接近 xDist 的角度 (xErr < 50px)

风向取整: cosW > 0.01 顺风 → 向上进位; cosW < -0.01 逆风 → 向下舍去
```

#### timePhysicsNoWindT 系数（T = a + b × sd）

| side | N | a | b |
|------|---|---|---|
| right | 1 | 1.7998 | -0.04357 |
| right | 2 | 2.8655 | -0.01427 |
| right | 3 | 4.1243 | -0.01039 |
| right | 4 | 5.1551 | -0.00594 |
| left | 2 | 2.3500 | -0.02304 |
| left | 3 | 3.4780 | -0.01085 |
| left | 4 | 4.8190 | -0.0180 |

> N4 系数从实测反推落地时间（y 方程）拟合。注意：N4 无风现在走识别表插值，T-fit 仅在有风时用。

### 5.3 角化力（powerAtAngleRaw）
角度取整前的小数角度（angleRaw）对应的力度：
```
求解器: V_raw = (0.5 × effGrav × T² + elev) / (sin(angleRaw) × T)
         powerAtAngleRaw = V_raw × PF
无风识别表路径: 用识别表插值角度（可能小数）算
缺失时(如rederived路径): powerAtAngleRaw ≈ power × sin(angle) / sin(angleRaw)  （近似）
```
用于显示"角化力调整量"：取整带来的力度变化。

---

## 六、背射（distance < 0）

### 6.1 判定
`distance < 0` 表示打身后目标。**calcTimePhysicsSolver 对 distance<0 返回 null**（背射物理完全不同，交由专用路径）。

### 6.2 背射物理
大逆风时炮弹向前发射，但风把球吹回身后落点。走 `calcBackshotWithWind`（或 rederived 的 signedExcelDist 路径）。

---

## 七、轨迹绘制

### 7.1 三球轨迹（calcTricoThreeBallsNewPhysics）
用**正确 omega 幂律模型**（非旧常数），生成三球螺旋轨迹：
- 中心弹直线
- 侧弹①/②绕中心做圆周运动（R=35），形成"合-分-合"循环
- 循环次数 = floor(rotationCount) + 1，rotationCount = omega × T / 2π

修正 omega 后的圈数：
| N | right 圈数 | left 圈数 |
|---|-----------|----------|
| N2 | 1.35 | 1.40 |
| N3 | 2.58 | 2.62 |
| N4 | 4.02 | 3.64 |

### 7.2 坐标缩放
x/y **独立缩放**（非等比），让轨迹填满画布宽高，符合游戏横向视角。
- 旧等比缩放导致 N3 高弧度轨迹被挤成竖条（宽度只有画布 56%）
- 独立缩放后所有 N 的轨迹填满画布

---

## 八、关键行号索引（gunbound_calculator.html）

修改后行号会漂移，用 grep 定位：

| 内容 | 定位关键词 |
|------|-----------|
| 物理参数 | `const TRICO` / `const TRICO_NEW` |
| 识别表 | `empiricalPhaseTables:` |
| 相位公式 | `phaseFormulas:` |
| T-fit 系数 | `timePhysicsNoWindT:` |
| gPhase 求值 | `evalEmpiricalPhaseFormula` |
| 识别表插值 | `getEmpiricalPhaseAnchor` |
| 无风插值 | `calcNoWindFromTable` |
| 落地时间求解器 | `calcTimePhysicsSolver` |
| 三球轨迹 | `calcTricoThreeBallsNewPhysics` |
| 路由入口 | `calcWithWind` |
| EXCEL_TRICO 闭合 | `grep "^        const EXCEL_TRICO\|^        };"` |

切片测试时 cut 范围必须覆盖到 EXCEL_TRICO 闭合行。

---

## 九、注意事项

1. **单位**（最高优先级）：distance = sd = UI 输入值，三者同一量，禁止换算。
2. **sdParts 默认 20**：所有测试用 sdParts=20。
3. **左射风向翻转**：测试左射时 windAngle 必须 `(180-wa)%360`。
4. **识别表不自洽**：G=430 抛物线下落点误差上千像素，无风必须走纯插值。
5. **omega 幂律**：不要用旧常数 OMEGA_R/L，要用 `0.023623×V^0.764315`（right）/ `0.687878×V^0.299291`（left）。
6. **N4 推导**：基于 rot/pi 相位约束（N1/N2/N3 二次外推），不是等差，不是去风还原。
