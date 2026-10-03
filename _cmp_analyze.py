# -*- coding: utf-8 -*-
import json, sys, io, statistics as st
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
rows = json.load(open(r"C:\Users\fanli\Documents\zcodegunbound\_cmp.json", encoding="utf-8"))

def parse(v):
    try: a,p = v.split('/'); return float(a), float(p)
    except: return None,None

print("="*100)
print("核心问题：54条全中，是基础公式算对的，还是补偿项兜底的？")
print("="*100)
print(f"{'#':>2} {'dist':>6}{'e':>5}{'风角':>5}{'风力':>5}{'向':>3}{'N':>2} | {'实测':>12} | {'纯Excel':>12} {'Δ角':>5} | {'rederived':>12} {'Δ角':>5} {'补偿time':>8}{'补偿g':>7}")
print("-"*100)

dA_excel=[]; dA_re=[]; biases=[]; both_zero=[]; comp_driven=[]
for r in rows:
    ra,rp = parse(r['real'])
    A=r['A']; B=r['B']
    # 纯Excel
    ea=ep=dEA=None
    if A and 'angle' in A:
        ea,ep=A['angle'],A['power']; dEA=abs(ea-ra)
    # rederived
    ba=bp=dEB=None; tb=gb=None
    if B and 'angle' in B:
        ba,bp=B['angle'],B['power']; dEB=abs(ba-ra)
        tb=B.get('timeBias'); gb=B.get('gBias')
    mark=''
    if dEA is not None and dEA<=1 and dEB is not None and dEB<=1:
        both_zero.append(r['i'])
    # 判断是否"补偿驱动": 补偿量大
    comp_mag=0
    if tb is not None: comp_mag=abs(tb)
    if comp_mag>0.1: comp_driven.append(r['i'])
    if dEA is not None: dA_excel.append(dEA)
    if dEB is not None: dA_re.append(dEB)
    if tb is not None: biases.append(abs(tb))

    ea_s=f"{ea:>5.0f}/{ep:>5.2f}" if ea is not None else "    无解"
    ba_s=f"{ba:>5.0f}/{bp:>5.2f}" if ba is not None else "    无解"
    dEA_s=f"{dEA:>5.1f}" if dEA is not None else "   -"
    dEB_s=f"{dEB:>5.1f}" if dEB is not None else "   -"
    tb_s=f"{tb:>+8.3f}" if tb is not None else "      -"
    gb_s=f"{gb:>+7.3f}" if gb is not None else "     -"
    print(f"{r['i']:>2} {r['d']:>6}{r['e']:>5}{r['wa']:>5}{r['ws']:>5}{r['side'][:1]:>3}{r['n']:>2} | {ra:>5.0f}/{rp:>5.2f} | {ea_s} {dEA_s} | {ba_s} {dEB_s} {tb_s}{gb_s}")

print("="*100)
print("统计结论：")
print(f"  纯Excel公式(g=0.835+查表T, 无风无补偿) 角度平均偏差: {st.mean(dA_excel):.2f}°  中位数 {st.median(dA_excel):.2f}°  最大 {max(dA_excel):.1f}°")
print(f"  rederived主路(带补偿) 角度平均偏差: {st.mean(dA_re):.2f}°  中位数 {st.median(dA_re):.2f}°  最大 {max(dA_re):.1f}°")
print(f"  补偿项 |timeBias| 平均: {st.mean(biases):.3f}  最大: {max(biases):.3f}")
print()
print(f"  纯Excel与rederived都命中(±1°)的: {len(both_zero)} 条 -> {both_zero}")
print(f"  这些是【基础公式本身就对的】, 补偿没起决定作用")
print()
print(f"  补偿驱动(timeBias>0.1)的: {len(comp_driven)} 条 -> {comp_driven}")
print(f"  这些是【靠补偿才对上的】, 基础公式本身算不对")
