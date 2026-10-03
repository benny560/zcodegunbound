import math
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# ============ 物理模型（修正距离换算：sd×0.4）============
G = 0.608; M = 85.0; MC = 0.005
IPS = 0.4   # internal-distance per sd
def mass(w): return M - MC*w*w
def wind_terms(wd, w):
    if w == 0: return 0.0, G
    m = mass(w); return math.cos(math.radians(wd))*w/m, G - math.sin(math.radians(wd))*w/m
def range_sd(A, Vo, wd, w):
    wax, gEff = wind_terms(wd, w)
    if gEff <= 0: return float('inf')
    Ar = math.radians(A); T = 2*Vo*math.sin(Ar)/gEff
    return (Vo*math.cos(Ar)*T + 0.5*wax*T*T)/IPS
def power_for_angle(A, sd, wd, w):
    wax, gEff = wind_terms(wd, w)
    if gEff <= 0: return None
    c = math.cos(math.radians(A)); s = math.sin(math.radians(A))
    internal = sd*IPS
    denom = (2*c*s)/gEff + (2*wax*s*s)/(gEff*gEff)
    if denom <= 0: return None
    return math.sqrt(internal/denom)
def solve_all_angles(A_base, Vo, sd, wd, w):
    if w == 0: return [float(A_base)]
    target = sd; sols = []
    def f(A): return range_sd(A, Vo, wd, w) - target
    step = 0.1; a = 1.0; prev = f(a)
    while a < 90.0:
        a2 = min(a + step, 90.0); cur = f(a2)
        if prev == 0: sols.append(a)
        elif prev * cur < 0:
            lo, hi = a, a2
            for _ in range(60):
                mid=(lo+hi)/2
                if f(lo)*f(mid) <= 0: hi=mid
                else: lo=mid
            sols.append((lo+hi)/2)
        prev = cur; a = a2
    if f(90.0) == 0: sols.append(90.0)
    return sols
def crossover_wind(A_base, wd, Vo):
    if range_sd(90.0,Vo,wd,30.0) <= D0: return None
    lo,hi=0.0,30.0
    for _ in range(60):
        mid=(lo+hi)/2
        if range_sd(90.0,Vo,wd,mid) > D0: hi=mid
        else: lo=mid
    return (lo+hi)/2

BASE_ANGLES=[81,70,50]; D0=20
P0={A:power_for_angle(A,D0,0,0) for A in BASE_ANGLES}
CROSS={A:{} for A in BASE_ANGLES}
for A in BASE_ANGLES:
    for wd in range(0,361):
        CROSS[A][wd]=crossover_wind(A,wd,P0[A])

WIND_STRENGTHS=list(range(1,27))
DIRS_R=list(range(0,91,5)); DIRS_L=list(range(270,361,5))

def raise_angle(A_base, wd, w):
    if w==0: return float(A_base)
    sols = solve_all_angles(A_base, P0[A_base], D0, wd, w)
    hi = [s for s in sols if s >= A_base - 1e-9]
    return (min(hi, key=lambda x:x-A_base)) if hi else None
def total_red(A_base, wd, w):
    wc = CROSS[A_base][wd]
    if wc is None or w < wc: return None
    p90 = power_for_angle(90.0, D0, wd, w)
    if p90 is None: return None
    return P0[A_base] - p90
def power_coeff(A_base, wd, w):
    wc = CROSS[A_base][wd]
    if wc is None or w < wc: return None
    red = total_red(A_base, wd, w)
    if red is None: return None
    return red / (w - wc)

def cell_combined(A_base, wd, w):
    """合并单元格：未饱和='系数 / 当前角度'；饱和='力度系数 / -减的力'；无解='--'"""
    ra = raise_angle(A_base, wd, w)
    if ra is not None:
        coeff = (ra - A_base)/w          # 角度系数
        return f"{coeff:.3f} / {ra:.1f}", None
    # 抬角饱和 → 力度
    pc = power_coeff(A_base, wd, w)
    red = total_red(A_base, wd, w)
    if pc is not None and red is not None:
        return f"{pc:.3f} / -{red:.3f}", "sat"
    return "--", "nosol"

# ============ 样式 ============
wb = openpyxl.Workbook(); wb.remove(wb.active)
HEAD_FILL = PatternFill("solid", fgColor="305496"); HEAD_FONT = Font(bold=True, color="FFFFFF", size=10)
TITLE_FONT= Font(bold=True, size=12, color="1F4E78")
SAT_FILL  = PatternFill("solid", fgColor="FFE699"); NOSOL_FILL= PatternFill("solid", fgColor="F2F2F2")
CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
THIN = Side(style="thin", color="BFBFBF"); BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
def style_header(ws, row, ncol):
    for c in range(1, ncol+1):
        cell = ws.cell(row=row, column=c); cell.fill=HEAD_FILL; cell.font=HEAD_FONT
        cell.alignment=CENTER; cell.border=BORDER

# ============ 说明 ============
ws = wb.create_sheet("说明")
ws["A1"] = "Boomer 开炮表 v4（boomer revolution Excel 物理：g=0.608, 质量85−0.005·w², 力度=Vo）"
ws["A1"].font = TITLE_FONT
notes = [
    "",
    "★ 距离口径：20sd = 800px。Excel内部距离 = sd×0.4。",
    "罗盘：0°=正右 90°=正上 180°=正左 270°=正下；Boomer 朝右打。",
    "顺风(弹打远)=风向 0~90° & 270~360°；风力范围 1~26。",
    "",
    f"无风打20sd的力度：81°→{P0[81]:.3f}   70°→{P0[70]:.3f}   50°→{P0[50]:.3f}",
    "",
    "Sheet 结构：说明 + 表1(无风力 度) + 每个基础角2张合并矩阵(上/下) = 9张",
    "",
    "合并矩阵单元格格式（一个单元格里两段，斜杠分隔）：",
    "  · 角度未到90：'角度系数 / 当前角度'   例 '0.8 / 85'  → 用85度、力度不变",
    "  · 角度到90(饱和)：'力度系数 / -减的力'  例 '0.17 / -0.43' → 90度、力度=无风值-0.43",
    "  · 无解：'--'",
    "  '上'=风向0~90°, '下'=风向270~360°。黄=饱和转力度; 灰=无解。",
]
for i, t in enumerate(notes, start=2):
    ws.cell(row=i, column=1, value=t)
ws.column_dimensions["A"].width = 92

# ============ 表1 ============
ws = wb.create_sheet("表1_无风力 度")
ws["A1"] = "表1  无风力 度（800px=20sd，elev=0，无风）"; ws["A1"].font = TITLE_FONT
for c, h in enumerate(["距离(sd)","81°","70°","50°"], 1):
    ws.cell(row=3, column=c, value=h)
style_header(ws, 3, 4)
for i, d in enumerate(range(1,31)):
    r=4+i
    ws.cell(row=r, column=1, value=d)
    ws.cell(row=r, column=2, value=round(power_for_angle(81,d,0,0),3))
    ws.cell(row=r, column=3, value=round(power_for_angle(70,d,0,0),3))
    ws.cell(row=r, column=4, value=round(power_for_angle(50,d,0,0),3))
    for c in range(1,5):
        ws.cell(row=r,column=c).alignment=CENTER; ws.cell(row=r,column=c).border=BORDER
for c in range(1,5):
    ws.cell(row=23,column=c).fill=PatternFill("solid",fgColor="DDEBF7")
    ws.cell(row=23,column=c).font=Font(bold=True)
ws.column_dimensions["A"].width=10
for col in ["B","C","D"]: ws.column_dimensions[col].width=10

# ============ 合并矩阵 ============
def write_matrix(sheet_name, title, base_angle, dirs, tag):
    ws = wb.create_sheet(sheet_name)
    ws["A1"] = title; ws["A1"].font = TITLE_FONT
    ws.cell(row=3, column=1, value=f"风力\\风向({tag})")
    for ci, wd in enumerate(dirs, start=2):
        ws.cell(row=3, column=ci, value=wd)
    style_header(ws, 3, len(dirs)+1)
    for ri, w in enumerate(WIND_STRENGTHS):
        r=4+ri
        ws.cell(row=r, column=1, value=w); ws.cell(row=r,column=1).font=Font(bold=True)
        ws.cell(row=r,column=1).alignment=CENTER; ws.cell(row=r,column=1).border=BORDER
        for ci, wd in enumerate(dirs, start=2):
            cell=ws.cell(row=r, column=ci); cell.alignment=CENTER; cell.border=BORDER
            txt, flag = cell_combined(base_angle, wd, w)
            cell.value = txt
            if flag=="sat": cell.fill=SAT_FILL
            elif flag=="nosol": cell.fill=NOSOL_FILL
    ws.column_dimensions["A"].width=14
    for ci in range(2, len(dirs)+2):
        ws.column_dimensions[get_column_letter(ci)].width=13
    ws.freeze_panes="B4"

for A in BASE_ANGLES:
    write_matrix(f"矩阵_{A}°_上",
                 f"基础角 {A}°, 力度 {P0[A]:.3f}（风向 0~90°，格式：系数/角度 或 系数/-减力）",
                 A, DIRS_R, "0~90°")
    write_matrix(f"矩阵_{A}°_下",
                 f"基础角 {A}°, 力度 {P0[A]:.3f}（风向 270~360°，格式：系数/角度 或 系数/-减力）",
                 A, DIRS_L, "270~360°")

wb.save("Boomer开炮表v4.xlsx")
print("saved Boomer开炮表v4.xlsx")
print("无风力 度:", {A:round(P0[A],3) for A in BASE_ANGLES})
print("sheets:", wb.sheetnames)
