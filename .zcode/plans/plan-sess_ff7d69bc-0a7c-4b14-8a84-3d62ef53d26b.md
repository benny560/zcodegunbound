# 实战地图模拟（Trico 3in1 手动试射）实现计划

## 目标交付物
在 `gunbound_calculator.html` 中新增「🗺️ 实战地图模拟」功能：在真实游戏地形上放置我方/敌方坦克，输入角度+力度+风向，看 Trico 三球弹道如何飞过地形、撞地、是否 3in1 命中敌方。含**所有经典客户端地图**（预设地形）+ **图片导入真实地形**。仅 Trico 3in1。

## 数据来源（已与用户确认）
- 预设地形：手绘各经典地图的**特征性地形折线**（代表性轮廓，非逐像素提取）
- 图片导入：用户拖入客户端地图截图，按可调阈值提取地面轮廓，覆盖预设

## 交互（已确认）：手动试射看落点
输入 角度+力度+风向+我方/敌方位置 → 三球按真实物理飞行 → 与地形碰撞 → 显示各球落点 + 是否命中敌方(40×33 hitbox) + 涌现的旋转圈数(N1~N4)。另提供「参考解」：按当前位置自动调用现有求解器给出 N1~N4 的角力度，供用户对照试射。

---

## 步骤 1 — 备份 & 版本
- 复制 `gunbound_calculator.html` → `gunbound_calculator.before_realmap_sim.html`（沿用 `before_<feature>` 命名）
- `APP_VERSION` (L1819) `v1.68` → `v1.69`；同步更新副标题 (L1345)

## 步骤 2 — 地图数据模块（新 JS 对象，插在 TRICO 对象附近 ~L2225 后）
新增 `const GB_MAPS = { ... }`，每张地图：
```
{ name:'米拉镇 Miratown', width:1600, height:520,
  sky:'#9ec9ff', groundFill:'#7a5a3a',
  terrain:[ {x:0,y:0},{x:200,y:-8},{x:600,y:6}, ... ],   // 特征控制点
  note:'较平坦沙漠' }
```
- 地图列表（10张 + 随机）：Miratown米拉镇 / Sea of Hero英雄之海(中央高峰+两侧水)/ Adium Root亚迪乌姆之根 / Meta Mine美达矿山(阶梯)/ Cozy Tower舒适塔(双塔)/ Slope斜坡(对角)/ Cave洞窟 / Stardust星尘(起伏月面)/ Empire帝国 / Random随机
- 工具函数 `mapGroundY(map, mapX)`：对 terrain 折线分段**线性插值**返回地面 y（向上为正）
- `terrain` 为我按各地图公开特征手绘；用户可后续微调控制点

## 步骤 3 — 前向物理封装（新函数，插在 calcTricoThreeBalls ~L5510 后）
`simulateTricoForward(angleDeg, power, side, windAngleDeg, windStrength)`：
1. `wp = calcWindParams(side==='left' ? mirror(windAngleDeg) : windAngleDeg, windStrength, 1.0, 430, 0.23)`（复用 L4960）
2. `V = power / 0.004332712`；`vx0=V·cos`，`vy0=V·sin`
3. 解析采样中心弹道（细 dt 到 tmax=12s），在**地图坐标系**逐点判断 `mapY ≤ groundY(mapX)` 得地形撞击点 → 得飞行时间 `T_impact` 与中心轨迹（物理坐标，发射点为原点）
4. 组装 `centerResult = {time:T_impact, xVelocity:vx0, yVelocity:vy0, xA:wp.xA, effectiveGravity:wp.effGrav, power}`
5. 调 `calcTricoThreeBalls(centerResult, side)`（L5451，**真实旋转**，omega 来自力度）得 3 球轨迹
6. 每球轨迹转地图系 → 地形裁剪到各自撞地点 → 返回 `{ centerTraj, balls:[{traj,impact}], T, rotationCount: omega·T/2π }`
- **不使用** `calcTricoThreeBallsNewPhysics`（显示 hack，强制汇聚）
- 与求解器同一套重力430/质量0.23/风力公式 → 与现有求解结果形状一致

## 步骤 4 — UI：地图模拟面板（新增 HTML + CSS）
- 在现有「弹道轨迹图」面板标题栏 (L1642) 加切换：`[标准弹道图] [🗺️ 实战地图模拟]`
- 切到地图模拟时显示新子块（与标准 canvas 互斥显隐）：
  - 控制条：`地图▼`(含全部预设+「📥 导入图片」) | `我方X` `敌方X`(数字+可在画布拖动) | `方向[向右/向左]`(默认按位置自动)
  - 风向：`风角0-359`(迷你滑条) `风力0-26`
  - 试射：`角度` `力度(0-5,与求解器一致)` `▶ 试射/播放` `⟲ 重置`
  - 只读提示条：`距离=|敌-我|→SD` `落差→单位` `涌现旋转≈N2.3` `命中: 3in1✅/散落❌` `N1~N4参考解: …`
- 新画布 `#map-sim-canvas`（宽响应 × ~480px，统一比例缩放地图）
- 复用设计系统：`.panel`/`.section-label`/`getCSSVar('--canvas-*')`，明暗主题自动跟随

## 步骤 5 — 地图绘制 & 交互（新函数集）
- `drawMapSim()`：背景天空→地形填充多边形(groundY 折线下方)→网格→我方●/敌方▲坦克(吸附 groundY)→风向箭头→三球弹道(裁剪到地形,动画时沿轨迹推进,撞地爆炸圈)→落点标记①②③→命中判定框(40×33)→距离/落差/SD 标尺
- 拖动：pointerdown/move 在画布上拖我方/敌方坦克，吸附地形，实时重算
- 动画：复用 `requestAnimationFrame` + progress(0..1) 模式（参照现有 playTricoAnimation L9069），撞地点触发爆炸
- 命中判定：每球到敌方 hitbox(40×33) 最近距离；3 球均 ≤阈值 且时刻相近 → `3in1 命中`

## 步骤 6 — 参考解（连接现有求解器）
- 按当前 我方/敌方/地形 自动算 `distance=|enemyX-myX|/40`、`elevation=(groundY(enemy)-groundY(my))/39.69`
- 调 `searchTrico3in1Physics(distance, sdParts=20, side, windAngle, windStrength, elevation)`（L4790）得 N1~N4 解，显示在提示条：`N1: 70°/2.1  N2: …` 供用户对照手动试射

## 步骤 7 — 图片导入真实地形
- 文件选择/拖放 → 离屏 canvas 绘制 → 按列扫描提取地面：可调`阈值滑条`+`取色`（亮度<阈=地 或 匹配地面色）→ 得 groundY 数组 → 缩放映射到地图宽度(默认1600px=40SD，可调)
- 实时预览：提取的折线叠加在图片上，调阈值至贴合 → 「确认」存为自定义地图 `GB_MAPS['__imported__']`

## 步骤 8 — 持久化 & 接线
- `localStorage['gunbound_realmap_state']` = `{map, myX, enemyX, side, windAngle, windStrength, angle, power}`，启动 restoreUIState (L10977) 内恢复
- 所有地图模拟输入 → 触发 `drawMapSim()`（即时，无需 debounce，前向计算很轻）
- 主题切换 (toggleTheme L11126) 时重绘地图画布

## 验证（完成审计清单）
- [ ] 备份文件存在且可独立打开
- [ ] APP_VERSION 两处同步为 v1.69
- [ ] 全部 10 张预设地图可选且地形正确渲染、坦克吸附地形
- [ ] Miratown：我方最左、敌方右某处，输入角度+力度后三球弹道可见且撞地落点合理
- [ ] 与求解器一致：把「参考解」的角度+力度填入试射框，涌现旋转≈整数 N 且 3in1 命中敌方
- [ ] 风向/风力改变后弹道偏移方向正确（左射镜像）
- [ ] 图片导入：拖入截图调阈值后地面轮廓贴合，弹道与新地形碰撞正确
- [ ] 明暗主题下画布配色正确
- [ ] 状态刷新页面后恢复
- [ ] 在浏览器打开 HTML 无 console 报错（用 Playwright 截图验证渲染）

## 风险/说明
- 预设地形为**特征性还原**（我按公开地图特征手绘控制点），非客户端逐像素；图片导入可获真实地形
- 前向物理与求解器共用同一套常数，形状一致；3 球用真实旋转模型（calcTricoThreeBalls），涌现圈数而非手选 spinN
- 地图宽度默认 1600px(40SD)；可在数据里调整 width
