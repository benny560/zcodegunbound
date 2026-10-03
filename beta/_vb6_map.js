// VB6 Trico计算器 反汇编地图生成器
// 提取PE结构、VB事件函数锚点、浮点常量、字符串,供Ghidra反汇编对照
const fs = require("fs");
const path = require("path");

const files = process.argv.slice(2).length ? process.argv.slice(2)
    : ["2.1.6.exe", "2.2.2.exe", "2.2.3.exe"];

function rvaToOff(rva, secs) {
    for (const s of secs) {
        if (rva >= s.rva && rva < s.rva + s.rawsize) return s.rawptr + (rva - s.rva);
    }
    return -1;
}

function extractASCII(buf, minLen) {
    const out = []; let cur = "", start = 0;
    for (let i = 0; i < buf.length; i++) {
        const b = buf[i];
        if (b >= 32 && b < 127) { if (!cur.length) start = i; cur += String.fromCharCode(b); }
        else { if (cur.length >= minLen) out.push({ off: start, s: cur }); cur = ""; }
    }
    return out;
}

// 提取VB6 Unicode字符串(VB6的字符串常量是"长度前缀+UTF-16")
// VB6字符串对象结构: [指针][长度][UTF-16数据...], 但直接扫UTF-16也能发现
function extractUTF16(buf, minLen) {
    const out = []; let cur = "", start = 0;
    for (let i = 0; i + 1 < buf.length; i += 2) {
        const lo = buf[i], hi = buf[i + 1];
        // ASCII区 或 CJK区
        if ((hi === 0 && lo >= 0x20 && lo < 0x7f) || (hi >= 0x4e && hi <= 0x9f) ||
            (hi >= 0x30 && hi <= 0x39 && lo === 0)) { // 数字/字母
            if (!cur.length) start = i;
            cur += String.fromCharCode(lo | (hi << 8));
        } else {
            // 只保留含可读内容的(至少1个字母/数字, 且非纯符号)
            if (cur.length >= minLen && /[a-z0-9\u4e00-\u9fff]/i.test(cur)) {
                out.push({ off: start, s: cur });
            }
            cur = "";
        }
    }
    return out;
}

// 提取双精度浮点常量(VB6 Double, 8字节IEEE754)
// 这些常量紧跟在 FLD qword ptr [xxx] 指令后, 或集中在.data段
function extractDoubles(buf, secs) {
    const doubles = [];
    const dataSec = secs.find(s => s.name === ".data");
    if (!dataSec) return doubles;
    const start = dataSec.rawptr;
    const end = start + dataSec.rawsize;
    for (let i = start; i + 8 <= end; i += 8) {
        // 读取8字节为Double
        const buf8 = buf.slice(i, i + 8);
        const view = new DataView(buf8.buffer, buf8.byteOffset, 8);
        const val = view.getFloat64(0, true); // little-endian
        if (Number.isFinite(val) && Math.abs(val) > 0.0001 && Math.abs(val) < 1e8) {
            // 排除整数0和可疑值, 保留"像物理系数"的
            doubles.push({ off: i, val });
        }
    }
    return doubles;
}

for (const f of files) {
    const fp = path.join(__dirname, f);
    if (!fs.existsSync(fp)) { console.log("跳过(不存在): " + f); continue; }
    const buf = fs.readFileSync(fp);
    const peOff = buf.readUInt32LE(0x3c);
    const numSec = buf.readUInt16LE(peOff + 6);
    const optHdrSize = buf.readUInt16LE(peOff + 20);
    const imageBase = buf.readUInt32LE(peOff + 24 + 28);
    const secStart = peOff + 24 + optHdrSize;
    const secs = [];
    for (let i = 0; i < numSec; i++) {
        const off = secStart + i * 40;
        let nm = ""; for (let j = 0; j < 8; j++) { const c = buf[off + j]; if (c) nm += String.fromCharCode(c); }
        secs.push({
            name: nm.trim(),
            vsize: buf.readUInt32LE(off + 8),
            rva: buf.readUInt32LE(off + 12),
            rawsize: buf.readUInt32LE(off + 16),
            rawptr: buf.readUInt32LE(off + 20),
            va: imageBase + buf.readUInt32LE(off + 12)
        });
    }

    console.log("\n" + "=".repeat(70));
    console.log("文件: " + f + "  (" + buf.length + " bytes)");
    console.log("ImageBase: 0x" + imageBase.toString(16));
    console.log("段表:");
    secs.forEach(s => console.log("  " + s.name.padEnd(8) + " VA=0x" + s.va.toString(16).padStart(8, "0") +
        " size=0x" + s.rawsize.toString(16).padEnd(8, "0") + " rawPtr=0x" + s.rawptr.toString(16)));

    // ASCII字符串里的VB函数锚点
    const aStrs = extractASCII(buf, 4);
    const vbFuncs = [...new Set(aStrs.filter(x => /^(__vba|rtc)[A-Z]/.test(x.s)).map(x => x.s))].sort();
    console.log("\nVB运行时函数锚点(" + vbFuncs.length + "个, Ghidra会自动标注调用处):");
    console.log("  " + vbFuncs.join(", "));

    // 数学相关: 这些函数的调用点就是公式所在
    const mathAnchors = ["__vbaVarAdd", "__vbaVarSub", "__vbaVarMul", "__vbaVarDiv", "__vbaVarPow",
        "__vbaR8Var", "rtcSin", "rtcCos", "rtcTan", "rtcAtn", "rtcSqr", "rtcAbs", "rtcInt", "rtcFix"];
    const found = mathAnchors.filter(a => vbFuncs.includes(a));
    console.log("\n★ 公式相关运算函数(调用点=公式位置): " + (found.length ? found.join(", ") : "(VB6 native用x87指令,无rtc调用)"));

    // .data段双精度常量(物理系数)
    const doubles = extractDoubles(buf, secs);
    const uniqDoubles = [];
    const seen = new Set();
    doubles.forEach(d => {
        const k = d.val.toFixed(6);
        if (!seen.has(k)) { seen.add(k); uniqDoubles.push(d); }
    });
    console.log("\n★ .data段双精度常量(" + uniqDoubles.length + "个, 疑似物理系数/查表数据):");
    uniqDoubles.slice(0, 50).forEach(d => console.log("  @0x" + d.off.toString(16).padStart(6, "0") + " = " + d.val));

    // 找含"角度/力度/风/距离"语义的UTF16字符串(VB6中文常量)
    const uStrs = extractUTF16(buf, 3);
    const semStrs = uStrs.filter(x => /角度|力度|风|距离|落差|圈|旋转|命中|车|坦|炮|spin|angle|power|wind|dist|grav|mass|trico/i.test(x.s))
        .filter(x => x.s.length < 40);
    if (semStrs.length) {
        console.log("\n★ 语义字符串(VB6中文/英文常量, 可能是Label Caption/提示):");
        [...new Set(semStrs.map(x => x.s))].slice(0, 30).forEach(s => console.log("  " + JSON.stringify(s)));
    }
}
