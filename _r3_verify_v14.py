# -*- coding: utf-8 -*-
# 从 优化识别数据_v14_含公式说明.xlsx 提取 R3 段, 与 _ident_table.json 对比
import zipfile, re, json

path = r'c:\Users\fanli\Documents\zcodegunbound\优化识别数据_v14_含公式说明.xlsx'
z = zipfile.ZipFile(path)
names = z.namelist()
sheets = [n for n in names if n.startswith('xl/worksheets/sheet')]
shared = []
try:
    sx = z.read('xl/sharedStrings.xml').decode('utf-8')
    shared = re.findall(r'<si>(.*?)</si>', sx, re.S)
    shared = [re.sub(r'<.*?>', '', s) for s in shared]
except KeyError:
    pass

# workbook sheet 名
wb = z.read('xl/workbook.xml').decode('utf-8')
print('sheets:', re.findall(r'<sheet name="(.*?)"', wb))

for sh in sheets:
    xml = z.read(sh).decode('utf-8')
    rows = re.findall(r'<row[^>]*r="(\d+)"[^>]*>(.*?)</row>', xml, re.S)
    grid = {}
    for rn, body in rows:
        cells = re.findall(r'<c r="([A-Z]+)(\d+)"(?:[^>]*t="(\w+)")?[^>]*>(?:<v>(.*?)</v>)?', body)
        for col, _, t, v in cells:
            if v == '':
                continue
            val = shared[int(v)] if t == 's' else v
            grid[(int(rn), col)] = val
    if not grid:
        continue
    maxr = max(r for r, _ in grid)
    print('==', sh, 'rows:', maxr)
    for r in range(1, min(maxr, 6) + 1):
        line = [(c, grid[(r, c)]) for c in sorted({cc for (_, cc) in grid}, key=lambda x: (len(x), x)) if (r, c) in grid]
        print(r, line[:14])
