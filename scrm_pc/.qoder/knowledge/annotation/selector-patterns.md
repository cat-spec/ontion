# CSS 选择器模式

## 通用语义化 class（所有框架优先使用）

项目自定义的语义化 class 是最稳定的选择器，优先于 UI 库的渲染 class。

| 区域 | 推荐 class | 说明 |
|------|-----------|------|
| 筛选区容器 | `.filter-card` | 筛选表单整体 |
| 数据卡片 | `.table-card` | 表格区整体 |
| 操作栏 | `.action-bar` | 新增/导入/导出按钮区 |
| 左侧树容器 | `.category-tree-card` | 左侧树形卡片 |
| 详情页头部 | `.detail-header` | 返回按钮 + 标题 + 状态标签 |
| 多步表单工具栏 | `.form-toolbar` | 返回 + 步骤条 + 操作按钮 |
| 多步表单步骤条 | `.form-steps` | 步骤条容器 |
| 语义化按钮 | `.btn-add`、`.btn-import`、`.btn-export` | 操作栏按钮 |

---

## Vue 3 + Ant Design Vue

### 页面级容器（渲染后 class）

| 区域 | 选择器 | 说明 |
|------|--------|------|
| 表格 | `.ant-table` | `<a-table>` 渲染结果 |
| 表头 | `.ant-table-thead` | 列标题行 |
| 表体 | `.ant-table-tbody` | 数据行区域 |
| 描述列表 | `.ant-descriptions` | `<a-descriptions>` 渲染结果 |
| 折叠面板 | `.ant-collapse` | `<a-collapse>` 渲染结果 |
| 时间轴 | `.ant-timeline` | `<a-timeline>` 渲染结果 |
| 步骤条 | `.ant-steps` | `<a-steps>` 渲染结果 |
| 弹窗容器 | `.ant-modal-wrap` | Modal 弹窗外层容器 |
| 弹窗内容区 | `.ant-modal-body` | Modal 内容区 |
| 抽屉内容区 | `.ant-drawer-body` | Drawer 内容区 |

### 表格内元素

| 元素 | 选择器 | 说明 |
|------|--------|------|
| 状态标签 | `.ant-table-tbody .ant-tag` | 表格内 Tag 组件 |
| 操作列第一个按钮 | `.ant-table-tbody .ant-btn-link:first-child` | 操作列第一个链接按钮 |
| 危险操作按钮 | `.ant-table-tbody .ant-btn-link.ant-btn-dangerous` | 删除等危险操作 |
| 状态开关 | `.ant-table-tbody .ant-switch` | 行内状态切换开关 |
| 图片 | `.ant-table-tbody .ant-image` | 表格内图片 |

### 筛选区内元素

| 元素 | 选择器 | 说明 |
|------|--------|------|
| 特定输入框 | `.filter-card .ant-input[placeholder='xxx']` | 按 placeholder 定位 |
| 下拉选择 | `.filter-card .ant-select` | 筛选区下拉 |
| 搜索按钮 | `.filter-card .ant-btn-primary` | 搜索/查询按钮 |

### 弹窗/抽屉内元素（需配合 container 字段）

| 场景 | 选择器 | container 值 |
|------|--------|-------------|
| 弹窗内表单 | `.ant-modal-body` 或 `.ant-modal-body .ant-form` | `modal` |
| 抽屉内表单 | `.ant-drawer-body` 或 `.ant-drawer-body .ant-form` | `drawer` |
| 弹窗内表格 | `.ant-modal-body .ant-table` | `modal` |

---

## Vue 3 + Element Plus

### 页面级容器（渲染后 class）

| 区域 | 选择器 | 说明 |
|------|--------|------|
| 表格 | `.el-table` | `<el-table>` 渲染结果 |
| 表头 | `.el-table__header-wrapper` | 列标题行 |
| 表体 | `.el-table__body-wrapper` | 数据行区域 |
| 描述列表 | `.el-descriptions` | `<el-descriptions>` 渲染结果 |
| 折叠面板 | `.el-collapse` | `<el-collapse>` 渲染结果 |
| 时间轴 | `.el-timeline` | `<el-timeline>` 渲染结果 |
| 步骤条 | `.el-steps` | `<el-steps>` 渲染结果 |
| 弹窗容器 | `.el-dialog` | Dialog 弹窗容器 |
| 弹窗内容区 | `.el-dialog__body` | Dialog 内容区 |
| 抽屉内容区 | `.el-drawer__body` | Drawer 内容区 |

### 表格内元素

| 元素 | 选择器 | 说明 |
|------|--------|------|
| 状态标签 | `.el-table__body .el-tag` | 表格内 Tag 组件 |
| 操作列按钮 | `.el-table__body .el-button--text` | 文字按钮（操作列） |
| 危险操作按钮 | `.el-table__body .el-button--danger` | 删除等危险操作 |
| 状态开关 | `.el-table__body .el-switch` | 行内状态切换开关 |

### 筛选区内元素

| 元素 | 选择器 | 说明 |
|------|--------|------|
| 输入框 | `.filter-card .el-input__inner` | 筛选区输入框 |
| 下拉选择 | `.filter-card .el-select` | 筛选区下拉 |
| 搜索按钮 | `.filter-card .el-button--primary` | 搜索/查询按钮 |

### 弹窗/抽屉内元素（需配合 container 字段）

| 场景 | 选择器 | container 值 |
|------|--------|-------------|
| 弹窗内表单 | `.el-dialog__body` 或 `.el-dialog__body .el-form` | `modal` |
| 抽屉内表单 | `.el-drawer__body` 或 `.el-drawer__body .el-form` | `drawer` |

---

## React + Ant Design（antd）

> React 项目的 antd 渲染 class 与 Ant Design Vue 基本一致（都以 `.ant-` 开头），但组件写法不同（`<Table>` vs `<a-table>`）。

### 页面级容器（渲染后 class）

| 区域 | 选择器 | 说明 |
|------|--------|------|
| 表格 | `.ant-table` | `<Table>` 渲染结果 |
| 表体 | `.ant-table-tbody` | 数据行区域 |
| 描述列表 | `.ant-descriptions` | `<Descriptions>` 渲染结果 |
| 折叠面板 | `.ant-collapse` | `<Collapse>` 渲染结果 |
| 时间轴 | `.ant-timeline` | `<Timeline>` 渲染结果 |
| 步骤条 | `.ant-steps` | `<Steps>` 渲染结果 |
| 弹窗容器 | `.ant-modal-wrap` | Modal 弹窗外层容器 |
| 弹窗内容区 | `.ant-modal-body` | Modal 内容区 |
| 抽屉内容区 | `.ant-drawer-body` | Drawer 内容区 |

### 表格内元素

| 元素 | 选择器 | 说明 |
|------|--------|------|
| 状态标签 | `.ant-table-tbody .ant-tag` | 表格内 Tag 组件 |
| 操作列按钮 | `.ant-table-tbody .ant-btn-link` | 链接按钮（操作列） |
| 危险操作按钮 | `.ant-table-tbody .ant-btn-dangerous` | 删除等危险操作 |
| 状态开关 | `.ant-table-tbody .ant-switch` | 行内状态切换开关 |

---

## Vue 3 + Vant（移动端）

| 区域 | 选择器 | 说明 |
|------|--------|------|
| 搜索栏 | `.van-search` | 搜索输入框 |
| 列表 | `.van-list` | 列表容器 |
| 单元格 | `.van-cell` | 列表项 |
| 表单 | `.van-form` | 表单容器 |
| 主色按钮 | `.van-button--primary` | 主操作按钮 |
| 弹出层 | `.van-popup` | 弹出层容器 |
| 动作面板 | `.van-action-sheet` | 底部动作面板 |
| 步骤条 | `.van-steps` | `<van-steps>` 渲染结果 |

---

## 选择器优先级

1. **语义化 class**（`.filter-card`、`.action-bar`、`.btn-add`）— 最稳定，优先使用
2. **UI 库渲染 class**（`.ant-table`、`.el-table`）— 跨项目通用，次优先
3. **属性选择器**（`[placeholder='xxx']`）— 定位特定输入框
4. **组合选择器**（`.ant-table-tbody .ant-tag`）— 定位表格内特定元素
5. **避免**：`:nth-child()`、`:contains()`、动态生成的 class（如 `ant-btn-123456`）

---

## container 字段与弹窗检测

不同框架的弹窗打开信号不同，`AnnotationOverlay` 通过监听 `body` class 变化检测：

| 框架 | 弹窗打开时 body class | 抽屉打开时 |
|------|---------------------|-----------|
| Ant Design Vue / antd | `ant-scrolling-effect` | `ant-scrolling-effect` + `.ant-drawer-open` |
| Element Plus | `el-popup-parent--hidden` | 同左 |
| Vant | 无固定 class，通过 `.van-popup--active` 检测 | - |

> 若项目使用 Element Plus，需在 `AnnotationOverlay.vue` 的 `checkOverlayState` 函数中补充 `el-popup-parent--hidden` 的检测逻辑。
