# -*- coding: utf-8 -*-
# 完整方案 + 改进根选择: 无风T → 反推T(y方程验证根) → Given time → 核对
import openpyxl, json, sys, io, math, re, statistics as st
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PF = 0.004332712; G = 430; MASS = 0.23; ELEV_UNIT = 516/13
# 正确omega(分side) + N圈数范围
OMEGA = {'right': lambda V: 0.023623*V**0.764315, 'left': lambda V: 0.687878*V**0.299291}
TURNS_RANGE = {1:(0,1), 2:(1.1,1.9), 3:(2.1,2.9), 4:(3.1,3.9)}

# === 步骤1: 无风T拟合 ===
ph = openpyxl.load_workbook(r"C:\Users\fanli\Documents\zcodegunbound\识别数据.xlsx", data_only=True)["数据表"]
prows = list(ph.iter_rows(values_only=True))
pheader = prows[0]
pdist = [pheader[i] for i in range(1, len(pheader))]
TAG_MAP = {'R1':('right',1),'R2':('right',2),'R3':('right',3),'L2':('left',2),'L3':('left',3)}
nowind = {}
for r in prows[1:]:
    tag = r[0]
    if tag not in TAG_MAP: continue
    side, n = TAG_MAP[tag]
    pts = []
    for i, cell in enumerate(r[1:]):
        if cell is None: continue
        m = re.match(r'^\s*([0-9.]+)\s+([0-9.]+)\s*$', str(cell).strip())
        if m:
            angle, power = float(m.group(1)), float(m.group(2))
            if power <= 0: continue
            V = power/PF; sinA = math.sin(angle*math.pi/180)
            if sinA <= 0: continue
            T = 2*V*sinA/G
            pts.append((pdist[i], T))
    if len(pts) >= 3:
        N=len(pts); sx=sum(p[0] for p in pts); sy=sum(p[1] for p in pts)
        sxy=sum(p[0]*p[1] for p in pts); sxx=sum(p[0]**2 for p in pts)
        b=(N*sxy-sx*sy)/(N*sxx-sx*sx); a=(sy-b*sx)/N
        nowind[f"{side}:{n}"] = (a, b)

# === 步骤2-4: 反推T(改进根选择) + Given time ===
real = json.load(open(r"C:\Users\fanli\Documents\zcodegunbound\_real.json", encoding="utf-8"))
def eff_angle(wa, side): return ((180-wa)%360+360)%360 if side=='left' else wa
def side_str(s): return 'right' if s=='右' else 'left'

ang_errs=[]; pow_errs=[]; detail=[]
for idx, r in enumerate(real):
    if r['distance'] < 0: continue
    side = side_str(r['side']); n = r['n']; key = f"{side}:{n}"
    if key not in nowind: continue
    sd = abs(r['distance'])
    if sd > 40: continue
    a_coef, b_coef = nowind[key]
    T_nowind = a_coef + b_coef*sd
    # 风参数(Excel公式)
    wa = eff_angle(r['windAngle'], side); ws = r['windStrength']
    cosW = math.cos(wa*math.pi/180); sinW = math.sin(wa*math.pi/180)
    force = ws if abs(cosW+1)<0.001 else max(0, ws-1)
    force = 0 if ws==0 else force
    xA = cosW*force/MASS; effGrav = G - sinW*force/MASS
    if effGrav <= 0: continue
    # 实测angle/power
    angle_real = r['angle']; power_real = r['power']
    V_real = power_real/PF
    angle_rad = angle_real*math.pi/180
    vx = V_real*math.cos(angle_rad); vy = V_real*math.sin(angle_rad)
    elev = (r['elevation'] or 0) * ELEV_UNIT  # 落差(像素)
    elev_excel = elev/100  # excel单位落差... 实际用像素
    xDist = sd*40  # 像素
    # x方程: 0.5*xA*T^2 + vx*T - xDist = 0
    roots = []
    if abs(xA) > 1e-9:
        disc = vx*vx + 2*xA*xDist
        if disc >= 0:
            sq = math.sqrt(disc)
            for t in [(-vx+sq)/xA, (-vx-sq)/xA]:
                if t > 0.01: roots.append(t)
    elif vx > 0:
        roots.append(xDist/vx)
    if not roots: continue
    # 改进根选择: y方程 + 圈数范围双重判据
    best_root = None; best_score = 1e9
    lo_turn, hi_turn = TURNS_RANGE[n]
    for T in roots:
        # y落点(像素): 中心弹落点应=目标落差elev
        yLand = vy*T - 0.5*effGrav*T*T
        yErr = abs(yLand - elev)
        # 圈数(用实测V和该T): 检查是否落在N范围
        V_for_turns = power_real/PF
        turns = OMEGA[side](V_for_turns)*T/(2*math.pi)
        turn_penalty = 0
        if turns < lo_turn: turn_penalty = (lo_turn - turns)*100
        elif turns > hi_turn: turn_penalty = (turns - hi_turn)*100
        # 综合分: y误差为主, 圈数越界惩罚, 接近无风T为辅
        score = yErr + turn_penalty + abs(T - T_nowind)*30
        if score < best_score:
            best_score = score; best_root = T
    if best_root is None: continue
    T_wind = best_root
    # Given time求angle/power
    denom = xDist - 0.5*xA*T_wind*T_wind
    if denom <= 0: continue
    tanA = (elev + 0.5*effGrav*T_wind*T_wind)/denom
    raw_angle = math.degrees(math.atan(tanA))
    if raw_angle < 1 or raw_angle > 89: continue
    cos_a = math.cos(raw_angle*math.pi/180)
    V = denom/(cos_a*T_wind)
    power = V*PF
    da = raw_angle - angle_real; dp = power - power_real
    ang_errs.append(abs(da)); pow_errs.append(abs(dp))
    detail.append((idx+1, n, r['windAngle'], sd, angle_real, raw_angle, da, power_real, power, dp, T_nowind, T_wind))

print("="*95)
print("完整方案(改进根选择: y方程+无风T接近度): 无风T → 反推T → Given time")
print("="*95)
print(f"角度: 均{st.mean(ang_errs):.2f}° 中位{st.median(ang_errs):.2f}° 最大{max(ang_errs):.1f}° 命中(±1°){sum(1 for d in ang_errs if d<=1)}/{len(ang_errs)}")
print(f"力度: 均{st.mean(pow_errs):.3f} 最大{max(pow_errs):.3f}")
print(f"\n对比: 旧根选择(最接近无风T)=3.01°; 纯物理圈数=4.05°; rederived=0°")
print()
print("偏差>2°:")
bad=[d for d in detail if abs(d[6])>2]
for i,n,wa,sd,ra,ca,da,rp,cp,dp,tn,tw in sorted(bad,key=lambda x:-abs(x[6]))[:15]:
    print(f"  #{i} N{n} 风{wa:>3} sd{sd:>5} | 实测{ra:>3.0f}/{rp:.2f} 算{ca:>5.1f}/{cp:.2f} 角差{da:+5.1f} | T无{tn:.2f}→风{tw:.2f}")
print(f"  共{len(bad)}/{len(detail)}条偏差>2°")
print()
print("按N:")
for n in [1,2,3]:
    sub=[d for d in detail if d[1]==n]
    if sub:
        ds=[abs(d[6]) for d in sub]
        print(f"  N{n}: {len(sub)}条 均{st.mean(ds):.2f}° 命中{sum(1 for x in ds if x<=1)}/{len(sub)}")

# 分档: 排除偏差>5°的问题条目
good=[d for d in detail if abs(d[6])<=5]
gs=[abs(d[6]) for d in good]
print(f"\n排除偏差>5°后({len(good)}/{len(detail)}条):")
print(f"  角度: 均{st.mean(gs):.2f}° 中位{st.median(gs):.2f}° 命中(±1°){sum(1 for x in gs if x<=1)}/{len(gs)}")
ps=[abs(d[9]) for d in good]
print(f"  力度: 均{st.mean(ps):.3f}")
print(f"\n  问题条目(>5°): {[(d[0],f'N{d[1]}',f'风{d[2]}',f'{d[6]:+.1f}°') for d in detail if abs(d[6])>5]}")
