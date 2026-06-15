# 项目规范指南

本文件为 page-generator 技能提供项目规范约束，生成代码时必须严格遵守。

---

## 一、第一原则

**只做被要求的事，不自作主张。**

- 需求里没有的字段、交互、样式，一律不加
- 如果认为某个改动有必要，先问用户，不要直接做
- 所有生成的代码必须有注释（组件用途、功能块说明、复杂逻辑解释）
- 优先复用已有公共组件，不重复造轮子

---

## 二、文件目录规范

### 整体结构

```
src/
├── api/              # 接口请求（按模块一个文件）
├── mock/             # Mock 数据（按模块一个文件）
├── router/
│   └── modules/      # 路由模块（按模块一个文件）
├── views/            # 页面
│   └── ModuleName/   # 模块目录（大驼峰）
│       └── Feature/  # 功能目录（大驼峰）
│           ├── index.vue          # 页面主体
│           └── components/        # 页面私有组件（弹窗等）
│               ├── XxxForm.vue
│               └── ImportDialog.vue
└── components/       # 全局公共组件
```

### 命名规则

| 类型 | 命名规则 | 示例 |
|-----|---------|------|
| 模块/功能目录 | 大驼峰 | `Equipment/Archive/` |
| 页面入口 | 固定为 `index.vue` | `index.vue` |
| 页面私有组件 | 大驼峰 + 功能后缀 | `ArchiveForm.vue`、`ImportDialog.vue` |
| api 文件 | 小驼峰 | `equipment.ts` |
| mock 文件 | 小驼峰 | `equipment.js` |
| router 模块 | 小驼峰 | `equipment.ts` |

### 推断方式

读取 `src/views/` 已有目录，观察命名风格后遵循，不要引入新的命名风格。

---

## 三、路由规范

### 文件位置

`src/router/modules/` 下按模块一个文件，新增路由追加到对应模块文件。

### 路由结构

读取已有路由模块文件，观察并遵循：
- `name` 命名规则（大驼峰拼接 / 点分隔）
- `path` 格式（`/module/feature`）
- `meta` 字段（title、icon、auth 等）

### 菜单联动

读取导航/菜单相关文件，确认：
- 菜单是否从路由 meta 自动生成，还是需要手动维护菜单数组
- 新增路由后是否需要同步更新菜单配置

---

## 四、API 文件规范

### 文件位置

`src/api/模块名.ts`，同一模块的所有接口写在一个文件里。

### 写法规范

```ts
import request from '@/utils/request'

/** 获取设备档案列表，支持分页和筛选 */
export const getArchiveList = (params: ArchiveListParams) => {
  return request.get('/equipment/archive/list', { params })
}

/** 新增设备档案 */
export const addArchive = (data: ArchiveForm) => {
  return request.post('/equipment/archive/add', data)
}

/** 编辑设备档案 */
export const updateArchive = (data: ArchiveForm) => {
  return request.put('/equipment/archive/update', data)
}

/** 删除设备档案 */
export const deleteArchive = (id: number) => {
  return request.delete(`/equipment/archive/${id}`)
}
```

### 推断方式

读取已有 api 文件，观察：
- request 封装路径（`@/utils/request` / `@/api/http` 等）
- 响应格式（`{ code, data, message }` / `{ success, data }` 等）
- 是否有统一的类型定义文件

---

## 五、Mock 规范

### 文件位置

`src/mock/模块名.js`，同一模块的所有 mock 接口写在一个文件里。

### 写法规范

```js
// 设备档案 Mock 数据
import Mock from 'mockjs'

// 持久化数据（模块级变量，保证增删改查数据一致）
let archiveList = Mock.mock({ 'list|20': [{ ... }] }).list

export default [
  // GET /equipment/archive/list - 获取列表（支持分页和筛选）
  {
    url: '/equipment/archive/list',
    method: 'get',
    response: ({ query }) => {
      const { page = 1, pageSize = 10, name } = query
      let list = archiveList
      if (name) list = list.filter(item => item.name.includes(name))
      return {
        code: 200,
        data: {
          list: list.slice((page - 1) * pageSize, page * pageSize),
          total: list.length
        }
      }
    }
  },

  // POST /equipment/archive/add - 新增
  {
    url: '/equipment/archive/add',
    method: 'post',
    response: ({ body }) => {
      archiveList.unshift({ id: Date.now(), ...body })
      return { code: 200, message: '新增成功' }
    }
  }
]
```

### 推断方式

读取已有 mock 文件，观察：
- mock 框架（mockjs / vite-plugin-mock 等）
- 响应格式是否与 api 一致
- 数据是否用模块级变量持久化（增删改查数据要保持一致）

---

## 六、页面规范

### 核心原则

**页面主体（筛选、操作栏、表格）写在 index.vue，有独立 open 状态的交互单元封装成组件。**

封装判断标准：**有没有独立的打开/关闭状态？有就封装，没有就留在 index.vue。**

| 留在 index.vue | 封装成独立组件 |
|--------------|-------------|
| 筛选区 | 新增/编辑弹窗 |
| 操作栏（按钮） | 详情查看弹窗 |
| 数据表格 | 导入弹窗 |
| 分页器 | 复杂树形侧边栏 |

### index.vue 结构

```vue
<template>
  <PageContainer>
    <!-- 筛选区 -->
    <a-card class="filter-card">
      <a-form layout="inline">
        <!-- 筛选字段直接写在这里 -->
      </a-form>
    </a-card>

    <!-- 操作栏 -->
    <div class="action-bar">
      <a-button type="primary" @click="handleAdd">新增</a-button>
      <a-button @click="importVisible = true">导入</a-button>
    </div>

    <!-- 表格 -->
    <a-table :columns="columns" :data-source="tableData" :loading="loading">
      <!-- 行操作 -->
    </a-table>

    <!-- 弹窗组件（封装在 components/ 里） -->
    <XxxForm v-model:open="formVisible" :record="editRecord" @success="handleSuccess" />
    <ImportDialog v-model:open="importVisible" @success="fetchList" />
  </PageContainer>
</template>

<script setup lang="ts">
// 页面说明：xxx管理，包含筛选、列表、新增/编辑、导入功能

// 筛选表单数据
// 表格数据和分页
// 弹窗状态
// 获取列表
// 操作处理（新增、编辑、删除、导出）
</script>
```

### 弹窗组件规范

统一用 `v-model:open` 控制显隐，`@success` 通知父组件刷新：

```vue
<script setup lang="ts">
// 组件说明：xxx新增/编辑弹窗
const props = defineProps<{ open: boolean; record?: any }>()
const emit = defineEmits(['update:open', 'success'])

const handleSubmit = async () => {
  // 提交逻辑
  emit('update:open', false)
  emit('success')
}
const handleCancel = () => emit('update:open', false)
</script>
```

### 推断方式

读取已有页面文件，观察：
- 公共布局组件名称（`PageContainer` / `BasicLayout` 等）及用法
- 全局样式 class（`filter-card`、`action-bar` 等）是否已定义
- 已有页面是否有 `components/` 子目录，遵循已有实践
