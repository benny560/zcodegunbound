# -*- coding: utf-8 -*-
import openpyxl, sys, io, json, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"C:\Users\fanli\Documents\zcodegunbound\识别数据.xlsx"
wb = openpyxl.load_workbook(p, data_only=True)
ws = wb["数据表"]
rows = list(ws.iter_rows(values_only=True))

# 第一行是列标（距离桶 1..40），第一列是行标 R1/R2/R3/L2/L3
header = rows[0]   # ('行\\列', 1, 2, 3, ...)
dist_buckets = [header[i] for i in range(1, len(header))]

table = {}
for r in rows[1:]:
    tag = r[0]
    if not tag: continue
    entries = []
    for cell in r[1:]:
        if cell is None:
            entries.append(None); continue
        s = str(cell).strip()
        m = re.match(r'^\s*([0-9.]+)\s+([0-9.]+)\s*$', s)
        if m:
            entries.append({"angle": float(m.group(1)), "power": float(m.group(2))})
        else:
            entries.append({"raw": s})  # 可能是单纯数值如 '3.75'
    table[tag] = entries

# 打印每行
for tag, es in table.items():
    print("="*60)
    print("TAG:", tag, "count:", len(es))
    shown = 0
    for i, e in enumerate(es):
        if e is None: continue
        dist = dist_buckets[i]
        print(f"  dist={dist:>3}  {e}")
        shown += 1
    print("  non-null:", shown)

json.dump({"dist_buckets": dist_buckets, "table": table},
          open(r"C:\Users\fanli\Documents\zcodegunbound\_phase.json","w",encoding="utf-8"),
          ensure_ascii=False, indent=1, default=str)
print("\nsaved _phase.json")
