# -*- coding: utf-8 -*-
import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
out = json.load(open(r"C:\Users\fanli\Documents\zcodegunbound\_result.json", encoding="utf-8"))

print("="*70)
print("多解深度分析：同一(距离/落差/风/方向)下各 N 解的关系")
print("说明：实测标注的 N 只是其中1个命中方式，其余 N 同样可命中")
print("="*70)

# 统计：每条数据有几个可用解，实测N在其中占比
from collections import Counter
cnt = Counter()
n_dist = Counter()  # 实测N分布
for c in out:
    valid = [s for s in c["all"] if s.get("angle") is not None]
    cnt[len(valid)] += 1
    n_dist[c["n"]] += 1
print("\n【可用解数分布】")
for k in sorted(cnt): print(f"  {k}个可用解: {cnt[k]} 条")
print(f"\n【实测N分布】 {dict(sorted(n_dist.items()))}")

# 挑几条典型多解案例详细展示
print("\n" + "="*70)
print("典型多解案例（同一场景多种圈数打法）")
print("="*70)
for pick in [5, 29, 35, 45, 1, 24]:
    c = out[pick-1]
    valid = [s for s in c["all"] if s.get("angle") is not None]
    print(f"\n案例#{pick}  dist={c['d']} elev={c['elev']} 风角={c['wa']} 风力={c['ws']} {c['side']}向  实测={c['realAngle']}°/{c['realPower']} (N{c['n']})")
    print(f"  计算器给出 {len(valid)} 种打法:")
    for s in sorted(valid, key=lambda x:x['n']):
        tag = "  <== 实测采用" if s['n']==c['n'] else ""
        print(f"    N{s['n']}: {s['angle']:.0f}° / {s['power']:.2f}力  (time={s.get('time')}, src={s.get('source','')[:14]}){tag}")

# 验证多解都落在有效域(1-89°, 0<power<=5)
print("\n" + "="*70)
print("有效域校验：所有出现的多解是否都在合理范围")
print("="*70)
total_sol = 0
bad = 0
for c in out:
    for s in c["all"]:
        if s.get("angle") is None: continue
        total_sol += 1
        if not (1 <= s["angle"] <= 89) or not (0 < s["power"] <= 5):
            bad += 1
            print(f"  越界: #{c['i']} N{s['n']} {s['angle']}/{s['power']}")
print(f"  总解数 {total_sol}，越界 {bad} 个 -> {'全部有效' if bad==0 else '存在问题'}")
