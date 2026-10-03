# 读 实测数据v1.xlsx -> _excel_real.json, 并与 _real_v1.json 核对差异
import openpyxl, json
wb = openpyxl.load_workbook('实测数据v1.xlsx', data_only=True)
ws = wb.active
rows = []
for r in ws.iter_rows(min_row=2, values_only=True):
    # 列: A B C None, D=dist E=elev F=wa G=ws H=angle I=power J=side K=n
    dist, elev, wa, ws_, ang, pw, side, n = r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10]
    if dist is None or n is None:
        continue
    rows.append({"distance": dist, "elevation": elev, "windAngle": wa, "windStrength": ws_,
                 "angle": ang, "power": pw, "side": side, "n": n})
with open('_excel_real.json', 'w', encoding='utf-8') as f:
    json.dump(rows, f, ensure_ascii=False)

# 统计
from collections import Counter
print("Excel 数据行数:", len(rows))
sides = Counter(x["side"] for x in rows)
print("方向分布:", dict(sides))
byN = Counter((x["side"], x["n"]) for x in rows)
for k in sorted(byN, key=lambda t: (str(t[0]), t[1])):
    print(f"  {k[0]} N{k[1]}: {byN[k]}")

# 与 _real_v1.json 核对
try:
    j = json.load(open('_real_v1.json', encoding='utf-8'))
    print("\n_real_v1.json 行数:", len(j))
    # 逐条按(dist,wa,ws,n,side)匹配
    def key(x): return (round(x["distance"],2), x["windAngle"], x["windStrength"], x["n"], x["side"])
    ek = set(key(x) for x in rows)
    jk = set(key(x) for x in j)
    only_json = [x for x in j if key(x) not in ek]
    only_excel = [x for x in rows if key(x) not in jk]
    print("仅在json(不在excel):", len(only_json))
    for x in only_json[:12]:
        print("   ", x["distance"], x["windAngle"], x["windStrength"], x["side"], "N"+str(x["n"]), "->", x["angle"],"/",x["power"])
    print("仅在excel(不在json):", len(only_excel))
    for x in only_excel[:12]:
        print("   ", x["distance"], x["windAngle"], x["windStrength"], x["side"], "N"+str(x["n"]))
except Exception as e:
    print("对比json失败:", e)
