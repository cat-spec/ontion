---
name: annotation
description: >
  原型标注工具。在页面上标注需求说明（字段说明、业务规则、交互逻辑等），
  开发人员和产品经理都能看到。支持自动从需求文档生成标注 + 手动补充修改。
  Triggers: (1) "标注页面" "生成标注" "添加标注" "原型标注",
  (2) "给xx页面加标注" "标注xx功能",
  (3) "注入标注组件" "初始化标注"
---

# 原型标注工具

## Agent 协作架构

```
annotation skill（主流程）
  ├── Step 0: 确定 PROJECT_PATH
  ├── Step 1: 检查组件注入
  ├── Step 2: prd-analyzer agent（分析需求 → 输出标注清单）
  │           ↑ 读取 knowledge/annotation/ 规范
  │           ↑ 读取 agent 记忆（已验证选择器模式）
  │           ↓ 写入 agent 记忆（新发现的选择器模式）
  ├── Step 3: 生成标注 JSON
  ├── Step 4: selector-validator agent（验证选择器 → 反馈修正）
  │           ↑ 读取 Vue 组件文件
  │           ↓ 写入 agent 记忆（已验证选择器）
  │     ↓ 有 ❌ 项 → 回到 Step 3 修正后重新验证
  │     ↓ 全部通过 → 继续
  └── Step 5: 写入文件 + 验证
```

**多页面并行**：若用户要求标注多个页面，Step 2 可并行启动多个 `prd-analyzer`，每个负责一个页面，Step 4 同样并行验证，最后统一写入文件。

---

## 工作流

### 步骤 0：确定 PROJECT_PATH

检查当前工作目录下是否存在多个含 `package.json` 的子目录（如 `admin/`、`mobile/`、`web/` 等）：
- 若存在多个子项目，根据用户描述的功能判断目标子项目；若无法判断，询问用户
- 确定后，将该子项目目录作为后续所有步骤的 **PROJECT_PATH**
- 若只有一个子项目或根目录本身就是项目，直接用根目录作为 PROJECT_PATH

同时扫描项目中的需求文档（供步骤 2 使用）：
```
Glob("**/*需求*说明书*.md")
Glob("**/*需求*文档*.md")
Glob("docs/**/*.md")
```
找到后记录路径，步骤 2 传给 prd-analyzer。若找不到，步骤 2 时告知 prd-analyzer 无需求文档，由其根据功能名称推断标注内容。

---

### 步骤 1：检查并注入标注组件

首次使用时自动将标注组件注入到项目中：

1. 读取 `{PROJECT_PATH}/package.json`，识别框架（vue / react）和 src 目录位置
2. 检查 `{PROJECT_PATH}/src/components/Annotation/`（或项目实际的 components 目录）是否存在
3. 若不存在：
   - 从 `templates/vue/`（或 `templates/react/`）复制组件到项目的 components 目录
   - 在项目的根布局组件（读取已有路由/布局文件推断，如 `MainLayout`、`App.vue`、`layout.tsx`）中挂载 `<AnnotationOverlay />`
   - 创建 `{PROJECT_PATH}/public/annotations/` 目录
4. 若已存在 → 跳过注入，但仍需执行第 5 步依赖检查

5. **检查并安装所有必要依赖**（无论是否首次注入，每次都检查）：

   标注组件依赖以下 npm 包，缺少任何一个都会导致页面报错：

   | 包名 | 用途 |
   |------|------|
   | `marked` | AnnotationPanel 渲染 Markdown 内容 |
   | `@tiptap/vue-3` | AnnotationEditor 富文本编辑器核心 |
   | `@tiptap/starter-kit` | 富文本基础功能（加粗、斜体、列表等） |
   | `@tiptap/extension-table` | 富文本表格支持 |
   | `@tiptap/extension-image` | 富文本图片支持 |
   | `@tiptap/extension-text-style` | 富文本文字样式（颜色、字号） |
   | `@tiptap/extension-highlight` | 富文本高亮支持 |

   **执行步骤：**
   ```bash
   # 1. 读取 package.json，找出缺少的包
   # 2. 判断包管理器：有 pnpm-lock.yaml → pnpm，有 yarn.lock → yarn，否则 npm
   # 3. 一次性安装所有缺少的包，例如：
   #    pnpm add marked @tiptap/vue-3 @tiptap/starter-kit @tiptap/extension-table @tiptap/extension-image @tiptap/extension-text-style @tiptap/extension-highlight
   ```
   安装完成后静默继续，不需要告知用户。若安装失败则报告具体错误。

---

### 步骤 2：PRD 分析

先确定需求文档路径（步骤 0 已扫描），再调用 prd-analyzer。

**单页面**：使用 `Agent` 工具，`subagent_type: "annotation-prd-analyzer"`，传入：

```
PAGE_PATH：{目标页面路由，如 /equipment/archive}
REQ_DOC_PATH：{步骤 0 找到的需求文档路径，找不到则传空字符串}
FEATURE_NAME：{功能名称}
PROJECT_PATH：{步骤 0 确定的子项目根目录绝对路径}
```

**多页面（并行）**：同时启动多个 `prd-analyzer`，每个传入不同的 PAGE_PATH/FEATURE_NAME，等待全部完成后统一进入步骤 2.5。

> `prd-analyzer` 会读取知识库规范 + agent 记忆中已验证的选择器模式，输出完整标注清单，并将新发现的选择器模式写入记忆供后续复用。

---

### 步骤 2.5：处理缺失 class（如有）

收到 prd-analyzer 的报告后，检查是否有"需要在代码中添加 class"的清单：

- **有需要添加的 class** → 在进入步骤 3 之前，先用 Edit 工具给对应元素加上 class，然后继续
- **没有需要添加的 class** → 直接进入步骤 3

加 class 的命名规则：`btn-{动作}` 用于按钮（如 `btn-add`、`btn-import`），`{区域}-card` 用于容器。

---

### 步骤 3：生成标注 JSON

严格按 prd-analyzer 的分析报告生成标注 JSON：

- 有字段表格的区域（筛选、列表、表单）content 用 Markdown 表格
- `type: "position"` 用于弹窗/抽屉内元素，坐标 `{ x: 0, y: 0 }`
- content 直接使用分析报告中的内容，不自行发挥
- **content 字段内的双引号必须转义为 `\"`**，例如提示文案 `"新增成功"` 在 JSON 中写为 `\"新增成功\"`

```json
{
  "page": "/equipment/archive",
  "title": "设备档案",
  "updatedAt": "今天日期",
  "annotations": [
    {
      "id": "ann-001",
      "type": "selector",
      "selector": ".filter-card",
      "position": { "x": 0, "y": 0 },
      "title": "筛选区字段说明",
      "content": "| 筛选字段 | 类型 | 说明 |\n|...",
      "category": "filter",
      "source": "需求文档章节号",
      "createdAt": "今天日期"
    }
  ]
}
```

---

### 步骤 4：选择器验证（反馈循环）

使用 `Agent` 工具，`subagent_type: "annotation-selector-validator"`，传入：

```
PROJECT_PATH：{步骤 0 确定的子项目根目录绝对路径}
PAGE_PATH：{页面路由}
标注清单：{步骤 3 生成的 JSON 内容}
```

**收到验证报告后**：

- 若报告中**无 ❌ 项** → 直接进入步骤 5
- 若报告中**有 ❌ 项** → 按报告中的建议修正对应标注的 selector（或改为 `type: position`），修正后**重新调用 selector-validator** 复验，直到无 ❌ 为止（最多重试 2 次，超过则将问题选择器改为 `type: position`）

> `selector-validator` 会将已验证的选择器写入 agent 记忆，下次同项目的其他页面标注时直接复用，无需重新验证。

---

### 步骤 5：写入文件并验证

1. **写入前必须转义**：将 JSON 写入文件前，检查所有 content 字段值，把其中的裸双引号 `"` 替换为 `\"`（JSON 字符串内部的双引号必须转义）

2. **写入文件**：将 JSON 写入 `{PROJECT_PATH}/public/annotations/{文件名}.json`
   - 文件名规则：路由路径转文件名，`/equipment/archive` → `equipment-archive.json`
   - 若项目没有 `public/` 目录（如 Next.js App Router），写入 `{PROJECT_PATH}/public/annotations/`（Next.js 同样支持）

3. **写入后必须用 Bash 验证语法**，执行以下命令，若报错则修复后重新写入：
   ```bash
   python3 -c "import json; json.load(open('{文件路径}')); print('JSON 语法正确')"
   ```
   验证通过才算完成，不能跳过。

4. 告知用户：
   - 标注文件路径
   - `type: "position"` 的标注点需要手动拖到合适位置
   - 刷新页面即可看到标注点

---

## 标注数据规范

参考 `.claude/knowledge/annotation/` 下的三个规范文件：
- `strategy.md` — 区域划分、什么该标
- `content-format.md` — 表格格式、文案要求
- `selector-patterns.md` — CSS 选择器速查

## 组件模板

- Vue 模板：`templates/vue/`
- React 模板：`templates/react/`（后续扩展）
