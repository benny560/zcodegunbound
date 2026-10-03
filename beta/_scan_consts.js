// 在VB6 exe里搜索已知物理系数 + 提取所有可疑双精度常量
const fs = require("fs");
const path = require("path");

// 已知系数(来自我们计算器的RULES.md)
const KNOWN = {
    "重力G=430": 430,
    "质量mass=0.23": 0.23,
    "PF=0.004332712": 0.004332712,
    "ELEVATION_PIXELS=516/13≈39.69": 516 / 13,
    "DISTANCE_PIXELS=40": 40,
    "MAX_POWER=5": 5,
};

function bytesToDouble(buf, off) {
    // 检查8字节是否"像"一个有意义的double
    if (off + 8 > buf.length) return null;
    const view = new DataView(buf.buffer, buf.byteOffset + off, 8);
    const val = view.getFloat64(0, true);
    if (!Number.isFinite(val)) return null;
    return val;
}

for (const f of ["2.1.6.exe", "2.2.2.exe", "2.2.3.exe"]) {
    const buf = fs.readFileSync(path.join(__dirname, f));
    console.log("\n" + "=".repeat(60) + "\n" + f + "\n" + "=".repeat(60));

    // 1. 搜索已知系数(在.data和.text全段, 按8字节对齐和不对齐都试)
    console.log("\n--- 已知系数命中检测 ---");
    for (const [name, target] of Object.entries(KNOWN)) {
        const hits = [];
        for (let i = 0; i + 8 <= buf.length; i++) {
            const v = bytesToDouble(buf, i);
            if (v !== null && Math.abs(v - target) < Math.abs(target) * 1e-6 + 1e-12) {
                hits.push(i);
                if (hits.length >= 3) break;
            }
        }
        console.log("  " + name + " (" + target + "): " + (hits.length ? hits.map(h => "0x" + h.toString(16)).join(", ") : "未找到"));
    }

    // 2. 收集所有"像物理系数"的double (范围0.0001~10000, 非整数尾巴不太长)
    console.log("\n--- 可疑双精度常量(0.0001~10000, 按值排序) ---");
    const cand = new Map();
    for (let i = 0; i + 8 <= buf.length; i += 1) {
        const v = bytesToDouble(buf, i);
        if (v === null) continue;
        if (Math.abs(v) < 0.0001 || Math.abs(v) > 10000) continue;
        // 排除纯整数(1,2,3...)和明显的指针值
        if (Number.isInteger(v) && Math.abs(v) < 1000) continue;
        const k = v.toFixed(8);
        if (!cand.has(k)) cand.set(k, []);
        if (cand.get(k).length < 2) cand.get(k).push(i);
    }
    // 只显示出现>=2次的(常量通常被引用多次, 或是查表数据)
    const repeated = [...cand.entries()].filter(([k, arr]) => arr.length >= 1)
        .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
    console.log("共" + cand.size + "个候选, 显示前40个(按值排序):");
    repeated.slice(0, 40).forEach(([k, arr]) => {
        console.log("  " + k.padStart(14) + "  @ " + arr.map(a => "0x" + a.toString(16)).join(","));
    });
}
