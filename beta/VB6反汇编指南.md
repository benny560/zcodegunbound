# Trico 3in1 计算器 (VB6) 反汇编提取指南

## 文件清单
| 文件 | 大小 | 日期 | 内部版本 | 物理模型 |
|------|------|------|---------|---------|
| 2.1.6.exe | 1.63MB | 2007-10-02 | V2.1.6 | 旧版(无196/430, 含mass168/9.8) |
| 2.2.2.exe | 1.93MB | 2008-05-10 | V2.2.2 | **g=196(GME) + g=430(Excel)** 双模型 |
| 2.2.3.exe | 1.93MB | 2008-07-09 | V2.2.3 (内部020430) | **g=196(GME) + g=430(Excel)** 双模型 |

**重点反编译对象:2.2.3**(最新,且同时含两套物理模型,与现计算器结构对应)

## PE 结构 (以 2.2.3 为例)
- ImageBase: `0x400000`
- `.text` VA=`0x401000` rawPtr=`0x1000` size=`0x1d5000` (代码+内联常量)
- `.data` VA=`0x5d6000` rawPtr=`0x1d6000` size=`0x1000` (全局变量)
- `.rsrc` VA=`0x5d9000` rawPtr=`0x1d7000` (VB窗体资源: Form1~Form4)

## VB6 Native 编译特征
- **不是 p-code**,公式编译成 x86 机器码 (22854 个 x87 浮点指令)
- 浮点常量**内联在 .text 段**, 跟在 `FLD qword/FLD dword` 指令后
- 无法一键反编译回 VB 源码, 必须用 Ghidra/IDA 反汇编 + 人工分析

## VB 运行时函数锚点 (Ghidra 自动标注调用处)
公式相关运算(调用点 = 公式所在):
- `__vbaVarAdd` / `__vbaVarSub` / `__vbaVarMul` / `__vbaVarDiv` / `__vbaVarPow` (四则+幂)
- `__vbaR8Var` (Variant→Double, 公式入口)
- `__vbaStrCat` / `__vbaStrMove` / `__vbaStrToAnsi` (字符串拼接, 用于结果显示)

判断/循环:
- `__vbaVarCmpGe/Gt/Le/Lt` / `__vbaVarTstEq/Ge/Gt/Le/Lt` (比较)

**定位公式方法**:在 Ghidra 里找 `Command_Click` 事件处理函数 → 顺着 `__vbaVarMul/Div/Pow` 调用链 → 重建公式

## 已检测到的物理系数 (Single 4字节浮点, 在 .text 段)
| 系数 | 值 | 含义 | 命中次数(2.2.3) |
|------|-----|------|---------|
| g(GME) | 196 | 9.8×20, GME物理重力 | 3处 |
| g(Excel) | 430 | Excel物理重力(Trico用) | 2处 |
| 9.8 | 9.8 | 原始重力加速度 | 2处 |
| mass | 168 | 部分车质量 | 6处 |
| mass | 0.23 | Trico质量 | 2处 |
| PF | 0.00433 | power factor | 1处 |
| turtle_mass | 0.73 | Turtle质量 | (2.1.6有) |
| mass | 0.608 | Boomer等质量 | (2.1.6有) |

**结论**:2.2.3 同时实现了 GME(g=196) 和 Excel(g=430) 两套模型, 与现计算器 `TRICO.gravity=430` + 全局 `Gravity=196` 对应。

## 提取到的字符串线索
- `/1.4` — 除以1.4(疑似某缩放系数)
- `+0.5` / `-0.5` — 角度取整补偿或系数
- `f9.7` — 含9.7的字符串
- `MISS` — 命中判定
- 窗体: Form1~Form4, 控件 Command1~12/Label1~27/Option20~37/Text1~4/Image1~3

## Ghidra 反编译步骤

### 1. 导入
- File → Import File → 选 2.2.3.exe
- 格式: PE, 语言: x86:LE:32:default
- 导入后双击打开 CodeBrowser

### 2. 等待自动分析(Auto Analysis)
- Ghidra 会自动识别 PE、标注 msvbvm60 导入函数、识别函数边界

### 3. 定位公式(关键)
**方法A: 顺着 VB 函数锚点**
1. 在 Symbol Tree 找 `Imports → msvbvm60.dll`
2. 找 `__vbaVarPow` / `__vbaVarDiv` / `__vbaR8Var`, 双击看 References
3. 引用点所在的函数就是含公式的 VB 事件处理

**方法B: 顺着窗体控件**
1. VB6 事件函数命名: `Command1_Click` / `Text1_Change` 等(可能被 Ghidra 识别为 FUN_xxx)
2. 在 Strings 搜 "Trico" / "角度" / "MISS" 找 UI 文本, 反查引用到事件函数

**方法C: 顺着浮点常量**
1. Search → For Bytes, 搜已知系数的字节(如 430 的 double 表示)
2. 430.0 as IEEE754 double LE = `00 00 00 00 40 7E C0 40` ... 用工具确认
3. 反查引用, 周围就是用该系数的公式

### 4. 批量无头反编译(推荐)
```bash
# 用 analyzeHeadless 批量导出反编译C伪码
ghidra/support/analyzeHeadless.bat <projectDir> Proj1 \
  -import 2.2.3.exe \
  -postScript DecompileAllFunctions.java \
  -scriptPath <scriptDir>
```
导出后 grep `__vbaVarPow` / `vbaR8Var` 定位公式函数。

## 辅助脚本(已生成)
- `_vb6_map.js` — 提取PE结构+VB锚点+常量
- `_scan_consts.js` — 搜索已知物理系数

## 注意:核对时的物理模型对应
- 现计算器主版本用 **Excel物理(g=430, Trico专用)**
- 2.2.3 同时有 GME(g=196) 和 Excel(g=430)
- 核对 Trico 时, 找 2.2.3 里用 g=430 的分支
- 核对其他车(Boomer/Turtle等)时, 可能用 g=196 的 GME 分支
