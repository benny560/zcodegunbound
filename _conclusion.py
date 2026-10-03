# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("""
=================================================================
铁证：基础公式本身算不对，是补偿项在兜底
=================================================================

【三种算法对比 54 条实测】

1) 纯Excel基础公式 (g=0.835 + 查表T + 中心弹落点=目标)
   角度平均偏差: 6.63°   中位数 4.50°   最大 29.0°
   → 只有 4 条(#21,#26,#30,#47)勉强在±1°内，占 7.4%

2) rederived主路 (基础公式 + 75个回归补偿系数)
   角度平均偏差: 0.00°   最大 0.0°
   → 54条全中

3) 补偿项 timeBias 的量级:
   平均 1.643 秒    最大 5.500 秒
   39/54 条靠补偿驱动(timeBias>0.1)
=================================================================

基础公式的系统性偏差规律 (纯Excel vs 实测):
""")

# 从上表归纳偏差方向
import json
rows = json.load(open(r"C:\Users\fanli\Documents\zcodegunbound\_cmp.json", encoding="utf-8"))
real = json.load(open(r"C:\Users\fanli\Documents\zcodegunbound\_real.json", encoding="utf-8"))
ws_map = {i+1: real[i]["windStrength"] for i in range(len(real))}
def parse(v):
    try: a,p=v.split('/');return float(a),float(p)
    except:return None,None
# 按N分组看偏差方向
by_n={}
for r in rows:
    ra,rp=parse(r['real']); A=r['A']
    if A and 'angle' in A:
        d=ra-A['angle']
        by_n.setdefault(r['n'],[]).append((r['i'],d,abs(ws_map.get(r['i'],0))>0.5))
for n in sorted(by_n):
    arr=by_n[n]
    windless=[d for _,d,w in arr if not w]
    windy=[d for _,d,w in arr if w]
    print(f"  N{n}: {len(arr)}条")
    if windless: print(f"     无风: 偏差 {[round(x,1) for x in windless]}")
    if windy:
        import statistics
        print(f"     有风: 偏差范围 [{min(windy):.1f}, {max(windy):.1f}]  平均 {statistics.mean(windy):.2f}  (正=实测比公式高)")
