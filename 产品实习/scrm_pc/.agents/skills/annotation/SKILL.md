---
name: annotation
description: >
  原型标注工具。在页面上标注需求说明（字段说明、业务规则、交互逻辑等），
  开发人员和产品经理都能看到。标注与 UI 库完全解耦，通过注入专属 class 定位。
  Triggers: (1) "标注页面" "生成标注" "添加标注" "原型标注",
  (2) "给xx页面加标注" "标注xx功能",
  (3) "注入标注组件" "初始化标注"
---

# 原型标注工具

## 核心设计思路

**标注系统与 UI 库完全无关**。流程：

```
需求文档 → prd-analyzer 提取功能点（不碰代码）
              ↓
页面代码 → code-locator 为每个功能点定位 DOM 节点 + 分配唯一 class
              ↓
主流程 → 把 class 注入到代码里（Edit 工具）+ 生成标注 JSON（selector 用 .annot-xxx）
              ↓
标注组件 → 通过 .annot-xxx 选择器定位，永远精确命中
```

**不管项目用 Ant Design Vue / Element Plus / Vant / TDesign / Naive UI / shadcn-vue**，流程完全一样。

---

## Agent 协作架构

```
annotation skill（主流程）
  ├── Step 0: 确定 PROJECT_PATH、扫描需求文档
  ├── Step 1: 检查组件注入、安装依赖
  ├── Step 2: annotation-prd-analyzer agent
  │           输入：需求文档 + 页面路由
  │           输出：功能点清单（title、category、content、location，不含 selector）
  ├── Step 3: annotation-code-locator agent
  │           输入：功能点清单 + 页面代码
  │           输出：注入清单（每个功能点对应的文件、行号、class 名、代码片段）
  ├── Step 4: 主流程执行代码注入 + 生成标注 JSON
  └── Step 5: 写入文件 + JSON 语法验证
```

**多页面并行**：Step 2 和 Step 3 可并行处理多个页面，Step 4 主流程串行注入。

---

## 工作流

### 步骤 0：确定 PROJECT_PATH

检查当前工作目录下是否存在多个含 `package.json` 的子目录：
- 若存在多个子项目（`admin/`、`mobile/`、`web/` 等），根据用户描述判断目标子项目
- 无法判断时询问用户
- 确定后作为后续所有步骤的 **PROJECT_PATH**

扫描需求文档：
```
Glob("**/*需求*说明书*.md")
Glob("**/*需求*文档*.md")
Glob("docs/**/*.md")
```

找到后记录路径。若找不到，告知 prd-analyzer 由其根据功能名称推断。

**扫描功能模块下的所有页面文件（重要）：**

根据功能名称定位路由目录后，必须列出该目录下的所有 `.vue` / `.tsx` 文件：

```bash
ls {PROJECT_PATH}/src/views/{ModuleDir}/
```

常见模式：
- `index.vue` → 列表页
- `Detail.vue` → 详情页
- `Create.vue` / `Edit.vue` → 新增/编辑页（独立路由时）
- `components/` → 子组件目录

**每个独立路由的页面文件都需要单独标注，生成独立的 JSON 文件。**
例如"工单台账"功能包含 `index.vue`（列表）和 `Detail.vue`（详情），需要分别生成：
- `rectification-workorder.json`
- `rectification-workorder-detail.json`

不要只标注列表页而遗漏详情页、新增页等子页面。

---

### 步骤 1：检查并注入标注组件

1. 读取 `{PROJECT_PATH}/package.json`，识别框架：
   - `dependencies` 含 `"vue"` → Vue 项目 → 使用 `templates/vue/`
   - `dependencies` 含 `"react"` → React 项目 → 使用 `templates/react/`
   - 两者都不含 → 询问用户
2. 检查 `{PROJECT_PATH}/src/components/Annotation/` 是否存在
3. 若不存在：
   - 从对应框架模板目录复制组件到项目
   - 在根布局组件中挂载 `<AnnotationOverlay />`
   - 创建 `{PROJECT_PATH}/public/annotations/` 目录
4. 检查并安装依赖，每次都检查（即使组件已存在）

**Vue 项目依赖清单：**

| 包名 | 用途 |
|------|------|
| `marked` | Markdown 渲染 |
| `@tiptap/vue-3` | 富文本编辑器核心 |
| `@tiptap/starter-kit` | 富文本基础扩展 |
| `@tiptap/extension-table` | 富文本表格 |
| `@tiptap/extension-image` | 富文本图片 |
| `@tiptap/extension-text-style` | 富文本文字样式 |
| `@tiptap/extension-highlight` | 富文本高亮 |

**React 项目依赖清单：**

| 包名 | 用途 |
|------|------|
| `marked` | Markdown 渲染 |
| `dompurify` | HTML 消毒（防 XSS） |
| `@tiptap/react` | 富文本编辑器 React 绑定 |
| `@tiptap/starter-kit` | 富文本基础扩展 |
| `@tiptap/extension-table` | 富文本表格 |
| `@tiptap/extension-table-row` | 表格行 |
| `@tiptap/extension-table-header` | 表格表头 |
| `@tiptap/extension-table-cell` | 表格单元格 |
| `@tiptap/extension-image` | 富文本图片 |
| `@tiptap/extension-text-style` | 富文本文字样式 |
| `@tiptap/extension-highlight` | 富文本高亮 |
| `@tiptap/extension-color` | 文字颜色 |
| `@tiptap/extension-font-size` | 字号 |

---

### 步骤 2：分析需求（PRD Analyzer）

使用 `Agent` 工具，`subagent_type: "annotation-prd-analyzer"`，传入：

```
PAGE_PATH: {目标页面路由}
REQ_DOC_PATH: {步骤 0 找到的需求文档路径，找不到传空}
FEATURE_NAME: {功能名称}
PROJECT_PATH: {子项目根目录}
```

**产出**：功能点清单（JSON 数组），每个元素包含 `title / category / content / source / location / container`。

> agent 只读需求文档，不碰代码、不写选择器。

---

### 步骤 3：代码定位（Code Locator）

使用 `Agent` 工具，`subagent_type: "annotation-code-locator"`，传入：

```
PAGE_PATH: {页面路由}
PROJECT_PATH: {子项目根目录}
功能点清单: {步骤 2 的 JSON 数组}
```

**产出**：注入清单（JSON），包含：
- `pageFile`：页面组件绝对路径
- `injections[]`：每个功能点对应的 `className / file / line / operation / targetSnippet / newSnippet`

> agent 读代码、识别 DOM 区域、分配唯一 class、输出精确的 Edit 指令。

---

### 步骤 4：执行注入 + 生成标注 JSON

#### 4.1 注入 class 到代码

遍历注入清单，用 Edit 工具按 `targetSnippet → newSnippet` 做精确替换。

- `append-class`：已有 class 属性 → 追加
- `new-class`：没有 class 属性 → 新增
- `wrap-with-span`：元素外包一层 `<span class="annot-xxx">`

每个注入都必须验证 Edit 成功（Edit 工具会自动报错）。

#### 4.2 生成标注 JSON

将功能点清单和注入清单合并，生成最终的标注 JSON：

```json
{
  "page": "{PAGE_PATH}",
  "title": "{FEATURE_NAME}",
  "updatedAt": "YYYY-MM-DD",
  "annotations": [
    {
      "id": "{className}",
      "type": "selector",
      "selector": ".{className}",
      "position": { "x": 0, "y": 0 },
      "title": "{title}",
      "content": "{content}",
      "category": "{category}",
      "source": "{source}",
      "container": "{container}",
      "createdAt": "YYYY-MM-DD"
    }
  ]
}
```

**关键规则**：
- `selector` 永远是 `.{className}` 格式（注入的唯一 class）
- `container` 仅在 `modal` / `drawer` 时设置，`page` 可省略
- `content` 字段里的双引号转义为 `\"`

---

### 步骤 5：写入文件并验证

1. 将 JSON 写入 `{PROJECT_PATH}/public/annotations/{fileName}.json`
   - fileName：路由去斜杠（`/inspection/task` → `inspection-task.json`）

2. **必须验证 JSON 语法**：
   ```bash
   python3 -c "import json; json.load(open('{文件路径}')); print('JSON 语法正确')"
   ```

3. 告知用户：
   - 标注文件路径
   - 已注入的 class 列表（让用户知道代码做了哪些修改）
   - 刷新页面即可看到标注点

---

## 关键原则

1. **selector 永远是 `.annot-xxx`**：不依赖任何 UI 库 class、不依赖原有 class
2. **class 全局唯一**：`annot-{pageKey}-{category}-{slug}` 命名规范
3. **最小侵入**：只加 class，不改其他属性、不改结构
4. **class 永久保留**：标注 class 跟业务代码一起维护，作为约定保留

---

## 标注数据规范参考

- Read(".claude/knowledge/phase2-design/strategy.md") — 区域划分、什么该标
- Read(".claude/knowledge/phase2-design/content-format.md") — 内容格式、文案要求
- Read(".claude/knowledge/phase2-design/selector-patterns.md") — class 命名规范、注入策略

---

## 组件模板

- Vue 模板：`templates/vue/`（含 AnnotationOverlay、AnnotationDot、AnnotationPanel、AnnotationEditor、useAnnotation、types）
- React 模板：`templates/react/`（含 AnnotationOverlay、AnnotationDot、AnnotationPanel、AnnotationEditor、useAnnotation、types、annotation.css）

### React 项目挂载方式

在根布局组件（如 `App.tsx` 或 `Layout.tsx`）中：

```tsx
import { AnnotationOverlay } from '@/components/Annotation/AnnotationOverlay'

function App() {
  return (
    <>
      {/* 路由内容 */}
      <AnnotationOverlay />
    </>
  )
}
```

React 版使用 `react-router-dom` 的 `useLocation()` 和 `useMatches()` 获取路由信息，项目需已安装 `react-router-dom`。
