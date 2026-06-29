# 五大 AI 编码 Agent 工作流框架详细对比

# 五大 AI 编码 Agent 工作流框架详细对比

> 对比对象：**OpenSpec、Superpowers、GStack、Compound Engineering、everything\-claude\-code** 调研时间：2026\-06，基于各项目官方仓库 / 博客 / 第三方评测的多源交叉核查。 文中标注「⚠️ 不确定」的为无法逐字核实的二手数据，请以各仓库实时页面为准。
> 
> 

---

## 先把概念理清：这五个不是同一层的东西

很多人把它们并列比较，但它们其实分属**三个不同的抽象层**，对比时必须先分清，否则会得出"苹果 vs 轮胎"式的错误结论。

注意：**Compound Engineering 同时存在于"方法论层"和"框架层"**——它本身是一套思想（Every 团队提出），同时官方把它打包成了 `EveryInc/compound-engineering-plugin` 落地。

一个有用的类比（来自第三方 Pulumi 评测对相邻生态的定位）：

- **GStack** 管「决策与范围治理」（产品/工程对齐，防止跑偏）

- **OpenSpec** 管「规格与上下文稳定」（先对齐要做什么）

- **Superpowers** 管「执行纪律」（TDD、根因调试、完成前验证）

- **Compound Engineering** 管「跨任务的学习复利」（把每次教训变成永久资产）

- **everything\-claude\-code** 是「零件仓库」（前四者要的零件这里大多能找到）

它们更多是**互补**而非互斥——可以叠加使用。

---

## 逐个速览

### 1\.1 OpenSpec — 轻量规格驱动开发（SDD）

- **作者/许可**：Fission\-AI，MIT。仓库 [https://github\.com/Fission\-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) ，官网 openspec\.pro

- **核心理念**：写任何代码前，先让人和 AI 就"要构建什么"达成**文档化的规格（spec）**。痛点是需求只存在于聊天记录时 AI 容易跑偏；OpenSpec 在仓库里加一层轻量 Markdown 规格层固定意图。

- **四原则**：流动而非僵硬、迭代而非瀑布、简单而非复杂、面向存量项目（brownfield）而非仅新项目。**无强制阶段门禁**，任何产物可随时改。

- **工作流**：`explore → propose → apply → sync → archive`

    - explore（不产文件的讨论）→ propose（生成变更脚手架）→ apply（按 tasks 写代码）→ sync（增量规格合并进主规格）→ archive（归档完成的变更）

- **目录结构**：

```Plain Text
openspec/
├── changes/[change-name]/   # proposal.md / specs/ / design.md / tasks.md
│   └── archive/[ts-name]/   # 已归档变更
└── specs/                   # 合并后的长期"活文档"规格
```

- **命令**：新版 `/opsx:propose|explore|apply|sync|archive`（core profile）；旧版 `/openspec:proposal|apply|archive`。CLI：`openspec init|update|list|status|validate`。

- **安装**：`npm i -g @fission-ai/openspec` → `openspec init`（需 Node ≥ 20\.19）。官方称支持 20–30\+ 个 AI 助手/IDE，无锁定。

- **本质局限**：它**只是仓库里的一层 Markdown 规格/流程文件**，因此**不提供代码隔离、不提供并行开发、不提供环境隔离**——这些不在其设计范围，需外部工具（git worktree、沙箱）补。

> 📌 本仓库已落地 OpenSpec（见 `.claude/research/research-1`），且做了 worktree 隔离的二次改造，正好印证了上面这条局限。
> 
> 

### 1\.2 Superpowers — 技能框架 \+ 工程纪律方法论

- **作者/首发**：Jesse Vincent（GitHub: **obra**，博客 blog\.fsck\.com）。2025\-10 与 Anthropic 发布 Claude Code 插件系统同日首发。仓库 [https://github\.com/obra/superpowers](https://github.com/obra/superpowers)

- **核心理念**：**技能（skills）是可组合、可复用的"教学单元"**。与其每次重复指令，不如把结构化技巧"教"给 Claude 跨项目复用。铁律："**有对应技能就必须用它**，不准即兴发挥。"

- **技能结构（SKILL\.md）**：YAML frontmatter 只有两个必填字段——`name`（仅字母数字连字符）、`description`（**第三人称，只写"何时用 / Use when…"，不写"做什么"**）。按需动态加载，核心引导 \< 2k token，重活交 subagent。

- 关键设计 **SDO（Skill Discovery Optimization）**：description 必须写触发条件而非流程摘要，否则 agent 会偷懒只读描述、跳过正文。

- **三段式工作流**：Brainstorm（苏格拉底式细化需求）→ Plan（拆成 2–5 分钟粒度任务）→ Implement（建 git worktree 隔离，人监督或 subagent 自主执行 \+ 两阶段评审）。

- **代表技能**：`brainstorming`、`writing-plans`、`test-driven-development`（强制 RED\-GREEN\-REFACTOR，测试必须先失败）、`systematic-debugging`（根因优先）、`verification-before-completion`（证据先行才能声明完成）、`using-git-worktrees`、`dispatching-parallel-agents`、元技能 `writing-skills`。

- **最独特之处——"写技能本身就是对流程文档做 TDD"**：铁律 "NO SKILL WITHOUT A FAILING TEST FIRST"。RED=在无技能时让 subagent 跑压力场景、记录它用的"借口/合理化"；GREEN=写最小技能针对性反驳那些借口；REFACTOR=反复堵漏到"无懈可击"。

- **安装**：`/plugin marketplace add obra/superpowers-marketplace` → `/plugin install superpowers@superpowers-marketplace`（或官方 marketplace）。

- **局限（作者自承）**：技能分发/共享机制尚不完善；记忆系统"零件都写好了但还没接通"；从书籍提炼技能的版权问题待解。

### 1\.3 GStack — 单 Agent 上的"角色化人格治理"

> ⚠️ **重要纠偏**：很多人（包括本任务的初始假设）以为 GStack 是"堆叠 PR / stacked diffs"工具——**这是误传**。官方仓库和 Pulumi 评测都明确否认。真正做堆叠 PR 的是 `github/gh-stack`、`modular/stack-pr`，与此无关。
> 
> 

- **作者/热度**：Garry Tan（Y Combinator 总裁兼 CEO）。仓库 [https://github\.com/garrytan/gstack](https://github.com/garrytan/gstack) ，MIT。⚠️ star 数说法不一（抓取时约 11\.6 万，早期文章引 7\.1 万）。

- **本质**：构建在 Claude Code 之上的、**意见化的"技能/角色集合"**。把单个 Claude Code agent 组织成一个 **23 个"工具/角色"的虚拟工程团队**——CEO、设计师、工程经理、发布经理、QA 负责人、安全官（CSO）等，每个角色有自己的职责、约束和**上下文切片**（工程师看不到产品路线图，QA 看不到实现细节）。

- **关键定位**：用的是 **role isolation（角色隔离）**，**不是**真正的多 agent 编排，而是"单代理界面内的人格约束"。关注**范围治理（scope governance）、产品\-工程对齐、防止 scope creep**。

- **七阶段冲刺**：Think → Plan → Build → Review → Test → Ship → Reflect。

- **代表命令（23\+）**：`/autoplan`、`/spec`、`/plan-ceo-review`、`/design-shotgun`、`/review`（资深级评审\+自动修复）、`/qa`（真实浏览器测试，Playwright）、`/cso`（OWASP Top 10 \+ STRIDE 安全审计）、`/ship`（测试\+查覆盖\+开 PR）、`/land-and-deploy`（合并\+部署\+验证生产健康）、`/learn`、`/codex`（OpenAI Codex 二次评审）、安全控制 `/careful` `/freeze` `/guard`。

- **GBrain**：为 agent 提供的持久化知识库，可作 MCP server 接入（Supabase/PGLite/远程），带信任分层。

- **安装**：`git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup`，再在项目 CLAUDE\.md 加 gstack 段。依赖 Bun v1\.0\+。

- **局限**：Pulumi 直言其"**实际写代码这部分是弱项**"，最不适合纯基础设施（IaC）类工作；命令多、流程重、学习成本高；仓库未处理 issue/PR 较多（抓取时 \~293 issues / \~443 PRs）。生产力倍数（\~810×）是作者自述营销数据。

### 1\.4 Compound Engineering（复利工程）— 方法论 \+ 官方插件

- **提出者**：Kieran Klaassen（Every 旗下 AI 邮件产品 Cora 的 GM）主导命名；Dan Shipper（Every CEO，"Chain of Thought"专栏 \+ "AI \& I"播客）合著推广。组织背景：用约三个月端到端构建 Cora 的实践沉淀。

    - ⚠️ 纠正：用户提到的"Source Code"不是 Dan Shipper 的专栏（他的是"Chain of Thought"）；"Source Code"是 Every 的工程板块。

- **核心命题**（逐字）：

    - "**Each unit of engineering work should make subsequent units easier—not harder\.**"（每一单元工程工作都该让后续更容易，而非更难）

    - "Instead of features adding complexity and fragility, they teach the system new capabilities\. **Bug fixes eliminate entire categories of future bugs\.**"

    - "AI engineering makes you faster **today**\. Compound engineering makes you faster **tomorrow, and each day after**\."

    - ⚠️ 流行口号"teach the system once / fix it once forever"**非作者逐字原文**，但底层概念（修复一次、永不复发、自动全队共享）在一手来源中确有明确陈述。

- **四步循环**：**Plan → Work → Review → Compound**

    1. Plan：agent 读 issue、调研方案、综合成详细实现计划（"**计划是新代码**"——agent 写代码的时代，工程师时间主要花在规划）

    2. Work：agent 按计划写代码 \+ 测试（产出 PR）

    3. Review：工程师审查产出**以及从产出中学到的教训**（产出 P1/P2/P3 优先级 findings）

    4. Compound：把结果**反馈进系统**，让系统从成败中学习（新偏好/要规避的 bug 模式/架构决策写进 CLAUDE\.md，带 YAML frontmatter 便于检索，并**自动分发给全队**）

    - ⚠️ 2026 年已扩展为八步：Ideate → brainstorm → plan → work → review → polish → compound → repeat。

    - **80% 精力在 plan 和 review 两端**。

- **关键原则**：计划是新代码 / 委派结果而非任务 / 并行编排多 agent（"新瓶颈是算力——你能同时跑多少 agent"）/ 把教训沉淀为可复用规则并自动全队共享 / 把自己从流程中移除以触发复利。

- **落地（官方插件）**：`EveryInc/compound-engineering-plugin`，跨 Claude Code/Cursor/Codex/Copilot 等。27 个 skill：`/ce-brainstorm` `/ce-plan` `/ce-work` `/ce-code-review` `/ce-compound` `/ce-debug` `/ce-worktree` `/lfg`（全自动）等。

- Claude Code 落地：子 agent 并行调研；**12 个 subagent 各从不同视角并行评审**；`/ce-compound` 把学习写入 `docs/solutions/`；`/ce-work` 用 git worktrees。"**文件夹即 agent**"——有 CLAUDE\.md \+ \.claude/ 就是一个 agent，Klaassen 自称同时跑 44 个这样的"文件夹 agent"。

- **批评/局限**：

    - **"并不新颖"**（最有分量，来自 Will Larson/lethain\.com）：是"两个广为人知的模式 \+ 一个中等知名模式 \+ 一个大家凭直觉感受到但缺一致机制的模式"，并预测会被 Claude Code/Cursor 直接吸收。

    - **Token 成本高**（最可核实）：仅启用就约 36,000 token；一次 `/plan` 可烧 200k\+ token；Claude Max 上几次密集规划即可能当日限流。

    - **复利只在你跑完闭环时才发生**：跳过 `/ce-compound` 就拿不到承诺收益，退化为"更啰嗦更贵的普通会话"。

    - ROI 数字（300\-700% / 3\-7x / 10x）均为**倡导方理论估算，无独立验证**。

### 1\.5 everything\-claude\-code（ECC）— 大型可安装工具箱

> ⚠️ 同名仓库多（多为 fork），主流是 **affaan\-m/everything\-claude\-code**：[https://github\.com/affaan\-m/everything\-claude\-code](https://github.com/affaan-m/everything-claude-code) 。star 数各源严重矛盾（100K–211K），**不可信**。
> 
> 

- **定位**：作者 Affaan M 经 10\+ 月实战沉淀的"agent harness 性能优化系统"——面向 Claude Code（也适配 Cursor/OpenCode/Codex）的**配置集合 \+ 工具链**。MIT。

- **内容（顶层目录）**：

    - `agents/` — \~67 个专用子代理（权限受限）

    - `skills/` — 271\+ 工作流/领域知识包（主力扩展面）

    - `commands/` \+ `legacy-command-shims/` — 旧式命令向 skills 迁移

    - `rules/` — common \+ 按语言分（TS/Python/Go/Swift/PHP/Java/Kotlin/C\+\+/Rust…）

    - `hooks/`（SessionStart/PostToolUse/Stop）、`mcp-configs/`（GitHub/Supabase/Vercel/Railway）、`scripts/`、`tests/`、`examples/`

- **是框架还是目录？**：**更偏可安装的框架/插件**，而非纯复制参考。推荐 `/plugin install ecc@ecc`，也可手动拷到 `~/.claude/`。带安装器、测试，甚至商业版 ECC Pro（GitHub App，$19/seat/月）。

- **独到工具**：AgentShield（扫描 agent 配置漏洞，\~102 规则 \+ red\-team/blue\-team/auditor 三 Opus 流水线）、Skill Creator（从 git 历史提取可复用工作流）、Continuous Learning v2（把模式提炼为可演进的"instincts"）。

- **局限**：体量巨大、**杂烩不聚焦**，质量参差需自行甄别裁剪；部分能力走付费；**给零件不强加单一流程**。

- \*\*真正的"纯精选目录"\*\*对照：`hesreallyhim/awesome-claude-code`（CC0，社区手工精选，才是严格意义上"从中挑选复制"的 catalog）。

---

## 横向对比总表

---

## 关键差异辨析（容易混淆的点）

### 3\.1 "隔离"和"并行"谁有谁没有

- **OpenSpec 明确没有**代码/环境隔离和并行——这是它作为纯 Markdown 层的天然边界（本仓库正是为此自行加了 worktree 改造）。

- **Superpowers / Compound Engineering 真有** git worktree 隔离 \+ 并行 subagent。

- **GStack 的"隔离"是角色级的**（上下文切片），不是代码级 worktree，也**不是真多 agent 并行**——只是单 agent 轮换人格。这点最易被误读。

### 3\.2 三个"强主张"框架的侧重各不同

- **Superpowers** = **执行纪律**（你写代码的方式：测试先失败、根因优先、完成前验证）

- **GStack** = **范围治理**（你该不该写、写多少：多角色 review 防 scope creep）

- **Compound Engineering** = **时间维度的学习**（这次写完怎样让下次更快：沉淀教训） 三者正交，理论上可叠加。

### 3\.3 "方法论"vs"工具"——Compound Engineering 的特殊性

CE 最有分量的批评是 Will Larson 的"**不新颖**"：它把若干已知模式系统化命名\+打包，价值在"一致的机制"而非"新发现"，且很可能被 harness 直接吸收。换言之 CE 的思想可以**不依赖插件**实践（写好 CLAUDE\.md \+ 跑完闭环即可），插件只是降低门槛。

### 3\.4 两类"集合"别搞混

- **everything\-claude\-code** = 可安装的**大型框架/工具箱**（带安装器、测试、付费版）

- **awesome\-claude\-code**（hesreallyhim）= 纯**精选目录**（CC0，复制为主）

- **Superpowers / GStack** 虽也是"skills 集合"，但**有强主张的端到端流程**，不是无序工具箱。

---

## 选型建议（按场景）

**叠加用法**（互补而非互斥）：OpenSpec/CE 定"做什么 \+ 沉淀学习" → Superpowers 管"怎么严谨地写" → GStack 管"范围与多角色把关" → 零件不够去 everything\-claude\-code 取。

---

## 对本仓库的启示

结合 research\-1 已记录的实践（本仓库已用 OpenSpec 并做了 worktree 隔离 \+ build\_script 环境隔离改造）：

1. **OpenSpec 的"无隔离/无并行"局限本仓库已亲历并补足**——这条对比结论与 research\-1 的改造动机完全吻合，可作为佐证。

2. \***Superpowers 的"写技能=对流程做 TDD **思路，对 research\-1 附录里反复纠结的"skill description 怎么写才触发"问题是直接解药：它的 SDO 原则（description 只写"何时用"、用低智能模型压力测试）与你"在较低智能模型上跑一下保证兼容性"的经验高度一致，值得吸收进你的 skill 编写规范。

3. **Compound Engineering 的"学习沉淀 \+ 自动全队分发"**，正对应 research\-1 末尾提到的"资产化"诉求（AI 生成的需求/计划/问题/方案要记录成资产）——CE 的 `/ce-compound` \+ CLAUDE\.md \+ YAML frontmatter 是一个可直接借鉴的落地范式，但要警惕其 token 成本。

4. **GStack 的角色化 review \+ GBrain**，对你规划中的"机器人自动拉需求→编码→跑测试→人审"流水线里的"多角色把关"环节有参考价值，但其"非真并行"的本质要认清。

---

## 附录：不确定性与待核实清单

- 各项目 **GitHub star 数**：多源矛盾，全部以仓库实时页面为准，本文不作断言。

- **GStack ≠ 堆叠 PR 工具**：已确认是误传，真正的堆叠 PR 是 gh\-stack / stack\-pr。

- **CE 的 ROI 数字（3\-7x/10x）**：倡导方估算，无独立验证。

- **CE 评审 subagent 数"12"**：一手为 12，二手有"4"，存在版本漂移。

- **Superpowers / CE 的记忆系统**：作者均自承部分"尚未完全接通"。

- **OpenSpec 推荐模型的具体版本号**：以仓库实时 README 为准。

### 主要来源

- OpenSpec：[https://github\.com/Fission\-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) ｜ [https://openspec\.pro/](https://openspec.pro/)

- Superpowers：[https://github\.com/obra/superpowers](https://github.com/obra/superpowers) ｜ [https://blog\.fsck\.com/2025/10/09/superpowers/](https://blog.fsck.com/2025/10/09/superpowers/) ｜ [https://simonwillison\.net/2025/Oct/10/superpowers/](https://simonwillison.net/2025/Oct/10/superpowers/)

- GStack：[https://github\.com/garrytan/gstack](https://github.com/garrytan/gstack) ｜ [https://www\.pulumi\.com/blog/claude\-code\-orchestration\-frameworks/](https://www.pulumi.com/blog/claude-code-orchestration-frameworks/)

- Compound Engineering：[https://every\.to/chain\-of\-thought/compound\-engineering\-how\-every\-codes\-with\-agents](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents) ｜ [https://github\.com/EveryInc/compound\-engineering\-plugin](https://github.com/EveryInc/compound-engineering-plugin) ｜ [https://lethain\.com/everyinc\-compound\-engineering/](https://lethain.com/everyinc-compound-engineering/)

- everything\-claude\-code：[https://github\.com/affaan\-m/everything\-claude\-code](https://github.com/affaan-m/everything-claude-code) ｜ 对照 [https://github\.com/hesreallyhim/awesome\-claude\-code](https://github.com/hesreallyhim/awesome-claude-code)

