# -*- coding: utf-8 -*-
# 提取 gunbound_calculator.html 的纯计算 JS，拼成 Node 测试脚本
import io, json
src = open(r"C:\Users\fanli\Documents\zcodegunbound\gunbound_calculator.html", encoding="utf-8").read()
lines = src.splitlines(keepends=True)

def cut(a, b):  # 1-indexed inclusive
    return "".join(lines[a-1:b])

# 需要的片段（行号已确认）：
#  1472-1503 : 距离/落差/力度常量
#  1540-1872 : TRICO + TRICO_NEW
#  1879-4150 : EXCEL_TRICO + searchTrico3in1Physics
#  4153-4204 : calcTricoThreeBallsNewPhysics (用于 minHitDist 诊断，可选)
js_consts   = cut(1472, 1473) + "\n" + "        const MAX_DISPLAY_POWER = 5;\n"
js_trico    = cut(1540, 1872)
js_excel    = cut(1879, 4150)
js_three    = cut(4153, 4204)

real = json.load(open(r"C:\Users\fanli\Documents\zcodegunbound\_real.json", encoding="utf-8"))

#风向换算：右射原样，左射 180-angle
def eff_angle(windAngle, side):
    if side == 'left':
        return ((180 - windAngle) % 360 + 360) % 360
    return windAngle

# 构造 JS 测试驱动
cases_js = json.dumps([
    {
        "i": idx+1,
        "distance": r["distance"],
        "elevInput": (r["elevation"] if r["elevation"] is not None else 0),
        "windAngle": r["windAngle"],
        "windStrength": r["windStrength"],
        "side": "right" if r["side"] == "右" else "left",
        "n": r["n"],
        "realAngle": r["angle"],
        "realPower": r["power"],
        "effWindAngle": eff_angle(r["windAngle"], "right" if r["side"] == "右" else "left"),
    }
    for idx, r in enumerate(real)
], ensure_ascii=False)

wrapper = r"""
// ====== 自动提取的计算器核心（屏蔽 DOM） ======
const document = new Proxy({}, { get:()=>({ value:0, textContent:'' }), set:()=>true });
const window = {};
const localStorage = { getItem:()=>null, setItem:()=>{} };
const navigator = {};
const screen = {};
const wakeLock = { request:()=>Promise.resolve() };
function alert(){}
""" + js_consts + "\n" + js_trico + "\n" + js_excel + "\nconst calcTricoThreeBallsNewPhysics = " + js_three.split("function calcTricoThreeBallsNewPhysics".split("calcTricoThreeBallsNewPhysics")[0][-0:] if False else "",1)[-1] if False else ""

# calcTricoThreeBallsNewPhysics 是 function 声明，直接整段保留
wrapper = r"""
// ====== 自动提取的计算器核心（屏蔽 DOM） ======
const document = new Proxy({}, { get:()=>({ value:0, textContent:'' }), set:()=>true });
const window = {};
const localStorage = { getItem:()=>null, setItem:()=>{} };
const navigator = {};
""" + js_consts + "\n" + js_trico + "\n" + js_excel + "\n" + js_three + r"""

// ====== 测试驱动 ======
const CASES = """ + cases_js + r""";
const ELEVATION_PIXELS_PER_UNIT_REF = ELEVATION_PIXELS_PER_UNIT;

const out = [];
for (const c of CASES) {
    // UI 输入距离/落差：sdParts 默认 20，无距离误差
    const sdParts = 20;
    const elevationInternal = c.elevInput * ELEVATION_PIXELS_PER_UNIT;
    // 计算器对每个 N 单独输出；这里只核对实测标注的那个 N
    // 但同时记录所有 N(1..4) 的可用解，用于多解分析
    const allSolutions = [];
    for (let spinN = 1; spinN <= 4; spinN++) {
        let res = null, err = null;
        try {
            res = EXCEL_TRICO.calcWithWind(sdParts, c.side, spinN, c.distance, elevationInternal, c.effWindAngle, c.windStrength);
        } catch(e) { err = String(e && e.message ? e.message : e); }
        if (res) {
            allSolutions.push({
                n: spinN,
                angle: res.angle,
                power: res.power,
                time: res.time,
                source: res.source || '',
                minHitDist: res.minHitDist == null ? null : +res.minHitDist,
                angleRaw: res.angleRaw,
                powerRaw: res.powerRaw,
            });
        } else {
            allSolutions.push({ n: spinN, angle: null, power: null, err });
        }
    }
    // 找实测 N 对应的解
    const target = allSolutions.find(s => s.n === c.n);
    out.push({
        i: c.i,
        d: c.distance, elev: c.elevInput, wa: c.windAngle, ws: c.windStrength,
        side: c.side, n: c.n,
        realAngle: c.realAngle, realPower: c.realPower,
        target, all: allSolutions,
    });
}
console.log(JSON.stringify(out));
"""

open(r"C:\Users\fanli\Documents\zcodegunbound\_calc_node.js", "w", encoding="utf-8").write(wrapper)
print("wrote _calc_node.js bytes:", len(wrapper))
print("cases:", len(real))
