# -*- coding: utf-8 -*-
import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

out = json.load(open(r"C:\Users\fanli\Documents\zcodegunbound\_result.json", encoding="utf-8"))

# 角度容差: Trico 整数角，±1° 内算命中（含5舍6入边界）
# 力度容差: 力度本身是连续量但有测量误差，±0.15 算命中
ANGLE_TOL = 1.0
POWER_TOL = 0.15

rows = []
hit_a = hit_p = hit_both = 0
miss_list = []
multi_sol_summary = []

for c in out:
    t = c["target"]
    ra, rp = c["realAngle"], c["realPower"]
    if t and t.get("angle") is not None:
        ca, cp = t["angle"], t["power"]
        dA = abs(ca - ra)
        dP = abs(cp - rp)
        ok_a = dA <= ANGLE_TOL
        ok_p = dP <= POWER_TOL
        ok = ok_a and ok_p
        if ok_a: hit_a += 1
        if ok_p: hit_p += 1
        if ok: hit_both += 1
        else: miss_list.append((c, ca, cp, dA, dP))
    else:
        ok = False
        ca = cp = dA = dP = None
        miss_list.append((c, None, None, None, None))

    # 多解：所有 N 中有几个可用解
    valid = [s for s in c["all"] if s.get("angle") is not None]
    multi_sol_summary.append((c["i"], len(valid), c["n"]))
    rows.append((c["i"], c["d"], c["elev"], c["wa"], c["ws"], c["side"], c["n"],
                 ra, rp, ca, cp, round(dA,3) if dA is not None else None,
                 round(dP,3) if dP is not None else None, ok))

N = len(out)
print("="*95)
print(f"核对统计（角度容差±{ANGLE_TOL}°，力度容差±{POWER_TOL}）  样本数 N={N}")
print(f"  角度命中 : {hit_a}/{N} = {hit_a/N*100:.1f}%")
print(f"  力度命中 : {hit_p}/{N} = {hit_p/N*100:.1f}%")
print(f"  双项命中 : {hit_both}/{N} = {hit_both/N*100:.1f}%")
print("="*95)
hdr = f"{'#':>2} {'dist':>6} {'elev':>5} {'风角':>4} {'风力':>4} {'向':>2} {'N':>2} | {'实测角':>5} {'实测力':>6} | {'算角':>5} {'算力':>6} | {'Δ角':>5} {'Δ力':>6} | {'判定':>4}"
print(hdr)
print("-"*95)
for r in rows:
    i,d,e,wa,ws,sd,n,ra,rp,ca,cp,dA,dP,ok = r
    flag = "OK" if ok else ("ERR" if ca is not None else "NULL")
    ca_s = f"{ca:>5.0f}" if ca is not None else "   -"
    cp_s = f"{cp:>6.3f}" if cp is not None else "     -"
    dA_s = f"{dA:>5.2f}" if dA is not None else "   -"
    dP_s = f"{dP:>6.3f}" if dP is not None else "     -"
    mark = "" if ok else "  <== 偏差"
    print(f"{i:>2} {d:>6} {e:>5} {wa:>4} {ws:>4} {sd:>2} {n:>2} | {ra:>5.0f} {rp:>6.3f} | {ca_s} {cp_s} | {dA_s} {dP_s} | {flag:>4}{mark}")

# 多解分析
print("="*95)
print("多解分析（同一输入下计算器能给出几个可用 N 解）")
print("-"*95)
print(f"{'#':>2} {'可用解数':>6} {'实测N':>5}  其它可用解")
for i, nvalid, realn in multi_sol_summary:
    others = [s["n"] for s in out[i-1]["all"] if s.get("angle") is not None]
    note = ""
    if nvalid >= 2:
        note = "  ".join(f"N{s}@{next(x['angle'] for x in out[i-1]['all'] if x['n']==s):.0f}/{next(x['power'] for x in out[i-1]['all'] if x['n']==s):.2f}" for s in others)
    print(f"{i:>2} {nvalid:>6} {realn:>5}   {note}")
