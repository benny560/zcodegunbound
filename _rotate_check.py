# -*- coding: utf-8 -*-
import sys, io, math
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 截图观测（视频时间秒, 三弹连线朝向角度, 来源文件）
# 注: angleModifier=-1 (右射顺时针). "连线朝向"指 side1-side2 这条直径的方向
observed = [
    ("launch_t3.4",   3.4, "竖直90°"),
    ("split_t4.4",    4.4, "竖直90°"),
    ("horizontal_t4.8", 4.8, "水平0°"),
    ("vertical_t5.4", 5.4, "斜45°"),
    ("vertical_t13",  13.0, "竖直90°"),
]

# 模型参数 (源码 calcTricoThreeBallsNewPhysics / scoreEmpiricalPhaseCandidate)
OMEGA_R = 0.5571   # 右射旋转角速度 rad/s
angleModifier = -1  # 右射

print("="*78)
print("模型旋转方程: rot(t) = omega * t * angleModifier")
print(f"  omega_R = {OMEGA_R} rad/s, angleModifier = {angleModifier} (右射顺时针)")
print("  三弹连线方向 = rot 的角度 (因为 side1=+R·cos(rot), side2=−R·cos(rot))")
print("="*78)
print(f"{'时刻':<14} {'rot(rad)':>10} {'rot(°)':>9} {'mod360°':>9} {'连线理论朝向':<16} {'截图观测'}")
print("-"*78)

# 关键问题: 视频时间和模型飞行时间T的关系未知。案例1的模型T=9.07s
# 但视频有25s，发射在t≈3s, 命中在t≈7s(第一发)。所以视频里飞行≈4s
# 先假设 视频时间 ≈ 模型时间，看旋转序列是否自洽
for name, t, obs in observed:
    rot = OMEGA_R * t * angleModifier
    rot_deg = math.degrees(rot)
    mod = rot_deg % 360
    # 连线方向: 当 rot=0 时 side1在 (cx+R, cy), side2在(cx-R,cy) => 水平连线(0°)
    #          当 rot=90° 时 side1在 (cx, cy+R), side2在(cx,cy-R) => 竖直连线(90°)
    # 所以连线朝向角度 = |rot| mod 180 (因为直径180°对称)
    line_angle = abs(rot_deg) % 180
    print(f"{name:<14} {rot:>10.3f} {rot_deg:>9.1f} {mod:>9.1f} {line_angle:>6.1f}°{'':<9} {obs}")

print()
print("="*78)
print("关键验证: 旋转序列是否自洽")
print("="*78)
# launch(3.4)→horizontal(4.8): 从竖直变水平, 旋转了90°
dt = 4.8 - 3.4
drot = OMEGA_R * dt * 180 / math.pi
print(f"3.4s→4.8s (Δt={dt}s): 模型旋转 {drot:.1f}°  | 观测: 竖直90°→水平0° (旋转~90°)")
print(f"  => {'吻合' if abs(drot-90)<20 else '不吻合'}")
# split(4.4)→horizontal(4.8): 0.4s
dt = 4.8 - 4.4
drot = OMEGA_R * dt * 180 / math.pi
print(f"4.4s→4.8s (Δt={dt}s): 模型旋转 {drot:.1f}°  | 观测: 竖直→水平 (旋转~90°)")
print(f"  => 0.4秒旋转90°需要 omega={90/0.4*math.pi/180:.3f} rad/s, 模型omega={OMEGA_R}")

print()
print("="*78)
print("重要: 模型旋转一圈所需时间")
print("="*78)
T_full_turn = 2*math.pi/OMEGA_R
print(f"旋转完整一圈 = 360° 需要 {T_full_turn:.2f}s")
print(f"旋转90°(竖直↔水平) 需要 {T_full_turn/4:.2f}s")
print(f"  => 截图显示 4.4→4.8 (0.4s) 完成竖直→水平, 与模型 {T_full_turn/4:.2f}s 差异大")
print(f"  => 说明视频时间刻度≠模型时间刻度, 或这发不是右射N3")
