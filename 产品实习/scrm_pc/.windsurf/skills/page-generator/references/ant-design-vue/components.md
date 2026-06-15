# Ant Design Vue 组件规范

适用于使用 `ant-design-vue` 的项目（Vue 3 + TypeScript）。

## 基础约定

- 组件前缀 `a-`，已全局注册，无需单独 import
- 图标从 `@ant-design/icons-vue` 按需导入
- 消息提示：`import { message } from 'ant-design-vue'`
- 表单 label 右对齐已由全局样式处理，**不要**加 `label-align="right"`
- Modal 弹窗已全局垂直居中，**不要**加 `centered` 属性

## 卡片

```vue
<a-card class="filter-card">  <!-- 筛选区，margin-bottom: 16px -->
<a-card class="table-card">   <!-- 数据区，flex: 1 撑满高度 -->
```

全局样式已覆盖：`.ant-card .ant-card-body { padding: 16px }`，无需单独设置。

## 表格

**必须规则：**
- 设置 `:scroll="{ x: 'max-content' }"` 让浏览器根据列宽自动计算横向滚动，不要手动写死数字
- 操作列必须 `fixed: 'right' as const`（树形表格除外）
- 列宽要足够，避免标题换行

```typescript
const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90, align: 'center' as const },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '操作', key: 'action', width: 160, fixed: 'right' as const }
]
```

分页配置：
```typescript
const pagination = reactive({
  current: 1, pageSize: 10, total: 0,
  showSizeChanger: true, showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`
})
```

## 状态列

状态列用标签展示，**不要用 switch**（switch 只用于行内直接切换操作）：
```vue
<!-- 状态标签（只展示） -->
<a-tag :color="record.status === 1 ? 'success' : 'default'">
  {{ record.status === 1 ? '启用' : '停用' }}
</a-tag>

<!-- 状态开关（可直接切换） -->
<a-switch
  :checked="record.status === 1"
  @change="(val: boolean) => handleStatusChange(record, val)"
/>
```

**注意**：switch 不要加 `checked-children`/`un-checked-children`，保持默认样式。

## 操作列按钮

```vue
<a-space>
  <a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>
  <a-popconfirm title="确定要删除吗？" ok-text="确定" cancel-text="取消" @confirm="handleDelete(record)">
    <a-button type="link" size="small" danger>删除</a-button>
  </a-popconfirm>
</a-space>
```

## 操作栏（action-bar）

```vue
<div class="action-bar">
  <a-space>
    <a-button type="primary" @click="handleAdd">
      <template #icon><PlusOutlined /></template>
      新增
    </a-button>
  </a-space>
  <div></div>  <!-- 右侧占位，保持 space-between 布局 -->
</div>
```

**只保留必要按钮**，不要加导入、导出、刷新、设置、全屏等无实际功能的按钮。

## 筛选区

```vue
<a-card class="filter-card">
  <a-space>
    <a-input v-model:value="filterForm.name" placeholder="名称" allow-clear style="width: 200px" />
    <a-select v-model:value="filterForm.status" placeholder="状态" allow-clear style="width: 140px">
      <a-select-option :value="1">启用</a-select-option>
      <a-select-option :value="0">停用</a-select-option>
    </a-select>
    <a-button type="primary" @click="handleSearch">
      <template #icon><SearchOutlined /></template>
      搜索
    </a-button>
  </a-space>
</a-card>
```

## 表单弹窗

```vue
<a-modal v-model:open="dialogVisible" :title="dialogTitle" width="500px"
  :confirm-loading="submitLoading" @ok="handleSubmit" @cancel="resetForm">
  <a-form ref="formRef" :model="form" :rules="formRules"
    :label-col="{ span: 5 }" :wrapper-col="{ span: 17 }" style="margin-top: 16px">
    <a-form-item label="名称" name="name">
      <a-input v-model:value="form.name" placeholder="请输入名称" />
    </a-form-item>
  </a-form>
</a-modal>
```

**注意**：
- `label-col` 和 `wrapper-col` 必须用 `:` 绑定（对象），不能写成字符串
- 不要加 `label-align="right"`（全局已处理）

## 树形表格（菜单/部门等）

```vue
<a-table
  :pagination="false"
  :default-expand-all-rows="isExpanded"
  :key="tableKey"
  :row-expandable="(record) => !!record.children && record.children.length > 0"
  size="middle"
>
```

- 不分页，用 `:key="tableKey"` 控制展开/折叠刷新
- 必须加 `row-expandable`，无子节点不显示展开图标
- 数据加载后需清理空 children：`children: [] → undefined`
- **树形表格不要设置 `scroll.x` 和操作列 `fixed:right`**，否则分类名称列会被挤压消失

## 左右分栏页（人员管理等）

```vue
<div class="user-management">  <!-- display: flex; gap: 16px; height: 100% -->
  <a-card class="dept-tree-card">  <!-- width: 220px; height: 100% -->
    <a-tree ... />
  </a-card>
  <div class="user-list-container">  <!-- flex: 1; display: flex; flex-direction: column -->
    <a-card class="filter-card">...</a-card>
    <a-card class="table-card">...</a-card>
  </div>
</div>
```

树组件异步数据时，`default-expand-all` 不生效，需要数据加载后手动设置 `expandedKeys`。
