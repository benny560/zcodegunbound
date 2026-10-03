---
name: error-recalibration
description: Gunbound 弹道计算器(gunbound_calculator.html)标定/公式变更时的误差记录二次核算标准流程。当修改求解器基线表(empiricalPhaseTables)、相位公式(phaseFormulas)或任何影响解算结果的标定参数时使用；也适用于用户要求"重新核算误差记录"、"更新N标定"、"标定二次误差检测"等场景。
---

# 误差调整 (标定变更 → 误差记录二次核算)

## 核心原则（RULES.md 第二十章，权威口径）

- **误差值定义**：误差值（调整量）= **历史模拟命中值（record.simHit）** 与 **最新版计算器同环境结果** 之间的差异。
- **simHit 是物理事实**（录入/修改时由当时公式算出的"真正能命中的解"），标定变更时**不得重算/覆盖**；只有用户重新录入或修改调整量时才刷新。
- **调整量是公式相关量**，标定一变就过时，必须以 simHit 为目标重算。
- 求解器无风基线 = `empiricalPhaseTables`（[sd,角,力] 按 sd 插值）；**有风路径走 `phaseFormulas`，与无风基线互相独立**。

## 标准流程（按序执行）

### ① 确保每条受影响误差记录有 simHit 快照

- v1.40 起误差记录录入/修改/复制时自动存 `simHit`（= 当时公式在"距离+调整量"前提的解），快照已就位，无需额外动作
- 无 simHit 的古老记录：用**旧公式**补算——旧基线表嵌为 `LEGACY_*` 常量插值还原；本次未变的路径（如只改基线时的有风路径）直接用当前求解器
- 同时把 simHit 补记为实测命中记录（`source:'recalib'`）+ `TRICO_LEARN.addHit` 锚点（真实数据进自学习）

### ② 应用标定变更

- **备份** `gunbound_calculator.html` → `gunbound_calculator.before_<变更名>.html`
- 数据级替换优先（改表值），不动公式层/风修层；版本号 +0.01；表注释写明日期/依据/新旧MAE

### ③ 改公式后：以 simHit 为目标二次核算调整量

对每条受影响误差记录，用**灵敏度法**以历史 simHit 为目标重算调整量：
```
目标 (angle*, power*) = record.simHit（历史模拟命中值，不得重算/覆盖）
s0 = 新求解器(d);  s1 = 新求解器(d+0.5)
斜率 sA=(s1.angle-s0.angle)/0.5, sP=(s1.power-s0.power)/0.5
残差 rA=angle*-s0.angle, rP=power*-s0.power, k=25(力度权重/单位)
adj = (sA·rA + k²·sP·rP)/(sA² + k²·sP²)，夹到±4，取2位小数
```
- 更新 `record.horizontalError`，原值存 `record.origHError`，标 `record.recalib='<版本>'`
- **不重算 simHit**（它是历史事实；重算会在多次标定间累积漂移）
- 同步更新关联 miss 锚点的 `adjD`
- **seedcmp（对比录入）记录**：按新求解器对链接种子重判真命中（取整角相等且 |Δ力|≤0.02）→ 可能转命中

### ④ 幂等与执行位置

- 迁移必须在**用户浏览器**执行（记录在 localStorage）→ 做成页面加载时的一次性迁移（`RECALIB_VXXX.run()`，localStorage 标志防重跑），放在 `TRICO_LEARN._load()` 之后
- 参考实现：`gunbound_calculator.html` 中的 `RECALIB_V139`

### ⑤ 回归验证（全过才算完成）

| 检查 | 工具/方法 | 通过标准 |
|---|---|---|
| 识别表 | 沙箱加载新旧文件对比（`_ident_table.json`）| 目标段 MAE 改善，其余段不变 |
| 67条实测 | `node _compare_v114.cjs` | 各组 MAE 不恶化 |
| 背射 | `node _test_round_backshot.cjs` | 不变 |
| 其他 N 不变性 | 新旧文件逐位对比多距离解 | 差异=0 |
| 风力连续性 | ws=0 vs ws=1 解的跳变 | 不出现新断层（本次修复还消除了旧断层）|
| 迁移端到端 | 浏览器构造3类测试记录（无风误差/有风误差/seedcmp）→ 清标志重载 | 快照值正确、调整量更新、幂等 |

## 注意事项

- Node 沙箱加载 HTML 需完整 DOM 桩（fake element 链式返回），照抄 `_compare_v114.cjs` 的 `loadApi`
- 陡角区（>80°）拟合相位时，T 用**竖直方程** `T=2V·sinA/G` 反推（sin 不敏感），避开 cos 噪声放大
- 相位拟合遇断崖（换族）必须**分段**，不可单条曲线硬抹（N1 sd9/10 教训）
- 任何一项回归恶化 → 回滚备份，不发布
