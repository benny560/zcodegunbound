# Gunbound 弹道计算器

独立的 Gunbound 弹道计算与研究项目，主要程序为 `gunbound_calculator.html`。项目包含 Trico、Boomer 等车辆的计算逻辑、地图模拟、Excel 参考数据、验证脚本和模型研究资料。

## 使用

下载或克隆仓库后，用浏览器打开 [gunbound_calculator.html](gunbound_calculator.html) 即可使用计算器；地图模拟入口为 [map_simulator.html](map_simulator.html)。主程序为 HTML、CSS 和 JavaScript，不需要安装构建工具。

部分辅助研究和验证脚本需要各自的运行环境，可能引用本机路径；它们不是打开计算器的必要依赖。

## 项目资料

- [PROJECT_GUIDE.md](PROJECT_GUIDE.md)：项目结构、功能和研究历史。
- [RULES.md](RULES.md)：模型修改、单位和验证约定。
- [CURRENT_SHOOTING_MODEL.md](CURRENT_SHOOTING_MODEL.md)：射击模型说明。
- [TRICO_PHASE_FORMULAS.md](TRICO_PHASE_FORMULAS.md)：Trico 相位公式。
- [TRICO_PHYSICS_FINDINGS.md](TRICO_PHYSICS_FINDINGS.md)：物理模型研究结论。
- `gunboundexcel/`：参考 Excel 工作簿。
- `beta/`：旧计算器参考程序、公式分析和研究脚本。
- `output picture video/`：弹道研究的图片资料。

仓库保留历史 HTML 快照、研究数据及验证脚本。API 密钥、私人配置、浏览器会话和本机工具缓存由 `.gitignore` 排除，不上传到仓库。
