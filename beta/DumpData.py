# 导出VB6字符串常量和双精度常量 (Jython, 无需编译)
#@category Analysis
import java.io

def run():
    progName = currentProgram.getName().replace(".", "_")
    outFile = java.io.File("C:/Users/fanli/Documents/zcodegunbound/beta", "data_" + progName + ".txt")
    pw = java.io.PrintWriter(outFile, "UTF-8")
    mem = currentProgram.getMemory()
    
    pw.println("=== 2.2.3.exe 数据常量导出 ===")
    pw.println()
    
    # 1. 扫描.data段和.rsrc段, 找VB6字符串(UTF-16LE, 以\0\0结尾)
    pw.println("=== UTF-16字符串常量 ===")
    strCnt = 0
    for blockName in [".data", ".rsrc", ".text"]:
        block = mem.getBlock(blockName)
        if block is None: continue
        start = block.getStart()
        size = block.getSize()
        i = 0
        while i + 4 < size:
            try:
                a = start.add(i)
                # VB6 BSTR: 读字符串直到\0\0
                sb = []
                j = 0
                valid = True
                while j < 80:
                    lo = mem.getByte(a.add(j)) & 0xff
                    hi = mem.getByte(a.add(j+1)) & 0xff
                    if lo == 0 and hi == 0: break
                    c = lo | (hi << 8)
                    if (c >= 0x20 and c < 0x7f) or (c >= 0x4e00 and c <= 0x9fff):
                        sb.append(chr(c))
                    else:
                        valid = False
                        break
                    j += 2
                if valid and len(sb) >= 3:
                    s = "".join(sb)
                    if any(ch.isalnum() or ord(ch) > 0x4e00 for ch in s):
                        pw.println("STR[" + blockName + "] @ " + str(a) + " = " + s)
                        strCnt += 1
                        i += j + 2
                        continue
            except: pass
            i += 2
    pw.println("# 共 " + str(strCnt) + " 个字符串")
    pw.println()
    
    # 2. 扫描.data段双精度常量
    pw.println("=== .data段双精度常量 ===")
    dblCnt = 0
    block = mem.getBlock(".data")
    if block:
        start = block.getStart()
        size = block.getSize()
        for i in range(0, size - 8, 8):
            try:
                a = start.add(i)
                d = mem.getDouble(a)
                from java.lang import Double
                if Double.isFinite(d) and abs(d) > 0.0001 and abs(d) < 1e6:
                    pw.println("DBL @ " + str(a) + " = " + str(d))
                    dblCnt += 1
            except: pass
    pw.println("# 共 " + str(dblCnt) + " 个双精度常量")
    pw.close()
    print("完成! 字符串" + str(strCnt) + "个, 双精度" + str(dblCnt) + "个")

run()
