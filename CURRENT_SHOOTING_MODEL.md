# 当前射击模型说明

更新时间：2026-06-21

适用文件：`gunbound_calculator.html`

用途：本文用文字完整描述当前计算器的射击模型，供后续在现有基础上重建新版本。本文以 `CURRENT_FORMULAS.md` 与当前源码为准，不按旧 `natural-no-gates` 过渡版、不按旧护栏版、不按 OpenBound 数值常量版来理解。

## 1. 总体结构

当前计算器不是单纯查表工具，而是三层混合模型。

第一层是通用抛物线物理。所有角度、力度、距离、落差、风，最终都会进入水平加速度 `xA` 和有效重力 `effGrav` 这两个量，再用抛物线运动方程求解。

第二层是 Excel 车辆单位系。Boomer、Turtle、Ice、JD、Aduka、Grub 等车辆使用 Excel 距离、Excel 落差、车辆质量、固定时间打法和对应的风力单位。

第三层是 Trico 特殊相位模型。Trico N1-N3 用“识别无风相位基线 + 连续风/落差物理向量”自然反解；Trico N4 用“识别相位候选 + 相位闭合验证”收口。

当前重建时最重要的边界是：不要把最终角度/力度当作直接补偿对象。更合理的做法是让风、落差、距离先影响飞行时间、水平加速度和有效重力，再由同一个弹道方程自然推出角度和力度。

## 2. 输入层与单位换算

### 2.1 有效距离

UI 输入的距离不会直接参与全部计算，而是先叠加误差调整：

```text
effectiveDistance = distance + distanceError
```

例如距离为 `20`、误差为 `-1`，实际计算距离就是 `19`。

距离和像素的换算固定为：

```text
DISTANCE_PIXELS_PER_20SD = 800 / 20 = 40 px
xDistance = effectiveDistance * 40
```

也就是说 1 个距离单位约等于 40 像素。

### 2.2 落差

落差按用户基准换算：

```text
elevationInternal = elevationInput * (516 / 13)
```

正值表示目标比自己高，负值表示目标比自己低。

这个换算当前以 `516 / 13` 为准，不使用旧的 `520 / 13`。

### 2.3 力度和速度

通用速度换算为：

```text
velocity = power / 0.004332712
power = velocity * 0.004332712
```

普通车辆、部分轨迹展示、旧 Trico 可视化都会使用这个换算。Trico N4 recognition 内部另有自己的 `Tq/q` 单位，不能直接用普通车速度单位硬套。

### 2.4 最大显示力度

当前通用可用结果上限为：

```text
MAX_DISPLAY_POWER = 5
```

大多数输出中，超过 5 力不会作为可用结果显示。Trico 内部可能有历史 `POWER_LIMIT = 6.0`，但当前主输出仍以 `MAX_DISPLAY_POWER = 5` 做可用性过滤。

## 3. 风的基础表达

所有风最终都被拆成水平和垂直两个方向：

```text
windX = cos(windAngle) * windForce
windY = sin(windAngle) * windForce
```

然后进入：

```text
xA = windX / mass
effGrav = gravity - windY / mass
```

通俗理解：

- 顺风/逆风主要改变水平加速度 `xA`，影响弹在空中被往前推还是往回拉。
- 上风/下风主要改变有效重力 `effGrav`，影响滞空时间、弹道高度和落点陡峭程度。
- 大逆风、高角度、近垂直落弹时，力度对水平落点未必非常敏感，更多改变滞空时间和 Trico 三弹相位。

不同车辆或模型的 `windForce` 单位不同，不能混用。

### 3.1 普通非 Excel 车

普通车使用坦克自己的风影响系数：

```text
B14 = windStrength * tank.windInfluence
xA = cos(windAngle) * B14 / mass
effGrav = gravity - sin(windAngle) * B14 / mass
```

其中 `gravity`、`mass`、`windInfluence` 来自车辆参数。

### 3.2 Excel 车辆

Excel 车辆不再额外乘 `windInfluence`，直接用原始风力：

```text
xA = cos(windAngle) * windStrength / mass
effGrav = gravity - sin(windAngle) * windStrength / mass
```

### 3.3 Trico N1-N3

Trico N1-N3 使用自己的风力查表：

```text
windForce = lookupWind(windStrength)
xA = cos(windAngle) * windForce / 124
effGrav = formulaGPhase - sin(windAngle) * windForce / 124
```

这里 `formulaGPhase` 来自识别表/相位公式反推，不固定等于 Excel 兜底的 `0.835`。

### 3.4 Trico N4 recognition

N4 recognition 是另一套单位：

```text
windForce = windStrength * 0.01025
xA = cos(windAngle) * windForce
effGrav = 1 - sin(windAngle) * windForce
```

这里没有 `/124`，也不使用 `0.835` 重力。这是 N4 recognition 内部的相位单位。

## 4. 通用弹道核心

底层运动方程是：

```text
x(t) = vx * t + 0.5 * xA * t^2
y(t) = vy * t - 0.5 * effGrav * t^2
```

其中：

```text
vx = V * cos(angle)
vy = V * sin(angle)
```

### 4.1 定角算力

已知角度，求力度。

无落差时：

```text
V^2 = xDistance /
      ((2*cosA*sinA)/effGrav + (2*xA*sinA^2)/(effGrav^2))
```

有落差时先解飞行时间：

```text
t^2 = 2 * (xDistance*tanA - elevationInternal) /
      (effGrav + xA*tanA)
```

再反推速度和力度：

```text
V = (xDistance - 0.5*xA*t^2) / (t*cosA)
power = V * 0.004332712
```

### 4.2 定时算角

已知飞行时间，求角度和力度：

```text
tanA = (elevationInternal + 0.5*effGrav*t^2) /
       (xDistance - 0.5*xA*t^2)
angle = atan(tanA)
```

再计算：

```text
V = (xDistance - 0.5*xA*t^2) / (t*cosA)
power = V * 0.004332712
```

### 4.3 定力算角

已知力度时，先把力度换成速度：

```text
V = power / 0.004332712
```

然后把运动方程消元成二次方程，求可能的高抛/低抛解。得到角度后，仍要按最终整数角重新计算对应力度。

### 4.4 整数角重算

无论普通车还是 Trico，只要角度被整数化，就不能沿用小数角的力度。

普通分支通常是四舍五入到整数角后重算。Trico 使用项目专属“5舍6入”，详见后文。

## 5. Excel 车辆模型

Excel 车辆包括 Boomer、Turtle、Ice、JD、Aduka、Grub 等。它们优先走 `EXCEL_VEHICLE`，不直接使用普通像素距离。

### 5.1 Excel 单位

多数 Excel 车辆：

```text
dist = distance * distanceScale
distanceScale = 1 / 3.75
```

落差：

```text
rawElevation = elevationInternal / (516 / 13)
elev = rawElevation                  # 直接用用户落差单位
```

> 注意：Excel 表里 `(5.17/16)*落差` 这一修正项对应的单元格（Boomer 的 C4、Turtle 的 C3、
> ICE 的 E9 等）在所有 sheet 中恒为 0/空，所以该项实际不起作用，Excel 的高度项就是 desnivel 原值。
> 早期代码误把 `(5.17/16)` 当成有效缩放套进 getExcelUnits（elevationMode='scaled'），
> 导致有落差时角度偏差最大约 20°。已统一改为 elevationMode='raw'，与 Excel 完全对齐
> （11 个含落差/风/距离的回归用例 0 误差）。无落差时两者一致，所以平地结果不受影响。

### 5.2 质量

Boomer：

```text
mass = 85 - windStrength^2 * 0.005
```

Turtle：

```text
mass = 149 - windStrength^2 * 0.02
```

其他 Excel 车多数为常量质量：

```text
mass = 168
```

### 5.3 固定时间打法

Boomer Hook/Bomb、Turtle Fork/Timebomb 本质都是 Given Time：

```text
给定 T -> 解 angle -> 解 power
```

风和落差通过同一套 `xA/effGrav` 公式自然进入，而不是查一个固定角力表。

## 6. Trico 总路由

Trico 主入口：

```text
searchTrico3in1Physics()
  -> EXCEL_TRICO.calcWithWind()
```

按距离和 N 分流：

```text
distance < 0:
  N1-N3 -> calcBackshotWithWind()
  N4    -> calcBackshotN4WithWind()

distance >= 0:
  N1-N3 -> calcRederivedPhasePhysicsN123()
  N4    -> calcN4PhaseValidatedForward()
```

Trico 正向 Excel 距离：

```text
excelDist = abs(distance) / (sdParts / 8)
```

Trico 背射 N1-N3 会保留符号：

```text
solveExcelDist = distance / (sdParts / 8)
```

这避免负距离误套同距离正向相位模型。

## 7. Trico N1-N3 当前主模型

N1-N3 当前主路是 `calcRederivedPhasePhysicsN123()`。

它不是旧 `phasePowerScale` 后乘修正，也不是风型 gate。它的核心是：

```text
识别无风基线
  + 连续风/落差/距离物理特征
  -> 推出 time / xA / effGrav
  -> 由同一弹道方程解 raw angle
  -> Trico 5舍6入
  -> 按整数角重算 power
```

### 7.1 无风基线

无风零落差基线来自 `识别数据.xlsx` 对应的识别相位表。代码中表现为：

```text
empiricalPhaseTables
phaseFormulas
buildEmpiricalPhaseModel()
```

基线提供：

```text
base angle
base power
target time
local phase gravity
```

其中 `local phase gravity` 不是固定 `0.835`，而是随方向、N、距离变化的相位重力。

### 7.2 连续物理向量

有风或有落差时，模型不直接对角度/力度做补偿，而是拟合三个底层物理量：

```text
time
xA
effGrav
```

形式为：

```text
time    = model.targetTime + dot(timeCoeffs, features) * originFactor
xA      = baseXA           + dot(xACoeffs, features)   * originFactor
effGrav = baseG            + dot(gCoeffs, features)    * originFactor
```

`originFactor` 的作用是让零风零落差时修正项归零，直接回到识别表基线。

### 7.3 特征向量

当前特征向量大致包括：

```text
intercept
d, ad
e
wx, wy, ws
tail, head, up, down
dWx, dWy
eWx, eWy
wxWy
adWx, adWy
backshot
d2Wx, d2Wy
e2Wx, e2Wy
dEWx, dEWy
```

这些特征表达的是物理状态，不是样本编号：

- 距离大小和方向
- 落差
- 风的水平/垂直分量
- 顺风/逆风
- 上风/下风
- 距离与风的交叉项
- 落差与风的交叉项
- 二阶交叉项

因此当前 N1-N3 的设计意图是“从实测偏差中总结连续规律”，而不是“第几行实测样本输出指定角力”。

### 7.4 反解角度和力度

得到 `time/xA/effGrav` 后，用物理式反解：

```text
tanA = (excelElev + 0.5*effGrav*T^2) /
       (excelDist - 0.5*xA*T^2)
rawAngle = atan(tanA)
```

然后按 Trico 规则整数化：

```text
小数部分 <= 0.5 -> 向下
小数部分 >  0.5 -> 向上
```

这就是项目专属的“5舍6入”，不是普通四舍五入。

取整后必须用同一组 `time/xA/effGrav` 重新计算 power。

### 7.5 N1-N3 禁止事项

当前主路禁止再接回：

```text
phasePowerScale 后乘砍力或抬力
风型 gate
按样本拉回
xlsx 力量护栏
静态样本补偿
```

例如 `74 / 3.7623` 这类结果，如果当前主路能出来，含义应该是风、落差、距离共同推导出的 `time/xA/effGrav` 自然导致这个角力，而不是末端强行把结果拉成这个数字。

## 8. Trico N4 当前主模型

N4 正向主路是：

```text
calcN4PhaseValidatedForward()
```

N4 和 N1-N3 不同。N4 不能只靠固定时间外推，也不能只看角力接近。它必须考虑相位闭合。

### 8.1 候选池

N4 会收集多个候选：

```text
calcRederivedN4Numeric()
calcN4ByRecognitionPhase()
calcN4ByPhaseBaseline()
calcN4ByPhaseAngle()
```

候选不会直接返回，而是统一经过：

```text
attachN4PhaseValidation()
scoreN4PhaseBaseline()
```

### 8.2 recognition 参数

左侧：

```text
q = -0.0363420539198227 + 0.3260585725923402 * sdDistance
phaseRate = 329.9406505487211 / 2
```

右侧：

```text
q = 0.11561888590271074 + 0.3278860304683285 * sdDistance
phaseRate = 281.5927682608422 / 2
```

目标相位：

```text
targetPhase = 1080 + phaseBias + 4 * angle
```

### 8.3 N4 recognition 风

```text
windForce = windStrength * 0.01025
xA = cos(windAngle) * windForce
effGrav = 1 - sin(windAngle) * windForce
```

这是 N4 recognition 自己的单位，不等于 Trico N1-N3 的 `lookupWind()/124`。

### 8.4 给定角求解

给定角度时：

```text
t2 = 2 * (q*tanA - excelElev) / (effGrav + xA*tanA)
Tq = sqrt(t2)
```

力度：

```text
power = (q - 0.5*xA*t2) / (cosA * sqrt(t2))
```

这里的 `Tq` 是 recognition 内部时间尺度，不是普通轨迹显示时间。

### 8.5 N4 连续数字公式

N4 的数字候选会在 recognition 基础上做连续调整：

```text
rawAngle = baseRawAngle + dot(angleCoeffs, features)
power = recognitionPowerAtRoundedAngle * exp(dot(powerCoeffs, features))
```

这里的 power scale 是 N4 数字公式内部的连续物理向量项，通常记录为 `rederivedPowerScale`。它不是旧的 `phasePowerScale` 后乘砍力。

### 8.6 N4 相位验证

N4 候选必须满足：

```text
angle 在 1..89
0 < power <= 5
n4PhaseBaselineValidated = true
n4PhaseGeometryPending = false
minHitDist <= 12
```

当前 N4 recognition 候选中的 `minHitDist` 表示纯相位闭合误差。视觉轨迹 miss 只作为诊断字段，不再用于误杀 recognition 相位闭合结果。

N4 的“验证”不应该反过来改候选角力。它只判断候选是否自洽。重建新版时要保持计算和验证分离。

## 9. Trico 背射

负距离不是取绝对值后按正向计算。

### 9.1 N1-N3 背射

N1-N3 背射走：

```text
calcBackshotWithWind()
```

它保留 signed distance：

```text
solveExcelDist = distance / (sdParts / 8)
```

再用对应 spin table 的时间和物理式解角力。

### 9.2 N4 背射

N4 背射走：

```text
calcBackshotN4WithWind()
```

它允许用同侧 signed N2/N3 时间推：

```text
T4 = T3 + (T3 - T2)
```

这个外推只用于背射。正向 N4 不使用这个外推。

## 10. Trico 三弹轨迹和命中结构

Trico 不是中心弹命中就完成，也不是三颗弹都必须收敛到同一个像素点。当前模型将它表达为中心弹轨迹 + 两颗侧弹绕中心旋转。

三弹半径：

```text
R = 35
```

旋转速度：

```text
left  OMEGA_L = 0.6544
right OMEGA_R = 0.5571
```

旋转方向：

```text
right: angleModifier = -1
left:  angleModifier = +1
```

偏移渐入：

```text
offsetFactor = min(2 * t, 1)
```

三颗弹位置：

```text
center:
  x = cx
  y = cy

side1:
  x = cx + R * offsetFactor * cos(rot)
  y = cy + R * offsetFactor * sin(rot)

side2:
  x = cx - R * offsetFactor * cos(rot)
  y = cy - R * offsetFactor * sin(rot)
```

正确命中理解是：

```text
三颗独立弹体在目标附近分别完成有效命中或形成足够聚簇
```

而不是：

```text
三颗弹都接近同一个点
```

OpenBound 在这里只能作为结构参考：三颗独立子弹、初始有间距、旋转、命中不能只看中心点。但 OpenBound 的 gravity、mass、wind influence、rotation speed、timestep 等数值不能直接替换当前模型。

## 11. 风误差学习层

当前存在 `WIND_CORRECTIONS`，存储 key 为：

```text
gunbound_wind_corrections
```

它按角度桶、风向桶、风力桶、N 分桶记录误差，并做移动平均。

但当前主计算没有接入 `getCorrection()` 来直接修改输出角度/力度。它现在更像记录、面板和学习数据层，不是主公式的一部分。

## 12. 已停用或不应重建进主路的内容

以下内容不要作为当前主模型的一部分：

```text
applyXlsxPhysicalPowerGuard()
getLeftCloseStrongUpwindGate()
getLeftHeadUpWindGate()
getRightN3ResidualConfidenceDamping()
isN4PhaseBiasInDomain()
calcForwardN4BySpinTimeInference()
forwardN4PowerCorrection
旧 phasePowerScale 后乘砍力/抬力
按实测行覆写结果
静态样本补偿
OpenBound 数值常量直接替换
```

`gunbound calculator.xlsx` 可以作为通用中心弹 Finding Power / Given Time 的 sanity baseline，但不能作为 Trico 正向主路的力量护栏。

## 13. 新版本重建建议

建议把新版拆成纯模块，而不是继续把所有逻辑塞进单个 HTML。

```text
units
  负责 distance/elevation/power/velocity 的所有换算

wind
  负责 UI 风向、有效风角、windX/windY、xA/effGrav

ballistic
  负责通用抛物线求解：
  fixedAngleToPower
  fixedTimeToAnglePower
  fixedPowerToAngles

excelVehicles
  负责 Boomer/Turtle/Ice/JD/Aduka/Grub 的 Excel 单位和固定时间打法

trico/base
  保存 spinTables、windTable、5舍6入、基础常量

trico/n123Phase
  只做 N1-N3：
  识别表基线
  phaseFormulas
  feature vector
  time/xA/effGrav 连续模型
  整数角重算 power

trico/n4Recognition
  只做 N4：
  q 模型
  phaseRate 模型
  Tq root
  candidate pool
  phase validation

trico/threeBalls
  只做三弹轨迹、命中框、聚簇和相位闭合评分

diagnostics
  输出 source、angleRaw、powerRaw、time、xA、effGrav、minHitDist、phaseError 等诊断字段
```

新版本里“计算”和“验证”必须分开。

计算模块：

```text
输入物理状态 -> 输出 angle / power / time / trajectory
```

验证模块：

```text
检查是否 1..89
检查是否 power <= 5
检查是否相位闭合
检查三弹命中结构是否合理
```

验证模块不应该反过来改力度、压力度、抬力度。否则会重新回到“结果看起来对，但物理链路解释不了”的状态。

## 14. 当前模型最值得继承的原则

1. N1-N3 的实测数据只应该用来归纳连续物理规律，不应该变成按样本输出表。
2. N1-N3 应优先拟合 `time/xA/effGrav`，不要末端拟合 `angle/power`。
3. N4 必须尊重相位闭合，不能只看角力接近。
4. 大逆风、近垂直落弹时，力度差异更多会体现在滞空和相位，不一定主要体现为水平落点。
5. Trico 的“三合一”是三颗有间距的旋转弹体模型，不是中心弹模型。
6. Trico 角度取整必须用“5舍6入”。
7. 角度取整后必须重算力度。
8. OpenBound 可以帮助理解结构，但不能直接继承数值。
9. xlsx 可以做 sanity baseline，但不能做主路力量护栏。
10. 任何新修正都应该写成连续函数或底层物理量修正，不能写成“这个场景就给固定角力”。

## 15. 当前模型的重建摘要

如果只保留一句工程摘要：

```text
普通车和 Excel 车以 xA/effGrav 抛物线为核心；
Trico N1-N3 以识别相位基线为锚点，用连续风/落差/距离特征推导 time/xA/effGrav，再自然解角力；
Trico N4 以 recognition q/phaseRate 为核心生成候选，并用纯相位闭合验证候选；
所有角度整数化后必须重算 power；
禁止用末端 gate、样本覆写或力量护栏把结果拉好看。
```
