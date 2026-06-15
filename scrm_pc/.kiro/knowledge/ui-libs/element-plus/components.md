# Element Plus 组件规范

适用于使用 `element-plus` 的项目（Vue 3 + TypeScript）。

## 基础约定

- 组件自动导入，无需手动 import
- Vue API（ref、reactive 等）自动导入
- 使用 `defineOptions({ name: 'XxxPage' })`
- 消息：`ElMessage.success/error`，确认：`ElMessageBox.confirm`

## 表格

- 无边框：不加 `border` 属性
- 表头固定：`height="100%"`，容器设 `flex: 1; overflow: hidden`
- 操作列：`fixed="right"`，`width="200"`
- 操作按钮：`link` 类型，不加 `size`

```vue
<el-table-column label="操作" width="200" fixed="right">
  <template #default="{ row }">
    <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
    <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
  </template>
</el-table-column>
```

状态列用 `el-switch`：
```vue
<el-switch v-model="row.status" :active-value="1" :inactive-value="0" @change="handleStatusChange(row)" />
```

分页：
```vue
<el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize"
  :total="pagination.total" :page-sizes="[10, 20, 50, 100]"
  layout="total, sizes, prev, pager, next, jumper"
  @size-change="fetchList" @current-change="fetchList" />
```

## 表单

```vue
<el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
  <el-form-item label="名称" prop="name">
    <el-input v-model="form.name" placeholder="请输入名称" />
  </el-form-item>
</el-form>
```

对话框：
```vue
<el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" @closed="resetForm">
  <!-- 表单 -->
  <template #footer>
    <el-button @click="dialogVisible = false">取消</el-button>
    <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
  </template>
</el-dialog>
```

## 按钮规范

- 主操作（卡片头部）：`type="primary"`，可加 `:icon="Plus"`
- 表格操作列：`link` 类型，不加 `size`，不加自定义样式
- 删除确认：`ElMessageBox.confirm`

## 滚动区域

需要滚动的内容必须用 `el-scrollbar`，不用原生 `overflow-y: auto`：
```vue
<el-scrollbar class="content-scrollbar">内容</el-scrollbar>
```
```scss
.content-scrollbar { flex: 1; overflow: hidden; :deep(.el-scrollbar__view) { padding-bottom: 20px; } }
```

## Mock 数据

Mock 方式因项目而异，读取已有 api 文件推断：
- 若有 `VITE_USE_MOCK` 环境变量判断，按项目约定的 mock 函数调用方式
- 若使用 vite-plugin-mock，直接在 `mock/` 目录下创建 `.js` 文件
- 若无 mock，直接调用真实接口

API 请求方法：`request.get()`、`request.post()`、`request.put()`、`request.del()`，不用 `request()` 直接调用。

## 国际化

- 页面内容直接用中文，不用 `$t()`
- 路由 `meta.title` 是否需要翻译键，以及翻译文件路径，读取已有路由文件推断
