# Excel练枪软件

这是一个基于 `Excel + VBA` 的文字练枪小游戏。人形目标用单元格字符渲染，用户通过点击单元格来命中指定部位。

## 目录说明

- [dist/Excel练枪软件-模板.xlsm](/Users/work1/Documents/ontion/excel练枪软件/dist/Excel练枪软件-模板.xlsm)：工作簿模板
- [vba](/Users/work1/Documents/ontion/excel练枪软件/vba)：VBA 源码与工作表事件代码
- [docs/01-需求与规划/2026-06-01-Excel练枪软件-设计方案-v1.0.md](/Users/work1/Documents/ontion/excel练枪软件/docs/01-需求与规划/2026-06-01-Excel练枪软件-设计方案-v1.0.md)：设计文档
- [build_workbook.py](/Users/work1/Documents/ontion/excel练枪软件/build_workbook.py)：生成工作簿模板的脚本

## 导入步骤

1. 打开 [dist/Excel练枪软件-模板.xlsm](/Users/work1/Documents/ontion/excel练枪软件/dist/Excel练枪软件-模板.xlsm)。
2. 按 `Alt + F11` 打开 VBA 编辑器。
3. 在菜单中选择 `文件 -> 导入文件`，依次导入以下模块：
   - [modGlobals.bas](/Users/work1/Documents/ontion/excel练枪软件/vba/modGlobals.bas)
   - [modConfig.bas](/Users/work1/Documents/ontion/excel练枪软件/vba/modConfig.bas)
   - [modTemplates.bas](/Users/work1/Documents/ontion/excel练枪软件/vba/modTemplates.bas)
   - [modRenderer.bas](/Users/work1/Documents/ontion/excel练枪软件/vba/modRenderer.bas)
   - [modJudge.bas](/Users/work1/Documents/ontion/excel练枪软件/vba/modJudge.bas)
   - [modGame.bas](/Users/work1/Documents/ontion/excel练枪软件/vba/modGame.bas)
   - [modBootstrap.bas](/Users/work1/Documents/ontion/excel练枪软件/vba/modBootstrap.bas)
4. 在项目树中双击 `ThisWorkbook`，把 [ThisWorkbook_Code.txt](/Users/work1/Documents/ontion/excel练枪软件/vba/ThisWorkbook_Code.txt) 里的内容粘贴进去。
5. 双击工作表对象 `开始页`，把 [开始页_Code.txt](/Users/work1/Documents/ontion/excel练枪软件/vba/开始页_Code.txt) 内容粘贴进去。
6. 双击工作表对象 `游戏页`，把 [游戏页_Code.txt](/Users/work1/Documents/ontion/excel练枪软件/vba/游戏页_Code.txt) 内容粘贴进去。
7. 双击工作表对象 `结算页`，把 [结算页_Code.txt](/Users/work1/Documents/ontion/excel练枪软件/vba/结算页_Code.txt) 内容粘贴进去。
8. 保存工作簿，关闭后重新打开，并选择 `启用宏`。

## 使用方式

1. 打开后进入 `开始页`。
2. 双击开始按钮区域 `E13:K15`。
3. 在 `游戏页` 根据顶部提示的部位点击靶区。
4. 时间结束后自动进入 `结算页`。
5. 双击 `结算页` 按钮区域 `E19:K21` 可以再来一局。

## 默认规则

- 单局时长：`30 秒`
- 命中指定部位：`+10`
- 命中人物但部位错误：`-2`
- 点击空白区域：`-1`
- 每 `5` 连击奖励：`+5`

以上参数都可以在 `配置页` 中直接修改。

## 已知限制

- 当前环境下我生成了带工作表结构的 `.xlsm` 模板，但没有在本机 Excel 中自动注入 VBA，因为当前运行环境没有可直接驱动的 Excel 应用。
- 你需要按上面的步骤手动导入一次 VBA。导入完成后，这个文件就是完整可玩的版本。
- 计时依赖 `Application.OnTime`，建议使用桌面版 Microsoft Excel。
