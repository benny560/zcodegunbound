# -*- coding: utf-8 -*-
# 核验 识别数据.xlsx 中 R3(左打右N3) 段与 _ident_table.json 是否一致
import zipfile, re, json

path = r'c:\Users\fanli\Documents\zcodegunbound\识别数据.xlsx'
z = zipfile.ZipFile(path)
shared = []
try:
    sx = z.read('xl/sharedStrings.xml').decode('utf-8')
    shared = re.findall(r'<si>(?:<t[^>]*>)?(.*?)(?:</t>)?</si>', sx, re.S)
    shared = [re.sub(r'<.*?>', '', s) for s in shared]
except KeyError:
    pass
sheet = z.read('xl/worksheets/sheet1.xml').decode('utf-8')
rows = re.findall(r'<row[^>]*r="(\d+)"[^>]*>(.*?)</row>', sheet, re.S)
grid = {}
for rn, body in rows:
    cells = re.findall(r'<c r="([A-Z]+)\d+"(?:[^>]*t="(\w+)")?[^>]*>(?:<v>(.*?)</v>)?', body)
    for col, t, v in cells:
        if v == '':
            continue
        val = shared[int(v)] if t == 's' else v
        grid[(int(rn), col)] = val

# 打印前几行全部内容, 观察布局
cols = sorted({c for (_, c) in grid}, key=lambda x: (len(x), x))
for r in range(1, 8):
    line = []
    for c in cols:
        if (r, c) in grid:
            line.append(f'{c}={grid[(r,c)]}')
    print(r, line)
print('...')
print('total rows:', max(r for (r, _) in grid))
