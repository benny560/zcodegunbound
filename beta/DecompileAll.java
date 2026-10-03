// Ghidra 无头脚本: 导出所有函数的反编译C伪码到文件
// 用法: analyzeHeadless <projDir> Proj1 -import xxx.exe -postScript DecompileAll.java
//@category Analysis
import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionIterator;
import java.io.PrintWriter;
import java.io.File;

public class DecompileAll extends GhidraScript {
    @Override
    public void run() throws Exception {
        DecompInterface decomp = new DecompInterface();
        decomp.openProgram(currentProgram);

        String progName = currentProgram.getName().replaceAll("[^a-zA-Z0-9._-]", "_");
        File outFile = new File("C:/Users/fanli/Documents/zcodegunbound/beta", "decompiled_" + progName + ".c");
        PrintWriter pw = new PrintWriter(outFile, "UTF-8");
        println("导出反编译结果到: " + outFile.getAbsolutePath());

        FunctionIterator funcs = currentProgram.getFunctionManager().getFunctions(true);
        int count = 0;
        while (funcs.hasNext() && !monitor.isCancelled()) {
            Function func = funcs.next();
            DecompileResults res = decomp.decompileFunction(func, 30, monitor);
            if (res != null && res.getDecompiledFunction() != null) {
                pw.println("// ============================================");
                pw.println("// 函数: " + func.getName() + " @ " + func.getEntryPoint());
                pw.println("// ============================================");
                pw.println(res.getDecompiledFunction().getC());
                count++;
                if (count % 50 == 0) println("已反编译 " + count + " 个函数...");
            }
        }
        pw.close();
        decomp.dispose();
        println("完成! 共反编译 " + count + " 个函数 → " + outFile.getAbsolutePath());
    }
}
