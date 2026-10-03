# -*- coding: utf-8 -*-
import json, sys, io, statistics as st
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
rows = json.load(open(r"C:\Users\fanli\Documents\zcodegunbound\_root.json", encoding="utf-8"))

def dev(key):
    ds=[abs(r['real']-r[key]) for r in rows if r[key] is not None]
    return ds

print("="*90)
print("根因验证：换 g 能降多少偏差？(纯抛物线+查表T，零补偿)")
print("="*90)
print(f"{'方案':<28} {'平均偏差':>8} {'中位数':>8} {'最大':>8} {'命中(±1°)':>10}")
print("-"*90)
for key,label in [('g835','固定 g=0.835 (现状)'),
                  ('gLocal','g=localGPhase'),
                  ('gFormula','g=formulaGPhase(多项式)'),
                  ('gLocalTblT','g=localG + 表T=targetTime')]:
    ds=dev(key); hit=sum(1 for d in ds if d<=1)
    print(f"{label:<28} {st.mean(ds):>8.2f}° {st.median(ds):>8.2f}° {max(ds):>8.1f}° {hit:>6}/{len(ds)}")

print("="*90)
print("按N看 localG vs 固定g 的偏差改善:")
print(f"{'N':>3} {'固定g均偏':>10} {'localG均偏':>11} {'改善':>8}")
for n in sorted(set(r['n'] for r in rows)):
    sub=[r for r in rows if r['n']==n]
    d835=[abs(r['real']-r['g835']) for r in sub if r['g835'] is not None]
    dloc=[abs(r['real']-r['gLocal']) for r in sub if r['gLocal'] is not None]
    if d835 and dloc:
        print(f"{n:>3} {st.mean(d835):>10.2f}° {st.mean(dloc):>11.2f}° {st.mean(d835)-st.mean(dloc):>+8.2f}°")
