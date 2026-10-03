# Gunbound 弹道计算器 · 项目说明文档

> 本文档是对 `C:\Users\fanli\Documents\zcodegunbound` 项目的完整扫描 + 记忆库 + 规则文档汇总。
> 最后更新：2026-08-03
> 当前版本：**v1.65**（`gunbound_calculator.html` subtitle + `APP_VERSION` 两处同步）
>
> **v1.09~v1.65 迭代说明**：2026-07-23 ~ 2026-08-03 的一次超长会话（task-805，10 天 / 79 条用户指令 / 1048 次工具调用）
> 把计算器从 v1.08 推进到 v1.65，新增「负角度支持 / 弹道依次命中修正 / 自学习三方案 / 误差模拟命中值 / 右N3重标定 / 双罗盘 / 界面2」等大量功能，详见 [第 18 节](#18-v109v165-迭代工作总结2026-07-23--2026-08-03)。

---

## 目录

1. [项目概述](#1-项目概述)
2. [目录结构总览](#2-目录结构总览)
3. [技术栈与运行方式](#3-技术栈与运行方式)
4. [主程序 `gunbound_calculator.html` 架构](#4-主程序-gunbound_calculatorhtml-架构)
5. [物理模型总览（三层混合）](#5-物理模型总览三层混合)
6. [Trico 3in1 相位模型（核心）](#6-trico-3in1-相位模型核心)
7. [Excel 车辆模型](#7-excel-车辆模型)
8. [Boomer-Test 数值弹道求解器（v1.08 新增）](#8-boomer-test-数值弹道求解器v108-新增)
9. [UI 与交互层](#9-ui-与交互层)
10. [数据文件与识别表](#10-数据文件与识别表)
11. [辅助脚本体系（`_*.js`/`_*.cjs`/`_*.py`）](#11-辅助脚本体系_js_cjs_py)
12. [老计算器反汇编项目（`beta/`）](#12-老计算器反汇编项目beta)
13. [版本演进史](#13-版本演进史)
14. [强制规则与硬约束（RULES 摘要）](#14-强制规则与硬约束rules-摘要)
15. [已知限制与未完成工作](#15-已知限制与未完成工作)
16. [开发工作流与验证规范](#16-开发工作流与验证规范)
17. [关键索引（grep 关键词）](#17-关键索引grep-关键词)
18. [v1.09~v1.65 迭代工作总结（2026-07-23 ~ 2026-08-03）](#18-v109v165-迭代工作总结2026-07-23--2026-08-03)

---

## 1. 项目概述

### 1.1 一句话定位

**Gunbound（炮炮火枪手）Trico 3in1 弹道计算器**——一个纯前端 HTML 单页应用，根据「距离/落差/风向/风力」推算 Trico（三球战车）「一旋~四旋（N1-N4）」命中的整数角度+力度，同时支持普通车（Armor/Turtle/Boomer/JD/Aduka/Grub 等）和 Excel 车的多种打法。

### 1.2 项目本质

- **不是普通查表工具**，而是「物理求解 + 识别表锚定 + 实测拟合」三层混合模型。
- 核心难点：Trico 三球绕中心弹旋转命中，必须满足「落地旋转相位」约束（每个 N 对应特定圈数）。
- 项目经过长期迭代，沉淀了 **RULES.md（50KB 规则/教训）** + **多个物理调研文档**，是项目最重要的知识资产。

### 1.3 项目核心数据

| 项 | 值 |
|----|----|
| 主程序 | `gunbound_calculator.html`（**10544 行，~648KB**，v1.65） |
| 项目根文件总数 | 250+ 文件（含 130+ 辅助脚本、30+ Excel、30+ HTML 备份） |
| 知识文档 | `RULES.md`（50KB）/ `CURRENT_SHOOTING_MODEL.md`（18KB）/ `TRICO_PHASE_FORMULAS.md`（13KB）/ `TRICO_PHYSICS_FINDINGS.md`（14KB） |
| 当前版本 | **`v1.65`**（v1.08 → v1.65 经历 57 个版本，见第 18 节） |
| 会话日志 | `~/.qoder/projects/c-Users-fanli-Documents-zcodegunbound/transcript/task-*.session.execution.jsonl` |
| 代码库记忆节点 | 1390 节点 / 5036 边（已索引） |

### 1.4 适用游戏

- 国际服 Gunbound（GBWC）+ 韩国软星原始物理
- 参考 OpenBound（开源 GB 克隆）和 GME 私服数值
- Trico 是核心车种，其它车种是辅助（普通抛物线/Excel 闭式）

---

## 2. 目录结构总览

```
zcodegunbound/
├── gunbound_calculator.html          ★主程序（当前 v1.08）
├── gunbound_calculator.*.html        14 个历史备份（v1.02~v1.08 演进轨迹）
├── RULES.md                          ★强制规则与教训记录（最高优先级）
├── CURRENT_SHOOTING_MODEL.md         当前射击模型完整说明（文字版架构图）
├── TRICO_PHASE_FORMULAS.md           Trico 相位公式完整推导
├── TRICO_PHYSICS_FINDINGS.md         物理模型调研结论（54条实测验证）
│
├── gunboundexcel/                    ★Excel 源表（开炮表权威数据）
│   ├── boomer revolution.xlsm        Boomer Hook/Bomb/BS 开炮表
│   └── excelgunbound.xlsm            通用 Excel 公式源
│
├── *.xlsx                            30+ 识别/实测/推导表
│   ├── 识别数据.xlsx                 Trico R1/R2/R3/L2/L3 无风识别表（源头）
│   ├── Boomer开炮表v4.xlsx           Boomer 数值求解器 2591 数据点
│   ├── 实测数据v1.xlsx               52 条玩家实测（精度基线）
│   ├── 优化识别数据_v14_*.xlsx       v14 优化识别表（已集成）
│   └── 现计算器与实测核对_最终版.xlsx 核对结果输出
│
├── _*.js / _*.cjs / _*.py            ★100+ 辅助/诊断/核对脚本（详见第11节）
│   ├── _calc_node.js / _wind.js      Trico 求解器切片（用于回归）
│   ├── _boomer_*.cjs                 Boomer 数值求解器实验（30+ 个）
│   └── _verify_*.js / _test_*.js     各类核对/验证脚本
│
├── beta/                             ★老计算器反汇编项目（VB6 exe）
│   ├── 2.1.6.exe / 2.2.2.exe / 2.2.3.exe    VB6 native 编译老计算器
│   ├── decompiled_2.2.3.exe.c       Ghidra 完整反编译（3.1MB）
│   ├── FUN_00519520_core.c 等        5 个核心公式函数
│   ├── formula_seq.txt               19655 条运算序列
│   ├── VB6反汇编指南.md / 公式还原与核对.md
│   ├── DecompileAll.java / DumpData.py   Ghidra 批量反编译脚本
│   ├── _scan_consts.js / _vb6_map.js     常量扫描/映射脚本
│   ├── *.png                         老 exe 界面截图（OCR 用）
│   └── _archive/                     早期 UI 自动化尝试（ui_auto.cs/exe，已失败）
│
├── ghidra_proj/                      Ghidra 项目（TricoProj，已分析 2.2.3）
├── output picture video/             Trico 三球轨迹截图（游戏视频帧，60+ 张）
├── .playwright-mcp/                  Playwright MCP 缓存（无头浏览器测试快照）
│   ├── page-*.yml                    页面 snapshot（DOM 结构）
│   └── console-*.log                 console 日志
├── .zcode/plans/                     计划文档
│   ├── plan-sess_3a30332b-*.md       v1.08 Boomer-test 实施方案
│   └── plan-sess_b362be25-*.md       方向B 旋转相位求解器方案（已试验，未启用）
├── .qoder/skills/                    ★项目 skill（v1.39 新增）
│   └── error-recalibration/          标定变更误差二次核算标准流程
├── hookgrid.jpg / hookwind.jpg       Boomer Hook 网格图与风图
└── nul                               Windows 重定向空文件
```

---

## 3. 技术栈与运行方式

### 3.1 技术栈

- **纯前端单页**：HTML + 内联 CSS + 内联 JS，零依赖，零打包工具。
- 浏览器直接打开即可运行（`file://` 或本地 http server）。
- 没有 npm/package.json/node_modules，**所有 JS 都在 HTML 内部**。

### 3.2 运行方式

```bash
# 推荐：起本地 http server（避免 file:// 的某些限制）
python -m http.server 8899
# 浏览器访问 http://127.0.0.1:8899/gunbound_calculator.html
```

### 3.3 数据存储

- 全部用 **localStorage**，无后端：
  - `gunbound_error_records`：射击记录（含 `status='hit'/'error'` 和 `version` 字段）
  - `gunbound_wind_corrections`：风误差自学习数据
- 用户可手动导入/导出（UI 提供）。

### 3.4 开发/测试工具链

- **Node.js 沙箱**（vm 模块）：跑 `<script>` 切片做纯数值回归（不需浏览器）。
- **Playwright MCP（无头浏览器）**：UI 渲染验证（取整解显示、⚠ 警告、按钮状态）。
- **Python + openpyxl**：读取/写入 Excel 数据表。
- **Ghidra**：反汇编老 exe（VB6 native）。

---

## 4. 主程序 `gunbound_calculator.html` 架构

### 4.1 总行数与结构（**10544 行**，v1.65）

> 注：v1.09~v1.65 期间新增了大量功能（双罗盘 / 界面2 / TRICO_LEARN 学习模块 / 误差模拟命中值 / 负角度），行号区间较 v1.08 整体后移。以下为 v1.65 当前近似区间，**修改前务必用 grep 重新定位**。

| 行号区间 | 内容 |
|---------|------|
| 1-1360 | HTML 头部 + CSS（亮/暗双主题，CSS 变量驱动；含双罗盘/界面2 样式） |
| 1345 | subtitle（v1.65）|
| 1364-1560 | `<body>` HTML 容器（mode 容器 + **双罗盘 `.trico-dual-panels`** + 界面1/2 切换） |
| 1560-1820 | 罗盘 canvas + `const TANKS` + **`APP_VERSION='v1.65'`**（:1819） |
| 1820-2240 | Trico 三球旋转模型 + 物理常量 + `TURTLE_MODES`/`BOOMER_MODES` |
| 2243-4750 | ★`const EXCEL_TRICO = {...}` 核心：识别表(:2243)+相位公式(:2282)+落地时间求解器(:2262)+取整(:2408)+三球轨迹+路由 calcWithWind(:3299)+rederived(:3522)+N4(:3673) |
| 4778 | ★`searchTrico3in1Physics`（Trico 主入口） |
| 4750-5130 | `const EXCEL_VEHICLE` + calcExcelWindParams(:4978) |
| 5133-5430 | ★`Boomer-Test` 数值弹道求解器（RK4，`simBoomerTrajectory` :5133） |
| 5430-6926 | 普通车求解 + UI 渲染辅助（switchMode :1364 / renderCompassDots :6926） |
| 6926-7552 | 罗盘渲染 + 轨迹绘制 `drawTrajectoryCanvas`(:7552)（中心弹+三球椭圆螺旋+目标标线） |
| 7409 | ★`TRICO_LEARN` 锚点学习模块（自学习三方案，v1.15 新增） |
| 7552-8061 | renderExcel*/renderTrico*/renderBoomer* + renderBoomerTest |
| 8061 | ★主入口 `_doCalculate`（路由各模式 + 双罗盘并行求解 + 界面2 钩子） |
| 9296-10544 | 射击记录系统 `saveShotRecord`(:9296) + 误差模拟命中值 + 事件绑定 + 状态持久化 |

### 4.2 全局变量与状态

```js
const TANKS = { boomer, ice, nak, raon, armor, turtle, trico, jd, aduka, grub,
                bigfoot, dragon, mage, knight, lightning, wolf, asate };  // 17 车
let currentMode = 'finding-power';      // 当前激活模式
let tricoDirection = 'right';           // Trico 攻击方向（左/右）
let windAngle = 0;                      // UI 风向（度）
let globalWindStrength = 0;             // UI 风力
let compassMode = 'drag';               // 罗盘交互模式
const APP_VERSION = 'v1.65';            // 版本号（强制同步）
```

**v1.09+ 新增全局状态**：
```js
let tricoPanels = { right:{...}, left:{...} };  // 双罗盘各自的状态（v1.55）
let tricoUiMode = 'ui1' | 'ui2';                  // 界面1/2 切换（v1.64，localStorage 持久化）
TRICO_LEARN.anchors[];                            // 自学习锚点池（v1.15）
TRICO_LEARN.scheme = 1|2|3;                       // 学习方案选择（v1.62）
```

### 4.3 模式（Mode）列表

| 模式 ID | 用途 | 适用车种 |
|---------|------|---------|
| `finding-power` | 定角算力（普通抛物线） | 全部普通车 |
| `finding-angle` | 定力算角（普通抛物线，多解） | 全部普通车 |
| `given-time` | 给定飞行时间算角+力 | 全部普通车 |
| `trico-3in1` | ★Trico N1-N4 一旋~四旋 | Trico 专用 |
| `turtle-modes` | Turtle 打法（Timebomb/Fork/Power4.0/Time3.0） | Turtle 专用 |
| `boomer-modes` | Boomer 打法（BOMB/Hook 35-55°/Hook Full/BS 背射） | Boomer 专用 |
| `boomer-test` | ★v1.08 新增 Boomer 数值求解器（RK4，支持回旋） | Boomer 专用 |

**Trico 双罗盘子模式**（v1.55+，内嵌于 `trico-3in1`）：
- 左面板 = 左打右（tricoDirection='right'），右面板 = 右打左（tricoDirection='left'）
- 两罗盘**各自独立求解**（直接调 `searchTrico3in1Physics`，不依赖活动面板）
- 界面1（原布局）/ 界面2（精简结果：输入左/结果右，v1.64）可切换

---

## 5. 物理模型总览（三层混合）

参考 `CURRENT_SHOOTING_MODEL.md`：

### 5.1 第一层：通用抛物线物理

所有计算最终都进入两个核心量：

```
xA = 水平风加速度（顺风/逆风改 x）
effGrav = 有效重力（上风/下风改 g）

运动方程：
x(t) = V·cos(angle)·t + 0.5·xA·t²
y(t) = V·sin(angle)·t − 0.5·effGrav·t²
```

三种求解：
- **定角算力** `fixedAngleToPower`：已知 angle，求 V→power
- **定时算角力** `fixedTimeToAnglePower`：已知 T，atan 直接求解
- **定力算角** `fixedPowerToAngles`：已知 power，二次方程求多解

### 5.2 第二层：Excel 车辆单位系

Boomer/Turtle/Ice/JD/Aduka/Grub 等 Excel 车：
- 使用 Excel 内部单位（`distanceScale=0.4` 即 sd×0.4 = excelDist）
- 质量随风力变化（Boomer: `mass=85-0.005·w²`）
- 走 `EXCEL_VEHICLE.vehicles[vehicleId]` 路径
- **落差用 raw 模式**（不用旧的 `(5.17/16)` 缩放，详见教训 #4）

### 5.3 第三层：Trico 特殊相位模型

Trico N1-N3 用「识别无风相位基线 + 连续风/落差物理向量」反解；N4 用「识别相位候选 + 相位闭合验证」收口。详见 [第 6 节](#6-trico-3in1-相位模型核心)。

---

## 6. Trico 3in1 相位模型（核心）

### 6.1 N 的物理本质

Trico 三颗炮弹（中心弹 + 两颗侧弹绕中心旋转，R=35px），「3in1 命中」= 三球在落地瞬间汇聚到目标点。每个 N 对应特定**落地旋转相位**：

| N | rot/pi(sd=20) | 圈数范围 | T 区间(right) |
|---|---------------|---------|--------------|
| N1 | 1.09 | (0, 1) | [0.87, 1.71] |
| N2 | 2.79(R)/2.87(L) | (1.1, 1.9) | [2.28, 2.90] |
| N3 | 5.16(R)/5.19(L) | (2.1, 2.9) | [3.70, 4.08] |
| N4 | 8.22(R)/7.51(L) | (3.1, 3.9) | — |

```
rot/pi(sd) = omega(V) × T / π       （相位约束）
圈数 = omega(V) × T / 2π             （= rot/pi / 2）
```

### 6.2 物理参数（权威值）

```
gravity G = 430（N4 rot/pi用）/ 441（N1-N3 finding power用）
mass = 0.23
PF (power factor) = 0.004332712      （V = power/PF）
ELEVATION_PIXELS_PER_UNIT = 516/13   （落差单位→像素）
DISTANCE_PIXELS_PER_20SD = 40        （sd→像素：xDist = sd × 40）
MAX_DISPLAY_POWER = 5
SPIN_RADIUS R = 35
OFFSET_RAMP_RATE = 2                 （侧弹渐入：0.5s 达满半径）

omega 幂律（★旧常数 OMEGA_R=0.5571 / OMEGA_L=0.6544 已废弃）：
  right: omega = 0.023623 × V^0.764315
  left:  omega = 0.687878 × V^0.299291

风公式（Excel 权威）：
  force = windStrength - 1   （纯逆风180°除外，用原始值）
  xA = cos(windAngle) × force / mass
  effGrav = G − sin(windAngle) × force / mass
```

### 6.3 双重力体系（不可混用）

| N | 重力 G | 用途 |
|---|--------|------|
| N1/N2/N3 | **441** | finding power 标定（从基准 76°/3.76 反推）|
| N4 | **430** | rot/pi 求解（推出 82°/4.83）|

### 6.4 时间算法（time-first，2026-06-25 重构）

```
T_target = T_base(sd) + dT(wy_acc)         （T 是主驱动量）

given time 解析公式（含风抛物线）：
  tanA = (elev + 0.5·effGrav·T²) / (xDist − 0.5·xA·T²)
  V = (xDist − 0.5·xA·T²) / (cosA · T)
  power = V · PF

dT（垂直风时间修正，实测拟合版）：
  dT = 0.0243 - 0.00066 × wy_acc
  wy_acc = sinW × force / MASS
```

> 注意：dT 有两个版本——**实测拟合版（0.0243-0.00066·wy_acc，当前用，54条 0.91°）** vs 物理仿真版（0.00937·wy_acc，均偏 6.7°）。必须用实测拟合版。

### 6.5 N4 圈数等比例递减

```
rot/pi(sd) = 8.2243 × (1 + slope × (sd-20))
slope = -0.000835/sd   （从 N3 两基准点标定）

圈数 = rot/pi/2，等比例单调递减：
  sd=5 → 4.12 圈
  sd=20 → 4.11 圈
  sd=40 → 4.09 圈
```

### 6.6 N1 单独 T/G 查找表

N1 低角度对参数极敏感，用步进 0.1 的查找表：

```
n1TimeGravityTable['right:1']  // [sd, T, G] 表，211 点
T(sd) = xDist/(V×cosA)
G(sd) = 2×V×sinA/T
有风时：T = T_base + dT，effGravCalc = G_base − sinW×force/MASS
```

> left:1 无识别表（不存在 left N1 数据），走 calcTimePhysicsSolver 但 T-fit 表缺 'left:1'，返回 null（已知限制）。

### 6.7 角度取整：5 舍 6 入

```js
roundAngleForTrico(angle) {
    const base = Math.floor(angle);
    return (angle - base) <= 0.5 ? base : base + 1;
}
// ≤0.5 舍，>0.5 入（不是标准四舍五入）
```

### 6.8 取整解 T 守恒原则（v1.06）

UI 显示的「取整解↓/↑」（floor/ceil 两个整数角度解）遵守 **T 优先** 原则：

1. **先试落点守恒法**（保持 raw 落点，T 自适应）。算 ΔT = |T_new − T_raw|。
2. **ΔT ≤ tol（按 N 分级 0.05/0.08/0.12/0.15）**：直接用。
3. **ΔT > tol**：改用 **T 守恒法**（保持 T_raw，用 y 方程解 V）。落点偏差换算成 SD 显示（"落点偏差 ±X.XX SD (T守恒)"）。

> 物理依据：Trico 靠旋转（ω·T）命中，T 一偏圈数偏移三球脱靶。高角度+大逆风时弹道回旋，落点守恒会大幅砍 T。

### 6.9 calcWithWind 路由（核心入口）

```
calcWithWind(sdParts, side, spinN, distance, elevationInternal, windAngle, windStrength)
  ├─ 无风(ws=0, elev=0, dist>0): calcNoWindFromTable → 识别表插值（0偏差）
  ├─ calcTimePhysicsSolver（落地时间求解器, N1-N4）
  │    └─ N1用T/G查找表, N2-N4用T-fit+G=430
  ├─ isBackshot(dist<0): calcBackshotWithWind（背射专用, 高角度+大力度）★必须在rederived之前
  ├─ rederived(N1-3, 仅正射)
  └─ calcN4PhaseValidatedForward(N4)
```

**关键**：背射必须在 rederived **之前**判断（rederived 用 abs(distance) 忽略方向）。

### 6.10 方向B：旋转相位约束求解器（试验完成，未启用）

2026-07-14 试验完成，已回退到 v1.07。8 标准点完美但全量退化，根因是 omega 幂律模型外推不准。备份在 `gunbound_calculator.v1.07_before_phaseB.html`，方案文档在 `.zcode/plans/plan-sess_b362be25-*.md`。

核心思路：3 个约束（旋转 ω(V)·T = rot_pi(sd)·π / 垂直 / 落点偏移 xErrSD=f(angle)）。

重启条件：修好 omega 模型（需更多不同 V/风力的实测数据重新标定）。

---

## 7. Excel 车辆模型

### 7.1 Excel 车列表

`EXCEL_VEHICLE.vehicles`：
- **boomer**（Hook/Bomb/BS 三种打法）
- **turtle**（Timebomb/Fork 4-7/Power 4.0/Time 3.0）
- ice / jd / aduka / grub（普通 Excel 车）

### 7.2 Boomer 参数（v1.08 重点）

```
gravity = 0.608
massBase = 85, massWindCoeff = 0.005   （mass = 85 - wind² × 0.005）
baseTime = 3.00098                      （BOMB 固定时间，源表 tiempo=3.00098）
distanceScale = 0.4                     （excelDist = sd × 0.4）
distanceMode = 'scaled'
elevationMode = 'raw'                   （落差直接用用户单位，详见教训 #4）
forkTimes: { bomb: 3.00098, hook1-5: 2.603~3.613 }
```

### 7.3 Turtle 参数

```
gravity = 0.73
massBase = 149, massWindCoeff = 0.02    （mass = 149 - wind² × 0.02）
distanceScale = 0.4
```

### 7.4 Turtle 打法定义

```js
TURTLE_MODES = [
    { name: 'Timebomb',  type: 'time', time: 4.98 },
    { name: 'Fork 7',    type: 'time', time: 6.18 },
    { name: 'Fork 6',    type: 'time', time: 4.24 },
    { name: 'Fork 5',    type: 'time', time: 3.37 },
    { name: 'Fork 4',    type: 'time', time: 2.665 },
    { name: 'Power 4.0', type: 'power', power: 4.0 },
    { name: 'Time 3.0',  type: 'time', time: 7.7235 },  // 2×3.0×sin(70°)/0.73
];
```

### 7.5 Boomer 打法定义（旧 boomer-modes）

```js
BOOMER_MODES = [
    { name: 'BOMB',      type: 'time',  time: 3.00098 },  // 固定飞行时间
    { name: 'Hook 35°',  type: 'angle', angle: 35 },      // 固定角算力
    { name: 'Hook 40°',  type: 'angle', angle: 40 },
    { name: 'Hook 45°',  type: 'angle', angle: 45 },
    { name: 'Hook 50°',  type: 'angle', angle: 50 },
    { name: 'Hook 55°',  type: 'angle', angle: 55 },
    { name: 'Hook Full', type: 'power', power: 3.0 },     // 满力算角
    { name: 'BS 背射',   type: 'bs',    power: 3.0 },     // 满力打身后
];
```

### 7.6 Excel 闭式求解函数

```
calcExcelWindParams(vehicleId, windAngleDeg, windStrength)   // 算 xA, effGrav
calcExcelCenterTrajectory(vehicleId, angle, ...)              // 定角算 V/power
calcExcelFromTime(vehicleId, time, ...)                       // 定时算角+力
calcExcelFromPower(vehicleId, power, ...)                     // 定力算角
calculateExcelAngleFromPower(vehicleId, power, ...)           // 定力多解扫描
```

---

## 8. Boomer-Test 数值弹道求解器（v1.08 新增）

### 8.1 动机

现有 `boomer-modes` 用闭式解（calcExcelFromTime 等），**在 hook/backshot 回旋弹道区给假解**。v1.08 新增并列标签页 `boomer-test`，用数值积分（RK4）正确处理回旋。

### 8.2 物理模型（已用 2591 数据点验证 100% 精度）

```
g = 0.608, mass = 85 - 0.005·w²
距离 excelDist = sd × 0.4
力度 Vo = power（直接）
风：xA = cos(wa)·ws/mass, effGrav = g − sin(wa)·ws/mass
弹道：x'' = xA, y'' = −effGrav   （y 向上为正）
```

### 8.3 核心函数（3 个新增，全部独立于现有闭式解）

| 函数 | 行号 | 作用 |
|------|------|------|
| `simBoomerTrajectory(power, angle, wp, elevExcel, dt=0.002, tmax=16)` | :4766 | RK4 数值积分单条弹道，返回 `{landingX, landingT, wentBack, maxX, trajectory}` |
| `calcBoomerTestPower(angle, wp, targetDist, elevExcel)` | :4804 | 固定角，二分搜索力度（lo=0.1, hi=6） |
| `calcBoomerTestAngle(power, wp, targetDist, elevExcel, preferHigh)` | :4821 | 固定力，扫描 5°→89.9° 步长 0.3°，找所有根，二分精化，优先高抛非回旋解 |
| `calcBoomerTestMode(modeType, fixedVal, distance, wa, ws, sdParts, elev)` | :4858 | 统一入口，4 种打法分发 |

### 8.4 5 种打法映射（v1.79 顺逆风分区）

| 打法 | modeType | sector | 算法 |
|------|----------|--------|------|
| BOMB 固定时间 | `'time'` | any | 闭式解给初始 angle/power，再数值验证落点；若回旋则标注 ⚠ |
| Hook 固定角度 | `'angle'` | any | 数值找 power（二分） |
| Hook Full 满力 | `'power'` | any | 数值找最高角解（**含回旋解**，v1.79 起不再丢弃 wentBack） |
| 折射回旋 | `'hook'` | **against** | 满力，仅取 wentBack 回旋解（球飞出折回命中前方目标） |
| BS 背射 | `'bs'` | **against** | distance 取负（身后目标），满力找角度 |

### 8.5 顺逆风分区与回旋公式（v1.79~v1.80，对照 boomer revolution.xlsm）

源表把打法按风向分区：顺风=`A favor`（BOMB恒时+定角算力），逆风=`Hook/HOOKFUL`（折射：满力回旋打前方）+`BS/back`（背射：满力打身后）。

- **风区判定**：`windX = cos(wa_eff)·ws`（wa 已按攻击方向镜像，x+=射击方向）。`windX<-0.01`=逆风，回旋系（折射/背射）才生效；顺风/无风时门控为「仅逆风生效」。
- **回旋系力度任意化（v1.80）**：折射/背射的 `fixedVal` 改取「力度」输入框（`fixed-power`，默认 3.0），1.0~4.0 力均可解。低力时回旋覆盖收缩（1.0 力仅强风近距有解），这是纯风模型的物理事实。
- **回旋公式表（v1.80）**：`showBoomerHookChart()` 按需生成「力×距离→角度」全表（`boomerChartAngle` 粗扫描 dt=0.008/step=1°，~2s），折射（wantBack）与背射（−dist）两张表。**纯逆风下近似线性公式：角度 ≈ 基准角(力,距) − ~1.0×风力**（xlsm 经验系数 −0.8 同族）。
- **回旋拟合公式（v1.80，纯逆风 wa≈180，D 单位 sd，残差 ≤0.7°）**：
  ```
  折射(前方回旋): 角度 ≈ (80.90+2.97P−0.33P²+6.71/P) + (8.42−2.32P+0.23P²−12.76/P)·D − 1.07·ws
  背射(落身后):   角度 ≈ (75.59+5.47P−0.67P²+9.91/P) + (−5.83+1.27P−0.10P²+11.02/P)·D − 1.06·ws
  ```
  风系数 k≈−1.03~−1.22（均值 −1.07），基准角按 (1,P,P²,1/P)×(1,D) 基拟合。风向偏离纯逆风时系数随上下风分量变（上风分量延长滞空→漂移增大），以数值解为准；落差未含入拟合。适用范围 ws≈8~30，回旋解需存在（低力仅强风近距有解）。
- **游戏语义对照**：xlsm `back`=回旋镖自回族（真实游戏 ~60° 低力即可回，纯风模型需高角+强风），`Hook/Hook MENOS`=逆风折射定角算力族。我们的「折射回旋」≈xlsm `BS` 表族（前方回旋），「BS 背射」=落身后族（xlsm 无对应数据）。
- **回旋弹道全景（v1.80）**：`buildBoomerFan()` 满力 3.0 扫 5°→89° 画完整弹道族（灰=直飞/橙=折射/红=背射落身后），画布叠加全部有效打法曲线；BS 有解时画「身后目标」标线。
- **v1.79 前的问题**：`calcBoomerTestAngle` 选解用 `normal = roots.filter(!wentBack)` 优先非回旋 → 逆风短距下 HookFull 误返回低角直飞解（如 10sd/ws19 返回 8° 而非 61° 回旋）；回旋系打法在所有风区混显。
- **v1.79 修复**：选解改 `sel='high'`（全部解取最高角）/`'hook'`（仅回旋解）；`BOOMER_MODES`/`testModes` 加 `sector` 字段门控；闭式 boomer-modes 结果用 sim 加 `[回旋]` 标注 + 轨迹。
- **数值对齐验证**（`_check_boomer_vs_xlsm.cjs` / `_verify_boomer_fix.cjs`）：BOMER(N) 快照 dist=20sd/wa=110/ws=7 共 9 点闭式解与源表**完全一致**（75°→3.2544，BOMB→16.376°/2.8227）；折射回旋 vs 源表 BS 档 ~0.6° 误差（10sd→61.1° vs 表 61.7°）。
- **注意**：源表 HOOKFUL 基准角（ws=0 时 86°@1p 等）编码了真实回旋镖自回旋力，纯风模型在弱风长距下物理上无法复现——回旋解仅在有足够逆风时存在。

### 8.6 UI 接入（5 处改动，详见 `.zcode/plans/plan-sess_3a30332b-*.md`）

- A. HTML 容器 `mode-boomer-test`（:1299）
- B. `switchMode` 增加 display 切换
- C. `tank-select` 动态并列创建 `boomer-test` tab
- D. `_doCalculate` 新增 `else if (currentMode === 'boomer-test')` 分支
- E. 新增 `renderBoomerTest(distance, wa, ws, sdParts, elev)`（:8287）

### 8.7 严格遵守「不替换现有 boomer」

- `calcBoomerModes` / `BOOMER_MODES` / `renderBoomerModes` 全部保留
- `calcExcelFromTime` / `calcExcelCenterTrajectory` 等闭式解全部保留
- `boomer-test` 是独立并列标签页，用户可自由切换对比

---

## 9. UI 与交互层

### 9.1 主题

- 亮/暗双主题（CSS 变量驱动，`[data-theme="dark"]`）
- 主色调：橙色 `#d97706`（accent），背景白/深灰
- 圆角分 sm/md/lg（6/10/14px），三层阴影体系

### 9.2 输入区

- **车种选择**：dropdown，17 车
- **距离 / 落差 / 风力**：数字输入 + ±0.5 / ±1 按钮
- **风向**：48 格罗盘 canvas（drag 拖拽 / click 点击双模式）+ 数字输入
- **sdParts**：默认 20（关键参数，不可乱改）

### 9.3 罗盘（compass）

- 48 个 OptionButton 风格风向格（对应老 exe）
- canvas 实现，drag 模式拖指针，click 模式点格子
- `renderCompassDots()`（:6548）

### 9.4 结果区

- 每个模式独立的卡片渲染函数（renderExcel*/renderTrico*/renderBoomer*）
- 卡片右侧有 ✓（命中）/ ✗（误差）按钮，调 `recordHit` / `recordMiss`
- 三球轨迹 canvas（`drawTrajectoryCanvas`，:6730+）：中心弹直线 + 两颗侧弹绕中心螺旋 + 目标标线
- **x/y 独立缩放**（非等比），让轨迹填满画布

### 9.5 射击记录系统（v1.01，v1.40/v1.63 增强）

- 面板「🎯 射击记录」，两按钮：「命中记录」(status='hit') / 「误差记录」(status='error')
- 存储键 `gunbound_error_records`，按 status 字段区分（旧记录无字段默认 'error'，向后兼容）
- 每条记录含 `version` 字段（= APP_VERSION），用于追溯
- ✓ 按钮：`saveShotRecord(d,'hit',0,0)` → toast「已记录命中」（不弹模态）
- ✗ 按钮：打开「输入误差」模态 → `saveShotRecord(d,'error',hErr,vErr)`
- ★**模拟命中值 simHit**（v1.40）：误差记录打开时自动算出「真正能命中的角度/力度」= 按「距离+水平调整、落差+垂直调整、同风」的前提用当前求解器解出。开机时幂等补算缺失 simHit 的旧记录。
- ★**N 列**（v1.63）：误差/命中记录表均增加 N 列显示，点击记录可查看 simHit。
- ★**全车种覆盖**（v1.41）：误差记录系统不只 Trico，其它车种也配套。
- ★**对比录入**（v1.38）：可从实测 Excel 一键导入（真命中→命中记录，有偏差→误差记录），去重。
- ★**误差输入语义**（v1.25）：打近了=正（需加距离），打远了=负；落差升高=正，降低=负。默认空=0。

### 9.6 Toast 系统（v1.01 新建）

- `showToast(msg, type)` + `.toast-container`（fixed top-right），替代部分 `alert`

### 9.7 自学习层 TRICO_LEARN（v1.15 新增，v1.53/v1.62 演进为三方案）

**核心理念**：物理引擎当骨架，真实命中当锚点，学到的只是两者之间的「小偏差 delta」，并用三球命中判据兜底——delta 小、没数据就退回纯物理，绝不比现在差。

- 锚点 = 真实命中（相位安全），按 (side, N) **严格隔离**（N1 只查 N1 样本，N4 只查 N4 样本，互不串扰）
- 旧的 `WIND_CORRECTIONS`（相位不安全的像素误差独立修正）已废弃保留不删，新建 `TRICO_LEARN` 模块（:7409）
- 内置 67 条种子锚点，命中记录自动转 user 锚点、误差录入自动转 miss 锚点
- **时间新近度加权**（v1.42）：最新结果权重最大，但不直接覆盖旧样本
- ★**学习修正三方案**（单选，v1.62）：
  - **方案1（原始）**：风向±15° + 风力±10 + 距离±5 + 落差±5 四维加权，精确匹配优先取最新命中
  - **方案2（风向辐射）**：去掉距离限制，只针对风向±15° 域内找样本（如 90° 样本辐射 75°-105°）
  - **方案3（风力线性缩放）**：在方案2 基础上，样本修正量按 `当前风力/样本风力` 等比换算（20风影响20x→10风影响10x）
- 启用后，学习推荐解替代物理值显示为主推荐（绿色高亮），并附上下取整解 + ✓✗ 快捷记录
- **误差生效即时刷新**（v1.42）：录入误差后马上在对应 N 值区域显示学习推荐解，不需刷新页面

### 9.8 双罗盘布局（v1.55~v1.61）

- Trico 模式分成两个并列模块：**左面板=左打右，右面板=右打左**
- 两罗盘各自独立求解（直接调 `searchTrico3in1Physics`）
- 罗盘上限 380px（v1.59，原 190px），占 90% 模块空间
- 距离/落差/风力输入框：**点击清空 + 连续点击不处理**（防误触，v1.57）
- ±0.5/±1 步进按钮（v1.60），方向标识精简为箭头（去掉"左打右"文字）
- 罗盘**边缘环带交互**：点击中心算精确角度，边缘格算近似

### 9.9 界面2（v1.64~v1.65）

- 双罗盘区顶部「界面1 / 界面2」切换按钮，选择 localStorage 持久化
- 界面2 布局（每面板三栏网格）：**罗盘左=输入竖排，罗盘右=精简结果，罗盘下=风向维持**
- 精简结果：N 圈数标题 + 角度/力度一行（有学习只显示学习值）+ 上下取整 + ✓✗
- 列宽：罗盘列 1.7fr、结果列 1fr，罗盘上限 480px（v1.65）
- **窄视口自适应**（<1450px 两面板改上下排，v1.65）

### 9.10 状态持久化与启动恢复（v1.43）

- 计算器改成上次关闭时的状态：若用 trico-3in1 双罗盘模式关闭，下次打开默认该模式
- `tricoPanels` 双罗盘状态、`tricoUiMode` 界面选择均 localStorage 持久化
- `_loadTricoPanels` 有健壮性归一化（v1.61）：残缺对象回落默认值，避免 NaN 崩溃

---

## 10. 数据文件与识别表

### 10.1 核心数据表

| 文件 | 内容 | 用途 |
|------|------|------|
| `识别数据.xlsx` | Trico R1/R2/R3/L2/L3 无风识别表 | 识别表源头（已集成进 HTML） |
| `gunbound calculator.xlsx` | 通用中心弹 Finding Power / Given Time | sanity baseline（不作主路力量护栏） |
| `Boomer开炮表v4.xlsx` | Boomer 2591 数据点（hook/backshot） | v1.08 Boomer-Test 验证基准 |
| `实测数据v1.xlsx` | 52 条玩家实测 | 当前精度基线（raw 偏 0.745°/取整 0.365°） |
| `优化识别数据_v14_含公式说明.xlsx` | v14 优化识别表（已集成） | N2/N3 多项式优化+N4 rot/pi 推导 |
| `现计算器与实测核对_最终版.xlsx` | 52 条核对结果输出 | 核对脚本产物 |

### 10.2 识别表结构（empiricalPhaseTables）

`empiricalPhaseTables[side][spinN]` 二维字典：
- key：`'right:1'`, `'right:2'`, `'right:3'`, `'right:4'`, `'left:2'`, `'left:3'`, `'left:4'`
- value：`[[sd, angle, power], ...]`，sd 步进 0.5-1，范围 1-50（N2/N3/N4）或 1-22（N1）

数据来源：
- R1/R2/R3（right N1/N2/N3）：`识别数据.xlsx` 无风实测
- L2/L3（left N2/N3）：同上
- N4：rot/pi 相位约束法推导（无实测）
- left:1：**无数据**（不存在 left N1）

### 10.3 v14 优化识别表（2026-06-25 升级）

- **N1**：原始识别表（不优化，低角度数据离散）
- **N2/N3**：多项式优化 + finding power（G=441 标定），基准点强制锚定
- **N4**：rot/pi 推导表（G=430），圈数等比例递减
- 角度带小数（如 88.6°），不取整

关键基准点（用户精确确认）：
- 右 N3 sd=20 = **76°/3.76**，sd=40 = **61°/3.95**
- 右 N4 sd=20 = **82°/4.83**
- 右 N2 sd=30 = **47°/3.11**，sd=40 = **35°/3.71**

### 10.4 时间拟合系数表（timePhysicsNoWindT）

`T = a + b·sd` 形式：

| side | N | a | b |
|------|---|---|---|
| right | 1 | 1.7998 | -0.04357 |
| right | 2 | 2.8655 | -0.01427 |
| right | 3 | 4.0756 | -0.00906 |
| right | 4 | 5.1551 | -0.00594 |
| left | 2 | 2.3500 | -0.02304 |
| left | 3 | 3.4780 | -0.01085 |
| left | 4 | 4.8190 | -0.0180 |

### 10.5 phaseFormulas（gPhase 3 次多项式）

`gPhase(sd) = c0 + c1·sd + c2·sd² + c3·sd³`，详见 `TRICO_PHASE_FORMULAS.md` 表。

### 10.6 rot/pi(sd) 二次多项式

`rot/pi(sd) = c0 + c1·sd + c2·sd²`，详见 `TRICO_PHASE_FORMULAS.md` 第二节表。N4 多项式 = `2×N3 − N2`（层级线性外推）。

### 10.7 Boomer 开炮表 v4 结构（`_boomer_table_v4.json`）

由 `_boomer_export4.py` 从 `Boomer开炮表v4.xlsx` 导出，包含：
- **nowind**：无风力度表（sd 1-30，固定角度 81°/70°/50° 找力度），共 30 条 `[sd, p81, p70, p50]`
- **matrices**：6 个风况矩阵，每个含多条 `entries: {ws, wa, mode, angle/dpower}`
  - `81_上` / `81_下`（基础角 81°，基础力 P0=3.967）
  - `70_上` / `70_下`（基础角 70°，P0=2.751）
  - `50_上` / `50_下`（基础角 50°，P0=2.222）
- **每条 entry 的 mode**：
  - `'angle'`：抬角模式（未饱和），力度恒定 P0，找新角度
  - `'power'`：减力模式（抬角饱和后），角度顶到 90°，找减力量 dpower
- **抬角饱和机制**（`crossover_wind`）：当 ws 达到临界值时 90° 仍超 20sd，转入减力模式
- **2591 个数据点**全部用数值求解器验证 100% 精度（`_boomer_full_check.cjs`）

### 10.8 N4 标准 4 点实测（`_all_landing.js`）

right:4 的 4 个标准点（wa=90 纯上风）：

| sd | ws | 实测角度 | 实测力度 |
|----|----|---------|---------|
| 10 | 20 | 84.4° | 3.86 |
| 20 | 20 | 79.3° | 3.88 |
| 30 | 20 | 73.9° | 3.93 |
| 40 | 21 | 68.4° | 3.97 |

### 10.9 全量核对数据（`_all_compare.json`）

34KB JSON，含 52+ 条核对记录，每条结构：
```json
{
  "d": { "distance":3.27, "elevation":0, "windAngle":170, "windStrength":24,
         "angle":74, "power":3.762, "side":"右", "n":3 },
  "dir": "right", "n": 3, "effWa": 170,
  "realA": 74, "realP": 3.762,
  "predA": 74.55, "predP": 3.805, "predT": 4.103,
  "src": "落地时间求解器",
  "dA": 0.553, "dP": 0.043,
  "wx": -23.6, "wy": 4.17,
  "backshot": false
}
```
用于跨版本回归对比。

---

## 11. 辅助脚本体系（`_*.js`/`_*.cjs`/`_*.py`）

项目根有 100+ 个下划线前缀的辅助脚本，按功能分类：

### 11.1 求解器切片脚本（用于回归测试）

| 文件 | 行数 | 内容 |
|------|------|------|
| `_calc_node.js` | 175KB | Trico 求解器完整切片（vm 沙箱跑） |
| `_wind.js` | 175KB | 含风求解器切片 |
| `_root.js` | 175KB | 根求解切片 |
| `_cmp.js` | 175KB | 对比求解切片 |
| `_case1.js`/`_case1b.js`/`_case1c.js` | 170KB | 三个测试 case 切片 |

### 11.2 Boomer 数值求解器实验（v1.08，30+ 个 `_boomer_*.cjs`）

| 文件 | 内容 |
|------|------|
| `_boomer_table_v4.json` | 284KB，Boomer 开炮表 v4 全数据（nowind + 6 矩阵） |
| `_boomer_export4.py` | 从 Excel 导出表 v4 |
| `_boomer_full_check.cjs` | 完整精度核对（2591 点 100%） |
| `_boomer_real.cjs` | 真实游戏物理（aimbot 源码 speed=1.395, g=62.5）对比 |
| `_boomer_solver.cjs` | 数值求解器原型 |
| `_boomer_analytic.cjs` / `_boomer_exact.cjs` | 解析解对比 |
| `_boomer_hook.cjs` / `_boomer_gale.cjs` | Hook/Gale 场景验证 |
| `_boomer_summary.cjs` | 最终汇总报告 |
| `_boomer_units.cjs` | 单位核对 |

### 11.3 核对/验证脚本

| 文件 | 内容 |
|------|------|
| `_verify_actual_source.js` | 用真实 calcExcelFromTime 源码核对 11 用例（教训#4 验证） |
| `_verify_all_vehicles.js` | 全车种核对 |
| `_verify_consistency.js` | 一致性核对 |
| `_verify_v106.js`/`_verify_v107.js`/`_verify_v108.js` | 各版本回归 |
| `_test_all_analysis.js` | 全量分析 |
| `_cmp_full.js`/`_cmp_versions.js` | 版本对比 |

### 11.4 相位/旋转诊断

| 文件 | 内容 |
|------|------|
| `_T_logic.js` | T 逻辑诊断 |
| `_derive_dT.js`/`_verify_dT.js` | dT 推导与验证 |
| `_check_T_conservation.js` | T 守恒检查 |
| `_check_omega.js` | omega 幂律检查 |
| `_phaseB_*.js` (v2-v5) | 方向B 相位求解器试验 |
| `_hybrid_n4.js` | N4 混合求解试验 |
| `_n3_*`/`_n4_*` | N3/N4 专项诊断 |

### 11.5 实测数据 JSON

| 文件 | 内容 |
|------|------|
| `_real.json` | 早期实测数据 |
| `_real_v1.json` | 实测数据 v1（52 条） |
| `_n3_full.json` | N3 全量数据 |
| `_n3_compare.json` | N3 对比 |
| `_all_compare.json` | 全量对比（34KB） |
| `_vlc.json` | 某分析数据 |

### 11.6 Python 数据处理

`_build_node*.py`（4 个）：从 HTML 抽取 `<script>` 切片生成 `_calc_node.js` 等。
`_analyze*.py` / `_cmp_analyze.py` / `_conclusion.py`：分析结论。
`_dump_phase.py` / `_probe.py`：相位 dump/probe。

### 11.7 命名约定

- `_xxx.js`：Node.js CommonJS 脚本（vm 沙箱跑 HTML 切片）
- `_xxx.cjs`：显式 CommonJS（避免 ESI 冲突）
- `_xxx.mjs`：ESM 模块
- `_xxx.py`：Python 数据处理
- 前缀 `_` 表示「临时实验/辅助」，不入主程序

---

## 12. 老计算器反汇编项目（`beta/`）

### 12.1 文件性质

3 个老计算器 exe（VB6 native 编译，非 p-code）：
- `2.1.6.exe`（2007）
- `2.2.2.exe` / `2.2.3.exe`（2008，内部名 `020430Trico3in1Calculator`）

公式编译成 x86 机器码（2.2.3 含 22854 个 x87 浮点指令），**无法一键反编译回 VB 源码**。2.2.2/2.2.3 同时实现 `g=196`(GME) + `g=430`(Excel) **双物理模型**。

### 12.2 核对结论（基础物理同源）

通过 Ghidra 反编译 + 常量字节搜索 + 数据流追踪：

| 项 | 老计算器(2.2.3) | 现计算器 | 一致性 |
|----|----------------|---------|--------|
| PF | 0.004332712 | 0.004332712 | ✅ 完全一致 |
| velocity×PF=power | 同 | 同 | ✅ |
| 角度求解 | atan×57.29 | atan×180/π | ✅（57.29≈180/π） |
| 重力(Trico) | 430 | 430 | ✅ |
| 重力(GME) | 196 | 196 | ✅ |
| 距离修正 | 2段线性 | 多项式+查表 | ⚙️ 现版更精细 |
| 风力修正 | 固定3档(0.95/0.94/0.9) | 自学习加权平均 | ⚙️ 现版更先进 |
| 相位/圈数 | 10.2824/5.6566 固定系数 | OMEGA幂律+多项式 | ⚙️ 现版不同体系 |

### 12.3 老计算器提取的系数（RULES 未记录的）

```
57.29（弧度转度，出现4次）
10.2824（相位/圈数系数，×57.29=589°，出现3次）
5.6566（×57.29=324°，相位）
4.03、7.1、5、2、0.05、0.5
1.8667/0.04667（距离修正斜率，0.04667×40=1.8667）
1.7/0.03（第二段距离修正）
716.53/1.295、768.245/1.72（初速度/系数）
0.0133333(=2/150)、0.105、4.02、0.005、0.025、1.1
0.95/0.94/0.9（风力3档衰减）
```

### 12.4 实测差异（手动 1 组）

dist=20/elev=0/wind=10/逆风/右打：
- 老 exe: N2=47.3°/2.41, N3=75.7°/3.13
- 现计算器: N2=57°/2.89, N3=71°/3.86
- N2 角度差 10°，说明修正项差距不小（非同公式不同精度，可能是不同修正体系）

### 12.5 反汇编产物位置

- `beta/decompiled_2.2.3.exe.c`（3.1MB，Ghidra 完整反编译）
- `beta/FUN_00519520_core.c` 等 5 个核心公式函数（各 5-8 万行）
- `beta/formula_seq.txt`（19655 条运算序列）
- `beta/VB6反汇编指南.md`（Ghidra 操作指南）
- `beta/公式还原与核对.md`（核对结论）
- `ghidra_proj/TricoProj`（已分析好的 Ghidra 项目）
- `beta/_scan_consts.js` / `beta/_vb6_map.js`（扫描脚本）

### 12.6 自动化老 exe 的失败教训（不要重复尝试）

老 exe **无法可靠自动化**跑批量对比：
1. **PostMessage 无法触发 VB6 Change 事件**（WM_SETTEXT 设文本但不重算）
2. **键盘模拟在后台不生效**（VB6 ThunderRT6 防护）
3. **结果用 GDI 直接画**（非 TextBox，必须 OCR，慢）
4. **内存读取可用但 ASLR + Variant 包裹难定位**

最终只能：(1) 手动操作+OCR（慢）(2) 接受"基础同源、修正不同"的定性结论。**不要再次尝试自动化老 exe 输入**。

---

## 13. 版本演进史

### 13.1 版本号规则（RULES 第十三章强制）

- 格式：`vX.YY`（v1.00 → v1.01 → … → v1.99 → v2.00）
- **每次修改 `gunbound_calculator.html`，版本号末尾 +0.01**
- 两处必须同步：
  1. HTML `<div class="subtitle">` 末尾（`· vX.YY`）
  2. JS 全局 `const APP_VERSION = 'vX.YY';`
- 射击记录每条写入当时的 `APP_VERSION`，用于追溯

### 13.2 主要版本节点

| 版本 | 日期 | 主要改动 |
|------|------|---------|
| v1.00 | ~2026-06-21 | 基线版本（rederived 75 系数补偿） |
| v1.01 | 2026-07-03 | 射击记录系统（命中/误差区分）+ raw 显示 + 上下取整双解 + 角化力 velocity bug 修复（背射）+ 基准风替代无风基准（背射风调整量） |
| v1.02 | 2026-07-03 | 3in1 自检前总备份 |
| v1.03 | 2026-07-03 | BUG-A：背射三球轨迹完全不转（velocity→power/PF） |
| v1.04 | 2026-07-03 | BUG-C：相位评分函数仍用废弃旧 omega（改幂律） |
| v1.05 | 2026-07-03 | BUG-B：顺风大风力度跳变 + N4 无结果（连续 clamp T，**v1.06 已删**，违反硬规则） |
| v1.06 | 2026-07-13 | 删除 v1.05 的 T_cap（cap 事件教训）+ 取整解 T 守恒原则 |
| v1.07 | 2026-07-14 | 方向B 旋转相位求解器试验（已回退） |
| v1.08 | 2026-07-15 | ★新增 Boomer-Test 数值弹道求解器（RK4，支持 hook/backshot 回旋） |
| v1.09~v1.13 | 2026-07-23 | ★**负角度/反向角度支持**（`atan`→`atan2` + 速度矢量模长，去掉 `angleRaw<1` 拒绝）；显示规则 95→-85、91.8→-88.2 |
| v1.14~v1.15 | 2026-07-24 | ★**TRICO_LEARN 锚点自学习模块**（67 种子，物理骨架+命中锚点+delta）；前端优化（隐藏参数框、N1-N4 同屏、✓✗直接记录）；OpenBound 物理源码挖掘（ω=π常数、g=196、无0.5） |
| v1.16~v1.25 | 2026-07-24/25 | ★**弹道轨迹修复**（依次命中 vs 汇聚、旋转速度用相位公式反推、动态弹道启动按钮）；自学习 bug 修复、误差输入语义（打近=正）、误差可复制修改 |
| v1.26~v1.34 | 2026-07-25/26 | 权重体系（风向±15/风力±10/距离±5/落差±5）；种子从实测 Excel 导入；N1 分段相位求解器（换族点 sd9.5）；三球可视化椭圆螺旋投影 |
| v1.35~v1.39 | 2026-07-26 | ★**N2 短段重标定**（左 sd1-14: 2.29→0.35°）；对比录入；**error-recalibration skill**（标定二次误差检测流程固化） |
| v1.40~v1.47 | 2026-07-27 | ★**模拟命中值 simHit**；误差同步规则；全车种误差记录；学习推荐实时刷新；时间新近度加权；状态持久化；误差实时预览 |
| v1.48~v1.49 | 2026-07-27/28 | ★**右N3 重标定**（求解器与识别数据统一→恢复 7.20 旧表为金标，力度必须平滑） |
| v1.50~v1.52 | 2026-07-28 | 右攻N1 sd22/23/24 同解修复（表尾钳位）；★**无风场景统一为基线表标定求解器**（消除「0落差查表/有落差另一套」双轨） |
| v1.53~v1.54 | 2026-07-29 | 学习修正双方案→单选；推荐附上下取整 |
| v1.55~v1.61 | 2026-07-30 | ★**双罗盘并列布局**（左打右/右打左）；罗盘放大 190→380px；输入框点击清空防误触；紧凑重排；±按钮；debug 加固（死CSS清理+字段校验） |
| v1.62~v1.63 | 2026-07-30 | ★**学习方案3 风力线性缩放**；N列加入记录表；真实误差数据分析（逆上风力度偏差全场最大） |
| v1.64~v1.65 | 2026-07-31 | ★**界面2**（精简结果：输入左/结果右）；列宽重分配（罗盘 1.7fr）；窄视口自适应（<1450px 上下排） |
| **v1.65** | 2026-08-03 | 当前版本（10544 行）。上一会话末期用户要求写「说明.md」未完成 |

### 13.3 备份文件清单

```
gunbound_calculator.backup.html                         (v1.00 基线)
gunbound_calculator.backup_before_bugfix.html           (v1.02 自检前)
gunbound_calculator.bugA_before.html / bugB_*.html / bugC_*.html  (各 bug 修正前后)
gunbound_calculator.before_leftN2_recal.html            (left N2 重标定前)
gunbound_calculator.before_rightN3_recal.html           (right N3 重标定前)
gunbound_calculator.v1.07_before_phaseB.html            (方向B 试验前)
gunbound_calculator.before_boomer_test.html             (v1.08 Boomer-Test 前)
--- v1.09~v1.65 新增备份 ---
gunbound_calculator.before_negangle.html                (v1.13 负角度前)
gunbound_calculator.before_selflearn.html               (v1.15 自学习前)
gunbound_calculator.before_n2_recalib.html              (v1.39 N2 重标定前)
gunbound_calculator.before_rightN3_ident.html           (v1.48 右N3 统一前)
gunbound_calculator.before_rightN3_restore.html         (v1.49 右N3 恢复旧表前)
gunbound_calculator.before_n1_tail.html                 (v1.50 N1 表尾修复前)
gunbound_calculator.before_elev_anchor.html             (v1.51 落差锚点前)
gunbound_calculator.before_unified_solver.html          (v1.52 统一求解器前)
gunbound_calculator.before_learn_dual.html              (v1.53 学习双方案前)
gunbound_calculator.before_dual_panel.html              (v1.55 双罗盘前)
gunbound_calculator.before_learn3.html                  (v1.62 学习方案3 前)
gunbound_calculator.before_ui2.html                     (v1.64 界面2 前)
gunbound_calculator - 副本.html / 副本(2).html          (早期副本)
```

---

## 14. 强制规则与硬约束（RULES 摘要）

> 完整规则见 `RULES.md`（50KB），以下为关键摘要。修改 `gunbound_calculator.html` 前**必须先读完 RULES.md**。

### 14.1 单位体系（最高优先级，违反必出错）

1. **`distance` = sd = UI 输入值**，三者同一量，**禁止任何换算**。
   - 历史 bug：`getEmpiricalPhaseAnchor(side, n, distance/(sdParts/8))` 多除 conv，sd=20 被查成 sd=8，全错。
2. **`conv = sdParts / 8.0`** 只用于 `excelDist = distance / conv` 旧路径，**不**给 anchor 用。
3. **sdParts 默认 20**，回归测试必须用 20（曾因用 8 跑出 18° 偏差）。

### 14.2 风向（左射必须翻转）

- `getEffectiveWindAngle()` 已处理翻转：左射 `effA = (180 - wa) % 360`
- 回归测试左射必须先翻转：`wa = ((180 - wa) % 360 + 360) % 360`
- 不翻转 → 左右结果相同 → 误判为 bug（历史上因此误改过 N4 系数）

### 14.3 验证规则（防止谎报）

1. **必须用浏览器真实参数验证**——不许自作主张做单位换算。
2. **UI 渲染验证必须用无头浏览器**（Playwright/Puppeteer headless），不要开 GUI 手动看。
3. 汇报"核对通过"前必须答三个问题：
   - 浏览器里 distance 到底是多少？
   - sdParts 是多少？（默认 20）
   - 风向有没有按左/右翻转？
4. 测试脚本**不许做"让结果更好看"的换算**。

### 14.4 禁止硬加限制（最高优先级硬规则，2026-07-13）

凡是符合以下任一特征的代码都是"硬加限制"，**禁止新增，发现即删**：

1. **拍脑袋的数值截断**（如 `T_cap = ...·0.92`、`clampPhaseTimeBias` 的 ±0.8/±0.85）
   - 例外：从公式推导出的数学边界（如 `denom > 0` 检查后 return null 是合法的）
2. **拍脑袋的角度上限**（`if (angle > 89) return null`，多余双重保险，会毙掉 89.3° 真实解）
3. **拍脑袋的经验门控**（smoothStep01 + 手调阈值 + 魔法系数）
4. **为了让某个症状消失而加的补丁**（cap 是典型）

**正确做法**：求解器算出物理量后直接用；遇数学失效（denom≤0、cosA→0、power 超 MAX）返回 null 让 calcWithWind 路由到其他路径。

### 14.5 现存"硬加限制"审查清单（2026-07-13）

- 🔴 `getBackshotTimeBias`（smoothStep01 + 魔法系数）— 应删/重做
- 🔴 `clampPhaseTimeBias`（死代码）— 可直接删
- 🟡 角度上限 `>89`/`>89.5`/`>89.45`（11 处）— 待统一评估
- 🟡 N4 识别相位 T 搜索范围 — 需确认是否漏解
- 🟢 `denom < 0.001 return null` / `cosA<=0.001` / `power > MAX_DISPLAY_POWER` — 合法保留
- 🟢 windTable / n1TimeGravityTable / timePhysicsNoWindT / dT — 来自实测/识别表的数据，合法

### 14.6 版本控制（强制）

- 每次修改 HTML，版本号 +0.01
- subtitle + APP_VERSION 两处同步
- 射击记录写入 version 字段

### 14.7 主要教训（15 条，详见 RULES 第十二章）

1. **单位错误**：多除 conv
2. **N4 左右不分**：测试没翻转风向
3. **sdParts 错误**：测试用 8 而非 20
4. **Excel 车落差缩放错误**：`(5.17/16)` 当成有效缩放（实际 C4=0）
5. **omega 用错常数**：圈数小 4 倍
6. **背射路由顺序错误**：rederived 在 backshot 之前
7. **dT 物理仿真 vs 实测拟合**：仿真均偏 6.7°
8. **N1 识别表不自洽**：固定 G=430 导致低角度偏差
9. **N4 圈数恒定 vs 等比例递减**：rot/pi 是 sd 函数
10. **given time 解析公式 vs 角度扫描**：解析更快更准
11. **背射角化力 velocity 字段错误**：背射 velocity 存力度量级（教训 #14.3）
12. **背射风调整量缺失**：背射无风基准物理不存在，用基准风替代
13. **角度 .5 边界跳变**：显示 raw + 双解
14. **核对数据角度/力度错配**：必须成对用取整解
15. **角化力取整解算法演进**：落点守恒 + ΔT 分级容忍（最终）

---

## 15. 已知限制与未完成工作

### 15.1 已知限制

> **v1.65 进展标注**：v1.09~v1.65 期间，限制 1/2/3 已部分缓解（负角度支持、N1 分段相位、学习方案3 风力缩放）。以下为原始记录，括号内为最新状态。

1. **left N1 无结果**：`timePhysicsNoWindT`/`n1TimeGravityTable` 缺 `'left:1'` 键，全场景返回 NULL。（v1.13 后向下打/反向场景已能出解，但 left:1 键仍缺）
   - 用户决策（2026-07-03）：保持现状。left N1 游戏里罕见，无实测数据，强行镜像有风险。
2. **N1 低角度精度偏差**：raw 平均 1.26°，集中在纯逆风 wa=180° 和大风低角度场景。（v1.34 N1 分段相位求解器后有所改善）
3. **N3/N4 风力力度系统偏小**：-0.023，大风（18-26）偏差更大（0.053 vs 小风 0.043）。（v1.62 学习方案3 风力线性缩放可修正；数据分析证实逆上风偏差全场最大）
4. **omega 幂律模型外推不准**（方向B 未启用的根因）：标定范围 V=773-829（ws=20），V=879（ws=12）外推 omega·T 差 0.1 圈。（OpenBound 挖掘发现游戏真值是 ω=π 常数，方向B 重启条件待重新评估）
5. **N4 rot/pi 外推值偏高**：实测反推 right≈6.9、left≈7.1（外推法 `2×N3−N2` 偏高 0.45 圈）。
6. ★**v1.65 新增**：说明.md 项目说明书未生成（会话末期用户要求未完成，本 PROJECT_GUIDE 更新已补全）。

### 15.2 当前精度基线（52 条实测）

- **raw 平均偏差**：角度 0.745°，力度 0.0487
- **取整解平均偏差**：角度 0.365°，力度 0.0725
- **0° 角度偏差**：39/52（75%）
- **>2° 角度偏差**：0 条
- 无系统偏向（正负偏差均衡）

按 N 分组（raw 偏差）：

| N | 条数 | 角度偏差 | 力度偏差 |
|---|------|---------|---------|
| N1 | 10 | 1.26° | 0.047 |
| N2 | 11 | 0.82° | 0.030 |
| N3 | 20 | 0.50° | 0.052 |
| N4 | 11 | 0.65° | 0.063 |

### 15.3 待扩充的数据场景

- N1 低角度（<30°）+ 大风（20+）+ 纯逆风（wa=180°）
- N3/N4 + 大风（18-26）+ 各种风向
- 背射（dist<0）+ 强逆风
- 不同 V/风力的实测数据（重标定 omega 幂律）

### 15.4 优化方向（v1.65 部分已实施）

1. **N1 低角度精度**（优先级最高）：★v1.34 已实施分段相位求解器（换族点 sd9.5 两段拟合）；可继续扩充 n1TimeGravityTable
2. **N3/N4 风力力度修正**：★v1.62 已实施学习方案3（风力线性缩放）；公式层大风系数仍可调
3. **落差**：影响小，非重点（有落差反而偏差更小）

### 15.5 待重启的工作

- **方向B 旋转相位约束求解器**：修好 omega 模型后从备份恢复（`gunbound_calculator.v1.07_before_phaseB.html`）

### 15.6 重建建议（CURRENT_SHOOTING_MODEL.md 第13节）

建议把新版拆成纯模块：
```
units / wind / ballistic / excelVehicles
trico/base / trico/n123Phase / trico/n4Recognition / trico/threeBalls
diagnostics
```
**计算**和**验证**必须分开，验证模块不应反过来改力度。

---

## 16. 开发工作流与验证规范

### 16.1 修改前的准备

1. **读 RULES.md**（50KB，强制）
2. 读 CURRENT_SHOOTING_MODEL.md（架构理解）
3. 用 `grep -n "<关键词>"` 定位行号（修改后行号会漂移）

### 16.2 验证流程

```
纯数值验证（求解器返回值）：
  → vm 沙箱跑 <script> 切片
  → 用 _verify_*.js / _test_*.js 脚本
  → 参数必须与浏览器一致（sdParts=20, 左射翻转风向）

UI 渲染验证（页面显示）：
  → python -m http.server 8899
  → Playwright MCP headless
  → browser_snapshot / browser_evaluate 抓 DOM
  → 不开 GUI 手动看
```

### 16.3 切片测试约定

从 HTML 抽取 `<script>` 切片做沙箱测试时：
- cut 范围必须覆盖到 `EXCEL_TRICO` 闭合行
- 用 `grep -n "^        const EXCEL_TRICO\|^        };"` 定位闭合
- 修改后行号会漂移，**每次都要重新 grep**

### 16.4 核对脚本逻辑（复用）

```
1. 读 实测数据v1.xlsx（距离/落差/风向/风力/实测角度/实测力度/方向/N）
2. 左射风向翻转: wa → (180-wa)%360
3. 调 searchTrico3in1Physics(dist, 20, side, effWa, wind, EPPU*elev)
4. 选匹配N的raw解 → 取整解(落点守恒+ΔT容忍)
5. 对比实测，算角度差/力度差
```
EPPU = 516/13。输出到 `现计算器与实测核对_最终版.xlsx`。

### 16.5 提交检查清单

- [ ] 版本号 +0.01（subtitle + APP_VERSION 两处同步）
- [ ] 全量实测回归（54 条）MAE 不退化
- [ ] 无 >0.5° 的逐条变化（除非预期）
- [ ] 无风基准点保持：N2=60.8/2.75、N3=76/3.76、N4=82/4.83
- [ ] 新代码无硬加限制（参见 14.4）
- [ ] 备份文件已创建（gunbound_calculator.before_*.html）

---

## 17. 关键索引（grep 关键词）

修改后行号会漂移，用 grep 定位：

### 17.1 物理参数与常量

| 内容 | grep 关键词 |
|------|------------|
| 应用版本号 | `const APP_VERSION` |
| 物理参数 | `const TRICO` / `const TRICO_NEW` |
| 车种表 | `const TANKS = {` |
| Excel 车 | `const EXCEL_VEHICLE` |
| Trico 主对象 | `const EXCEL_TRICO` |

### 17.2 Trico 核心函数（行号为 **v1.65** 当前值，修改后会漂移）

| 内容 | 行号 | grep 关键词 |
|------|------|------------|
| 应用版本号 | :1819 | `const APP_VERSION` |
| 识别表 | :2243 | `empiricalPhaseTables:` |
| 相位公式 | :2282 | `phaseFormulas:` |
| 落地时间求解器 | :2262 | `calcTimePhysicsSolver` |
| 5 舍 6 入 | :2408 | `roundAngleForTrico` |
| 路由入口 | :3299 | `calcWithWind` |
| rederived | :3522 | `calcRederivedPhasePhysicsN123` |
| N4 正向 | :3673 | `calcN4PhaseValidatedForward` |
| Trico 主入口 | :4778 | `searchTrico3in1Physics` |
| ★自学习模块 | :7409 | `TRICO_LEARN` |
| 取整解力度 | — | `powerAtIntegerAngle` |
| EXCEL_TRICO 闭合 | — | `grep "^        const EXCEL_TRICO\|^        };"` |

### 17.3 Excel 车（行号为 **v1.65** 当前值）

| 内容 | 行号 | grep 关键词 |
|------|------|------------|
| Excel 风参数 | :4978 | `calcExcelWindParams` |
| Excel 定角 | — | `calcExcelCenterTrajectory` |
| Excel 定时 | — | `calcExcelFromTime`（在 EXCEL_VEHICLE 内）|
| Excel 定力 | — | `calcExcelFromPower`（在 EXCEL_VEHICLE 内）|
| Turtle 打法 | — | `calcTurtleModes` / `TURTLE_MODES` |
| Boomer 打法 | — | `calcBoomerModes` / `BOOMER_MODES` |

### 17.4 Boomer-Test（行号为 **v1.65** 当前值）

| 内容 | 行号 | grep 关键词 |
|------|------|------------|
| RK4 数值积分 | :5133 | `simBoomerTrajectory` |
| 定角找力 | — | `calcBoomerTestPower` |
| 定力找角 | — | `calcBoomerTestAngle` |
| 统一入口 | — | `calcBoomerTestMode` |
| 渲染 | — | `renderBoomerTest` |

### 17.5 UI 与渲染（行号为 **v1.65** 当前值）

| 内容 | 行号 | grep 关键词 |
|------|------|------------|
| 模式切换 | :1364 | `switchMode` |
| 主计算入口 | :8061 | `_doCalculate` |
| 轨迹绘制 | :7552 | `drawTrajectoryCanvas` |
| 罗盘渲染 | :6926 | `renderCompassDots` |
| 射击记录 | :9296 | `saveShotRecord` / `recordHit` / `recordMiss` |
| Toast | — | `showToast` |
| 双罗盘状态加载 | — | `_loadTricoPanels` |
| 界面1/2 切换 | — | `tricoUiMode` |

## 18. v1.09~v1.65 迭代工作总结（2026-07-23 ~ 2026-08-03）

> 本章是对上一会话（task-80501c6539f44883bffb，10 天 / 79 条用户指令 / 1048 次工具调用）的完整记录。
> 会话日志：`~/.qoder/projects/c-Users-fanli-Documents-zcodegunbound/transcript/task-80501c6539f44883bffb.session.execution.jsonl`（8MB）。

### 18.0 会话概览

会话从「为什么这个数据下没有 N4 结果」这一用户提问启动，贯穿负角度、弹道修复、自学习、求解器重标定、双罗盘 UI、界面2 六大主线，把计算器从 v1.08（9174 行）推进到 v1.65（10544 行）。以下是按阶段的技术细节。

### 18.1 负角度 / 反向角度支持（v1.09~v1.13，7-23）

**起因**：用户发现距离10/顺风26/右攻场景 N3/N4 无结果，以及距离20/落差-15 的 N1 无结果。

**根因**：求解器用 `atan`（丢失象限）+ `angleRaw < 1 return null`，把向下打（负角度）和强顺风过冲略反向（>90°）的合法解全部抛掉。

**修法**（v1.13）：
- 角度求法 `atan` → **`atan2`**（保象限）+ 速度取矢量模长
- 去掉 `angleRaw<1` 和 `sinA/cosA<=0` 拒绝（保留 `denom<=0` 数学失效检查）
- **正向解零回归**：denom>0且num>0 时 atan2≡atan，67 条样本 Δ=0

**显示规则**：95° 显示成 -85°，91.8° 显示成 -88.2°（用户指定）。

**新增场景**：dist20/落差-15 → N1=-24.9°/3.54（向下打）；dist10/顺风26 → N3=91.8°/2.94、N4=95.0°/3.75（略反向）。

### 18.2 OpenBound 物理源码挖掘 + 自学习模块（v1.14~v1.15，7-24）

**物理挖掘**：从开源客户端重实现 [OpenBound](https://github.com/WickedPeanuts/OpenBound)（C#/MonoGame，含 datamined values）提取出游戏真实弹道模型：

| 机制 | 游戏(OpenBound) | 计算器 | 一致性 |
|---|---|---|---|
| 位移公式 | `x = v0·t + a·t²`（**无 0.5**） | `x = v0·t + 0.5·a·t²` | ⚠️ 结构不同（拟合不可区分）|
| 重力 | **196**（=9.8×20） | G=430（含0.5等效392） | ⚠️ 差~10% |
| 侧弹旋转 ω | **π rad/s 常数**（与 V 无关） | 幂律 0.0236·V^0.764 | ⚠️ 根本不同模型 |
| 旋转半径 R | 35px | 35 | ✅ |
| offset 渐增 | 2/s（0.5s 涨满） | 2 | ✅ |
| 命中框 | 40×33 | 40×33 | ✅ |
| Trico mass/windInfl | 10 / 1.2 | 0.23 / — | ⚠️ 单位系不同 |

> 关键澄清：位移公式的 0.5 因子在拟合落点时不可区分（无0.5的g=196 ⟺ 有0.5的g=392）。计算器仍用自有模型（标定已 works），OpenBound 值仅作参考。

**自学习 TRICO_LEARN**（v1.15）：
- **核心理念**：物理引擎当骨架，真实命中当锚点，只学两者间的「小偏差 delta」，三球命中判据兜底
- 锚点按 (side, N) 严格隔离，内置 67 条种子
- 学的是 `命中值−物理值`，无数据退回纯物理，delta 有置信度加权 + 封顶（≤3°/0.2）
- 旧 `WIND_CORRECTIONS`（相位不安全）废弃保留不删
- P0 数据闭环（记录→锚点）/ P1 推荐显示 / P2 应用开关，三层渐进交付

### 18.3 弹道依次命中修复（v1.16~v1.25，7-24/25）

**用户核心纠正**（反复多次）：
1. 三颗炮弹**不是同时汇聚**到目标点，而是命中时**位置依次命中**一个敌人
2. 旋转速度不对（N4 应 3 次多不到 4 次）
3. N2 命中点相位不合上

**修复方向**：
- 旋转速度改用**相位公式反推**（`turns = ω(V)·T/2π`，必须落在该 N 区间）
- 命中判据用几何判定：沿轨迹逐点算侧弹位置，取到目标 hitbox(40×33) 最近距离 ≤ R(35px)
- **三球可视化**改为**椭圆螺旋投影**（切线主轴 + 0.35 垂直副轴），侧弹绕中心弹旋转
- 新增**动态弹道**启动按钮（炮弹延弹道运行→命中目标动画）
- 灵敏度量化：力度+0.05 → 侧弹脱靶 +34px（超 35 阈值）；角度+1° → +46px

### 18.4 权重体系 + 种子导入 + N1 分段相位（v1.26~v1.34，7-25/26）

**自学习权重**（用户指定）：
- 风向权重最大（±15° 为限）、风力±10、距离±5、落差±5
- 精确匹配优先取最新命中，无命中才用误差

**种子导入**：从实测 Excel 格式一键导入（对比录入，去重）。

**N1 分段相位求解器**：
- N1 数据 sd9→10 有 10° 断崖，根因是**相位换族**（53°族 rot_pi≈1.10 → 43°族≈1.00），非测量错误
- 改为**两段拟合**（sd≤9.5 / sd>9.5）而非硬抹平滑
- 段A: rot_pi = 1.10781 + 0.04007·sd − 0.00480·sd²
- 段B: rot_pi = 0.78698 + 0.01630·sd + 0.00046·sd²

### 18.5 N2 重标定 + error-recalibration skill（v1.35~v1.39，7-26）

**N2 短段重标定**（左攻 sd1-14 重灾区）：
- 左 N2 短段：角度 MAE 2.29°→**0.35°**，力度 MAE 0.109→**0.007**，危险点 12/14→**0**
- 右 N2 短段：力度 MAE 0.036→0.020
- G(sd) 左=414.56+0.296·sd、右=426.67+0.080·sd（稳定段拟合外推）
- 全距离平滑审计通过（0.25 步长，最大单步 <1°）

**error-recalibration skill**：把标定变更时的误差二次核算流程固化为项目 skill（`.qoder/skills/error-recalibration/`）：旧公式算「调整后前提的解」记为实测 → 新公式做二次误差检测。

### 18.6 模拟命中值 + 误差系统增强（v1.40~v1.47，7-27）

- **模拟命中值 simHit**（v1.40）：= 按「距离+水平调整、落差+垂直调整、同风」用当前求解器解出的真正能命中的解。开机幂等补算。
- **误差同步规则**（v1.41）：基础数值/公式调整时，误差值 = 历史模拟命中 vs 最新版同环境结果的差异
- **全车种误差记录**（v1.41）：不只 Trico
- **学习推荐实时刷新**（v1.42）：误差生效后即时显示，不刷页面
- **时间新近度加权**（v1.42）：最新权重最大，不覆盖旧样本
- **状态持久化**（v1.43）：启动恢复上次模式
- **误差实时预览**（v1.42）：输入调整量时右边实时显示调整后数值

### 18.7 右N3 重标定 + 统一求解器（v1.48~v1.52，7-27/28）

**右N3 重标定**（关键决策）：
- v1.48：发现右N3（左打右）求解器与识别数据不同，统一为一致
- v1.49：用户拍板**恢复 7.20 旧表为金标**（旧解合理得多，新数据变化不平滑且实战偏小）
- **核心规范**：右N3 基线**以 7.20 实测旧表为准**，允许角度带小数但**力度必须平滑**

**统一求解器**（v1.52）：
- 消除「0落差查识别表、有落差走另一套」的双轨
- 无风场景（含 0风0落差）统一为**单一基线表标定求解器**
- 右攻N1 sd22/23/24 同解修复（表尾钳位假解）

### 18.8 学习双方案（v1.53~v1.54，7-29）

- 方案1（原始四维加权）+ 方案2（风向辐射，去掉距离限制，只按风向±15°）
- 改为**单选**（一次只显示一个），附上下取整

### 18.9 双罗盘布局（v1.55~v1.61，7-30）

- Trico 模式分成两个并列模块：左面板=左打右，右面板=右打左
- 罗盘上限 190→380px（占 90% 模块空间）
- 输入框点击清空 + 连续点击不处理（防误触）
- ±0.5/±1 步进按钮，方向标识精简为箭头
- debug 加固：清理死 CSS `.trico-dir-mini` + `_loadTricoPanels` 字段校验归一化（防 NaN 崩溃）

### 18.10 学习方案3 + 真实数据分析（v1.62~v1.63，7-30）

**学习方案3（风力线性缩放）**：在方案2 基础上，样本修正量按 `当前风力/样本风力` 等比换算。

**真实误差数据分析**（152 条 Trico，用户提供的 CSV）：
- **逆上风（135°）力度偏差全场最大**（0.056，是上风的 2 倍）——用户手感得到数据证实
- 逆上/逆风角度系数 100% 全负，顺风/下风 100% 全正——**系统性方向偏差**，非随机
- 风力偏差近线性增长——支持方案3 设计
- N 列加入记录表（v1.63）

### 18.11 界面2（v1.64~v1.65，7-31）

- 界面1/2 切换（localStorage 持久化）
- 界面2 三栏网格：罗盘左=输入竖排，罗盘右=精简结果，罗盘下=风向
- 精简结果：N 圈数 + 角度/力度（有学习只显示学习值）+ 上下取整 + ✓✗
- 列宽：罗盘 1.7fr / 结果 1fr，罗盘上限 480px
- 窄视口自适应（<1450px 两面板上下排）

### 18.12 关键技术决策汇总

| 决策 | 结论 | 依据 |
|------|------|------|
| atan vs atan2 | 用 atan2 保象限 | 正向解零回归，新增负/反向解 |
| 位移 0.5 因子 | 保留计算器自有模型 | 拟合不可区分，标定已 works |
| 右N3 基线 | 7.20 旧表金标 | 新数据不平滑且实战偏小 |
| 无风场景 | 统一基线表求解器 | 消除双轨 |
| 自学习接入主计算 | 启用后替代物理值显示 | delta 小 + 相位判据兜底 |
| 学习方案 | 三方案单选 | 不同场景适配 |

### 18.13 会话末期未完成项

- 用户最后一条指令（8-03 04:56）：「总结归纳写项目说明书 说明.md」——**未完成**（会话在 12:56 结束时未生成 说明.md）
- 本文档（PROJECT_GUIDE.md）的本次更新即补全该项工作

---

## 附录 A：项目记忆库信息

项目已在 codebase-memory MCP 中索引：
- **project name**：`C-Users-fanli-Documents-zcodegunbound`
- **节点/边**：1390 节点 / 5036 边
- **语言分布**：Python 18 文件 / JavaScript 12 文件 / HTML 4 文件
- **热点函数**：`roundAngleForTrico`（fan_in 13）、`buildResultAllowingExcelOutliers`（fan_in 8）
- **主要 cluster**：`_root`/`_wind`/`_calc_node`/`_case1*`/`_cmp`（76-77 成员，cohesion 1.0）

## 附录 B：关键参考文档

| 文档 | 用途 |
|------|------|
| `RULES.md` | 强制规则与教训（修改前必读） |
| `CURRENT_SHOOTING_MODEL.md` | 当前射击模型完整架构 |
| `TRICO_PHASE_FORMULAS.md` | Trico 相位公式推导 |
| `TRICO_PHYSICS_FINDINGS.md` | 物理模型调研结论（54条验证） |
| `.zcode/plans/plan-sess_3a30332b-*.md` | v1.08 Boomer-test 方案 |
| `.zcode/plans/plan-sess_b362be25-*.md` | 方向B 旋转相位求解器方案 |
| `beta/VB6反汇编指南.md` | 老 exe 反汇编操作 |
| `beta/公式还原与核对.md` | 老计算器核对结论 |

---

**文档结束**。如有遗漏或需补充，参考上述源文档（`RULES.md` / `CURRENT_SHOOTING_MODEL.md` / `TRICO_PHASE_FORMULAS.md` / `TRICO_PHYSICS_FINDINGS.md`）获取最权威信息。
