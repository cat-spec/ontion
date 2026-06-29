# 近期基于 Agent 的开发流程演进与心得总结

# 基于 Agent 的开发流程演进与心得总结

> 本文记录团队在 Flutter monorepo\([flutter\-app](https://file+.vscode-resource.vscode-cdn.net/Volumes/external/Project/flutter-app/)\) 中,围绕 Coding Agent\(Claude Code / Codex 等\)逐步搭建工程化开发流程的演进过程,以及对下一阶段\(类 Symphony 化、自动化测试、UI 还原\)的研究与规划。
> 
> 

---

## 前言 概述

### 0\.1 做了什么

把"用 Agent 写代码"从**一次性的对话式协作**,逐步改造成**有约束、可追溯、可复用的工程化流水线**。整个过程经历了三个版本的迭代:

### 0\.2 解决了什么问题

每个版本都是为了补上前一个版本暴露的痛点:

### 0\.3 当前位置与下一步

- **已落地**:V1 → V2 → V3,具备了代码隔离、环境隔离、流程合规三大能力

- **正在调研**:类 Symphony 的**任务编排与异步批处理**\(把"人手动触发"变成"机器人自动拉取需求 → 实现 → 提交"\)、[Patrol](https://patrol.leancode.co/) **自动化测试**、以及 **UI 设计稿还原度**问题

- **核心目标**:逐步探索与实现Agent自动化



## 一、最早版本:草稿 \+ 计划的人工驱动流水线

最初的工作流非常朴素 —— 把 Agent 当作"听话的实习生",由人写草稿,Agent 负责落地,人在每一环节做审查。

旧演讲稿可以在下发链接：

[近期 AI 辅助 Coding 使用心得汇报（基于Claude Code）](https://vyejighahd.feishu.cn/wiki/IPrDwAsexi4XsfkujkIcwEysnXe?from=from_copylink)

### 1\.1 流程

1. **写草稿文档**:由人产出需求或方案的初稿\(markdown\)

2. **生成计划**:Agent 基于草稿产出实施计划

3. **审查计划**:人评审计划,确认方向无误

4. **生成代码**:Agent 根据计划写代码

5. **审查代码**:人 review 代码改动

6. **生成测试用例**:Agent 根据代码补测试用例

7. **审查测试用例**:人评审测试用例覆盖度与正确性

8. **执行测试 / 生成测试报告**:Agent 跑测试并产出报告

9. **审查测试报告**:人评估测试结果

10. **基于测试报告修复代码**:Agent 根据报告中暴露的问题继续修代码,回到第 4 步循环

**实施案例（在Agent终端输入）**:

```Bash
*# 步骤一:读草稿文档,给出设计思路和实施计划*
读 .claude/feature/feature-1/draft.md 给出设计思路和实施计划,文档输出到 plan.md

*# 步骤二:按照计划实现*
按照 plan.md 逐步实现需求，每完成一个步骤都必须更新plan.md

# 步骤三：/code-review
```

### 1\.2 收获

- **草稿与计划文档化**,可追溯、可审查、可复用

- 每一步都有"人类卡点",出了问题随时能回退到上一节点

- 但**重度依赖人工**,Agent 的产出几乎全靠 prompt 即兴发挥,没有任何流程约束

### 1\.2 不足

- 没有标准化的产物结构,跨任务无法横向对比

- Agent 容易在第 4、6、10 步"自由发挥",写出与计划脱节的代码

- 流程都在一次 chat 上下文里跑,长任务很快把上下文撑爆

---

## 二、第二版本: 集成 OpenSpec

为了把"草稿 → 计划 → 实施 → 归档"这一套规范化,引入 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 作为 spec\-driven 工作流框架。

### 2\.1 什么是 Spec?

在软件工程中,**Spec\(Specification,规格说明\)是对系统某个能力、组件或模块的结构化描述**,回答三个核心问题:

1. **是什么**\(What\):这个能力的边界、输入输出、约束条件

2. **为什么**\(Why\):为什么需要这个能力,解决什么问题

3. **怎么用**\(How\):使用方式、示例、与其他模块的关系

Spec 与传统需求文档的区别:

**Spec\-driven 的核心价值**:让"文档即真相",避免口头需求、代码实现、产品预期三者割裂。

### 2\.2 OpenSpec 介绍

OpenSpec 是一个 **spec\-driven** 的 AI 协作框架,核心思路是把"需求 → 规格 → 任务 → 实施 → 归档"做成强结构化的目录树和 markdown 文件,让人和 Agent 共用同一份"事实源"。

仓库的 [openspec/](https://file+.vscode-resource.vscode-cdn.net/Volumes/external/Project/flutter-app/openspec/) 目录由它管理,关键产物:

### 2\.3 OpenSpec 的安装与使用

本仓库通过 `build_script` 统一管理工具链\(详见第三版本\),OpenSpec 也一并接入:

```Bash
*# 一次性导出 Flutter / JDK / Gradle / Android SDK / Node.js / OpenSpec 等环境变量*
source .envrc

*# 验证*
openspec --version
```

底层等价于 `npm i -g @fission-ai/openspec`,但 npm prefix 被定向到 `.build_tools/npm-prefix/`,与系统 npm 解耦。

常用命令:

```Bash
openspec list                  *# 列出所有 change / spec*
openspec status                *# 查看当前仓库 spec 与 change 的对照*
openspec show <change-id>      *# 展开某个变更*
openspec instructions          *# 当前流程下一步该做什么*
openspec archive <change-id>   *# 把已完成的变更合并回 specs/*
```

**实施案例**:

```Bash
*# 步骤一:给出具体计划*
/openspec-propose feat 123 其他收款资料上传完之后需要支持手动删除，在每种收款方式标题最右侧添加清空按钮，点击清空后清除此收款方式已经输入的信息

*# 步骤二:根据计划实现方案*
/openspec-apply-change feat-123

*# 步骤三:归档*
/openspec-archive-change bug-6335

*# 步骤四:人工review，如果发现问题通过对话框重复执行 /openspec-apply-change 或者 /openspec-archive-change 修改策划或者需求文案以及代码#*

*# 步骤五:提交代码,自动生成提交信息*
/worktree-commit bug-6335
```

### 2\.4 OpenSpec 优势

- **结构化**:proposal / tasks / design / spec 各司其职,Agent 不用再猜"该写什么文件"

- **声明式校验**:OpenSpec 自带 lint,缺字段、缺章节会直接报错,Agent 写错有反馈

- **可归档可追溯**:每次变更都沉淀为一份 change 包,合并后归并入 specs,历史完整可查

- **人机共用同一格式**:人能直接读,Agent 也能直接生成,不需要中间翻译层

### 2\.5 OpenSpec 使用场景

- **新增能力 / 重构**:需要先规划再动手的中大型改动

- **跨团队协作**:用 spec 替代口头需求,降低理解偏差

- **沉淀团队知识**:把临时性的需求文档转成长期可维护的 capability spec

- **作为 Agent 的"任务单"**:把 tasks\.md 当 checklist,让 Agent 顺序执行

### 2\.6 OpenSpec 不足

1. **没有并行开发能力**:同一时刻只能解决一个 change,无法并发

2. **没有代码隔离能力**:仍在当前分支上原地修改,改坏了影响整个工作目录

3. **没有开发环境隔离能力**:依赖本地已有的 SDK / 工具链,环境差异会导致复现困难

4. **缺少"强制入口"**:OpenSpec 自身不阻止 Agent 在错误的分支或目录下执行命令

### **2\.7 为什么是OpenSpec而不是其它？**

附录C 中调研了5种类似的框架 [五大 AI 编码 Agent 工作流框架详细对比](https://vyejighahd.feishu.cn/wiki/Olk8wESXIiZBgFk4fQgctVBQnAc)，发现OpenSpec是最轻量化的，也最符合存量项目的接入，SuperPowers支持 代码隔离，但不支持环境隔离，且 有TDD的理念，目前对我们的项目改动性会很大，AI Agent是否需要TDD，还需要时间验证

---

## 三、第三版本:基于 OpenSpec 做的工程化改造

针对第二版本的三大不足,本版本围绕**代码隔离**、**环境隔离**、**强制入口**做了系统性改造,核心放在两个轴上:**Worktree** 和 **build\_script**。

### 3\.1 基于 Worktree 做代码隔离

通过自定义一系列 OpenSpec 相关 skill,把 Worktree 作为所有 OpenSpec 操作的强制载体。涉及的 skill 见 [\.agents/skills/](https://file+.vscode-resource.vscode-cdn.net/Volumes/external/Project/flutter-app/.agents/skills/):

1. **`openspec-guard`**** skill**:OpenSpec 变更工作流的**强制入口与守门员**。

    - 从 `dev` 分支创建 `feat/<id>` 或 `fix/<id>` 命名的 git worktree

    - 所有 OpenSpec 命令\(propose / explore / apply / archive / sync / list / status …\)只能在该 worktree 内执行,无法绕过

    - 任何 OpenSpec 相关 skill 在第一步都必须经过本 guard 校验

2. **改造原有 OpenSpec skill**:在关键步骤\(propose / apply / archive\)强制遵守 guard 规则,在错误分支或非 worktree 环境下立即终止

3. **`worktree-commit`**** skill**:限制 git 提交能力,严格控制——**只有在 OpenSpec 流程走完\(proposal/tasks/spec 齐备且校验通过\)后才能提交**

4. **Worktree 收尾能力**:统一处理 worktree 的创建、删除、切换、清理,避免遗留临时分支或目录

**带来的效果:**

- 多个 change 可以并行在不同 worktree 中演进,互不干扰

- Agent 改坏了不会污染主仓库,丢弃 worktree 即可全身而退

- 流程合规由 skill 强制,不再依赖 prompt 提醒

### 3\.2 基于 build\_script 做开发环境隔离

#### 3\.2\.1 build\_script 介绍

[packages/build\_script/](https://file+.vscode-resource.vscode-cdn.net/Volumes/external/Project/flutter-app/packages/build_script/) 是用 Dart 写的命令行开发工具集合,作为原 [scripts/](https://file+.vscode-resource.vscode-cdn.net/Volumes/external/Project/flutter-app/scripts/) 下 bash 脚本的全量重写。它面向**开发者**和**Agent** 两类使用者,把工具链引导、构建编排、git hook、外部系统集成\(飞书 / FTP / 禅道 / git 分组提交\)聚合到同一个 CLI 之下,统一以 `dart run build_script <子命令>` 暴露。

#### 3\.2\.2 build\_script 能力

1. **重写既有脚本**:`scripts/*.sh` 全量迁移到 build\_script 的子命令,原脚本标记废弃但保留以便回滚

2. **bootstrap 子命令**:一键引导工具链\(`build_script bootstrap [jdk|flutter|gradle|cmake|android|cocoapods|nodejs|openspec]`\),用于初始化开发环境

3. **`.build_tools/`**** 项目隔离**:所有下载的 SDK、工具、缓存\(pub\-cache / gradle\-cache / npm\-cache / npm\-prefix\)统统落在仓库内的 `.build_tools/`,与 `~/.X` 解耦,不污染主机

4. **一键拉取工具集**:支持 Flutter SDK / Android SDK / CMake / Gradle / JDK 17 / Node\.js / OpenSpec / CocoaPods 等;镜像源可通过环境变量覆盖,后续可继续扩展

5. **`env-init`**** skill**:让 Agent 在执行任何依赖工具链的命令前,先 `source .envrc` 注入完整环境变量\(等价于 `build_script env all`\),确保命令可用

6. **实用工具 skill 化**:把 git\-stage、code\-review、zentao\(禅道\)、ftp、feishu\(飞书\)、git\-tag 等开发中常用工具通过 skill 暴露给 Agent 调用

#### 3\.2\.3 为什么不沿用 scripts/

1. **跨平台能力弱**:bash 脚本要在 macOS / Linux / Windows\(WSL\) 间反复测试,平台差异多,维护成本高

2. **可读性差**:复杂的 bash 难以人工维护,增改一个分支就容易引入 bug

3. **可分发性差**:Dart 可以编译成二进制可执行文件,脱离虚拟机直接运行,适合在 CI / Agent 环境下分发

4. **类型与测试**:Dart 有静态类型和成熟的单元测试体系,bash 几乎没有

#### 3\.2\.4 为什么一定要做开发工具聚合管理

1. **一键部署开发环境**:新成员或新机器开箱即用,减少前置环境准备时间

2. **环境隔离**:不污染操作系统全局环境,多个项目互不干扰、互不依赖,版本可独立

3. **给 Agent 一个稳定的可运行环境**:避免 Agent 在不同机器上"自主发挥"导致结果不可复现

4. **降低参与门槛**:非专业开发人员\(如产品 / 测试\)也能初始化环境,基于 Agent 完成简单的开发任务

5. **为自动化铺路**:构建、测试、部署、Agent 自动化开发等场景都需要一个稳定一致的运行环境

#### 3\.2\.5 build\_script 后续规划

1. **能程序化的事就别让 Agent 推理**:把可确定性执行的能力\(版本同步、产物上传、tag 管理等\)沉淀到 build\_script,减少 Agent 推理成本与不确定性

2. **更多开发者实用工具**:logs 聚合、release 脚手架、本地诊断等

3. **拓宽 Agent 调用面**:把更多工程化操作以 skill 形式暴露给 Agent,形成"Agent 友好的工具箱"

---

## 四、后续规划

下面三件事是当前正在调研、尚未落地的方向。

1. **规划中的第三版本扩展**:探索 Symphony 化的编排与自动化能力

2. **自动化测试**:重点调研 [Patrol](https://patrol.leancode.co/)

3. **Agent 自动化开发与 UI 还原度**:解决方案与研究

### 4\.1 Symphony 介绍

Symphony 的核心命题:**「把项目工作变成隔离的、自主的实现运行\(implementation run\),让团队去『管理』工作,而不是去『监督』编码 Agent。」**

它不是又一个 IDE 插件或 Copilot,而是把编码 Agent 变成**类似 CI/CD 的异步批处理流水线**:

```Plain Text
人类产出 → [Work Spec / 工作规范] → Symphony 服务编排
                                       ├─ 创建隔离 git worktree + 分支
                                       ├─ 启动 Agent (Claude Code / Codex / 自研)
                                       ├─ Agent 读项目 skills、约束、测试
                                       ├─ Agent 自主改代码、跑测试、提交
                                       └─ 输出 work log(结构化)+ PR/分支
人类 ← 评审 work log / diff → 合并 or 退回
```



https://openai\.com/zh\-Hans\-CN/index/open\-source\-codex\-orchestration\-symphony/

### 4\.2 Symphony 与第三版本的对比

第三版本已经具备:

- 代码隔离\(Worktree\)

- 环境隔离\(build\_script \+ `.build_tools/`\)

- 流程合规\(openspec\-guard \+ 一系列 skill\)

相比 Symphony **缺失**的能力:

- **任务编排**:从需求池\(禅道 / Issue / 飞书\)到实现的自动调度,目前仍由人手动触发

- **异步批处理**:多个任务的并发调度、资源管理、超时与重试,目前完全靠开发者本地启动

- **结构化 work log**:每个 run 的过程、决策、产物、修复历史的统一日志格式

- **失败回退与人工介入接口**:Agent 卡住时如何把控制权交回人,如何让人补充信息后继续

### 4\.3 理想流程

1. 测试或产品提交 bug / 需求\(禅道单 / Issue\)

2. 机器人自动拉取需求,结合现有工作流\(OpenSpec \+ Worktree \+ build\_script\)整理需求、生成代码、跑测试、提交到分支

3. 人类审核代码,确认无误后发送给自动化编译系统,产出测试包

4. 上述过程重复迭代,直到需求被满足

5. 人类检查测试包确认功能符合预期,发起代码合并请求

### 4\.4 资产化

AI 生成的需求、计划、完成进度,以及同一需求反复迭代的过程、出现的问题、解决方案、方案的适用性、是否最终解决、又出现了哪些新问题等等,**都需要被记录下来形成资产**。这部分资产既是后续 Agent 的训练/检索素材,也是团队复盘与新人学习的一手材料。

### 4\.5 当前的困难

1. **不同分支代码合并冲突**:多个 Agent 并行产出代码后,合并到主线时冲突解决仍依赖人

2. **长链路下代码质量下降**:Agent 长时间自主开发后,代码风格漂移、抽象失控、隐性 bug 增多

3. **测试包功能匹配度**:测试包是否真的实现了需求,目前没有权威自动化范式,仍需人工把关

4. **UI 还原度**:涉及 UI 的代码与设计稿一致性问题,缺少可量化的验证手段\(详见 4\.8\)

### 4\.6 Symphony 是如何解决代码质量下降问题的



> - 通过 work spec 把"边界条件 / 验收标准 / 受影响文件清单"前置约束,降低 Agent 漂移空间
> 
> - 强制每个 implementation run 输出结构化 work log,人评审 log 而不仅是 diff
> 
> - 在流水线中嵌入 review agent / lint / 静态分析,实现"代码质量门禁"
> 
> - 失败 run 必须显式标注原因和后续动作,避免被静默忽略
> 
> - **周期性提交偏移review PR，把代码拉回正轨**
> 
> 

### 4\.7 是否真有必要引入 Symphony?

1. **小改动**\(文案修改、颜色调整、字段微调等\):代码量小、架构无影响,如果能塞进自动化工作流,非专业开发人员也能完成,**收益最高**

2. **大改动**:需要专业开发人员把控关键节点,确保代码质量与功能正确,Symphony 更适合作为加速器而非替代品

3. **小团队 / 小项目**:更多人工介入往往是更好的选择 —— 不追求速度,更注重代码质量与功能正确

结论:Symphony **不是普适最优解**,而是在"任务体量足够大、并行度足够高、流程足够稳定"三个条件同时满足时,才能体现出它的价值。

### 4\.8 自动化测试 patrol 调研

目前还没有深入研究,只是简单调研了一下 —— [Patrol](https://patrol.leancode.co/) 是 Flutter 生态里目前看起来比较完整的端到端测试方案,支持原生交互\(权限弹窗、键盘、通知等\)和 hot restart 模式。后续需要更多的实测调研,重点关注:

- 与现有 `flutter test` / `integration_test` 的关系与迁移成本

- 是否能在 CI / Agent 流水线里稳定跑\(headless / 模拟器 / 真机\)

- 与 OpenSpec 的 tasks 是否能形成"spec → 测试用例"的自动映射

### 4\.9 UI 还原度问题的解决方案与研究

当前结论:

- **对 Web 兼容性较好**:主流 UI 设计软件\(如 Figma\)本质上基于 Web,可以方便地导出还原度较高的 Web 页面

- **对 Flutter 兼容性仍需改进**:目前的主流做法是把 HTML 实现的 UI 翻译成 Flutter 代码,中间的组件并不能一一对应。组件之间的关系、间距、大小、位置、图标、颜色等无法精确还原

一句话总结:**能导出类似 Figma 的 UI 代码,但仍需要人工检查和调整。**

可能的突破口:[A2UI](https://a2ui.org/#specification-versions) —— 抽象出 AI 可读的 UI 描述中间表示,让 AI 根据中间代码生成 Flutter / Web 等多端实现,从而绕过"HTML → Flutter 翻译"的有损环节,实现 UI 自动还原。

---

## 附录 A: Skill使用经验

这部分是日常使用 Claude Code / Agent 过程中踩过的坑和总结的规律,与具体版本无关,但对后续写 skill / 调试流程很有帮助。

[主流 Code AI Agent 扩展机制横评：Skill / Rule / Command / Hooks](https://vyejighahd.feishu.cn/wiki/FTFQwMmg9iOJsUkx4PqckIVWnyh?from=from_copylink)

### A\.1 skill 里要不要写约束?

取决于**约束起作用的边界**:

- 约束写在某个 skill 内,则该约束**只在这个 skill 被触发后才生效**

- 该 skill 只在 subagent 里运行,则约束**只在 subagent 的生命周期内生效**,主对话不受影响

- **全局约束**\(适用于所有对话、所有 skill 的规则\)应该写在全局位置,例如仓库根的 [CLAUDE\.md](https://file+.vscode-resource.vscode-cdn.net/Volumes/external/Project/flutter-app/CLAUDE.md) 或用户级 memory 里

没有强制规范说约束必须写在哪里,但**必须先弄清楚约束起作用的时机**。下面是几条经验法则:

简单原则:**约束跟谁走,就写在谁能加载到的位置**;**频繁犯错的地方,就写显式的反例**。

### A\.2 在 skill A 里写"必须先调用 skill B"是否有效?

**结论:不一定有效,不能依赖。**

例:`openspec-guard` 里声明自己是所有 OpenSpec skill 的守门员,要求其它 OpenSpec skill 在执行前必须先调用 `openspec-guard` 做校验。但实测中并不可靠,可能的原因:

1. **模型能力不足**:推理较弱的模型\(实测 MiniMax M3\)可能根本"读不出"这个跨 skill 约束

2. **description 描述不够清晰**:被守护的 skill 没有显式提到守门员,模型不会主动联想

3. **触发路径**:目前已确认 —— 在终端**直接以命令形式调用某个 skill**\(把 skill 当 command 用\)时,Claude Code **不会触发其它 skill 的守门逻辑**

**实际采用的解法**:直接修改 OpenSpec 提供的几个原始 skill,在它们的 prompt 起始位置硬编码"必须先调用 openspec\-guard"的指令,把跨 skill 约束转成 skill 自身的内置约束 —— 这样就不依赖模型的推理路径。

> 经验:**跨 skill 的"软约束"不可靠,要靠各 skill 内置的"硬约束"或外部门禁\(比如 hook / build\_script 命令\)兜底。**
> 
> 

### A\.3 Agent 载入 skill 的原理

Agent **不会把所有 skill 的全文都灌进对话上下文**,而是只载入每个 skill 头部的 frontmatter:

```Markdown
---
name: <skill-name>
description: <什么时候、为什么要触发这个 skill>
---
```

模型决定是否触发某个 skill,主要依据 `description`。因此:

- **`description`**** 必须写清楚"什么时候触发"**,而不是"这个 skill 是干嘛的"

- 模型推理能力越弱,描述越要**具体、显式、不抽象**

#### 实例:env\-init 的 description 演进

- **第一版\(模糊描述\)**:"在初始化编译环境时调用"

    - 问题:大部分该触发的场景都没触发,因为模型不知道"什么算初始化编译环境"

- **当前版本\(显式枚举触发条件\)**:

    - 列出依赖工具:`flutter / dart / gradle / java / cmake / adb / pod / node / npm / openspec` 命令前必须触发

    - 列出依赖 skill:`openspec-guard / openspec-propose / openspec-apply-change / openspec-archive-change / openspec-sync-specs / openspec-explore` 前必须触发

    - 兜底场景:首次进入项目、新开终端、`command not found` / 退出码 127 时也要触发

    - 效果显著好于第一版

#### 经验

模型能力会影响 skill 的发挥 —— 强模型可能从"初始化编译环境"自己推理出"任何命令行操作之前都该触发",弱模型则需要明确点名。

**写 skill 的建议**:

1. **精确描述触发条件**,枚举关键命令和关键 skill,避免抽象表述

2. **在较低智能模型上跑一遍**,保证兼容性与稳定性 —— 在弱模型上跑得通,在强模型上一定跑得通,反之不然



### A\.4 Rule 和skill区别

可以简单认为Rule里的限制是全局的，每次会话都会加入，skill是模型自主判断调用时生效



### A\.5 Rule 和 hook的区别

hook是强制的步骤，**代码级"强制拦截",不依赖模型判断**

---



## 附录 B:Open AI harness\-engineeing

版本二与版本三的实践过程实际上就是做harness\-engineeing的过程，

harness\-engineeing相关知识可以参考Open AI的博客：

https://openai\.com/zh\-Hans\-CN/index/harness\-engineering/



## 附录 C：五大 AI 编码 Agent 工作流框架详细对比

[五大 AI 编码 Agent 工作流框架详细对比](https://vyejighahd.feishu.cn/wiki/Olk8wESXIiZBgFk4fQgctVBQnAc)

