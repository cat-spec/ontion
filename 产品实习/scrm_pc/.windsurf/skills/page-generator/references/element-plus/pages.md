# Element Plus 页面规范

## 页面布局原则

```
.page-container（height: 100%; display: flex; flex-direction: column; gap: 16px）
  ├── el-card.filter-card（筛选区，border: none; box-shadow: none; border-radius: 12px）
  └── el-card.table-card（数据区，flex: 1; overflow: hidden）
```

## 标准列表页结构

```
筛选卡片
  └── .filter-form（display: flex; flex-wrap: wrap; gap: 16px）
        ├── el-input（文本搜索，width: 200px）
        ├── el-select（状态/类型，width: 150px）
        └── el-button type="primary"（搜索）

数据卡片
  ├── .table-header（margin-bottom: 16px）
  │     └── el-button type="primary"（新增）
  ├── .table-container（flex: 1; overflow: hidden）
  │     └── el-table（height="100%"）
  └── .pagination-container（margin-top: 16px; justify-content: flex-end）
        └── el-pagination
```

## 二级页面结构（详情/编辑）

```
.page-container
  ├── el-card.breadcrumb-card（面包屑 + 操作按钮）
  └── el-scrollbar.content-scrollbar（flex: 1; overflow: hidden）
        └── 可滚动内容
```

## 左右分栏结构

```
.page-container
  └── .split-layout（display: flex; gap: 16px; flex: 1; overflow: hidden）
        ├── el-card.left-card（width: 280px; overflow: hidden）
        └── el-card.right-card（flex: 1; overflow: hidden）
```

## 页面开发流程

1. 创建 `src/types/xxx.ts`（类型定义）
2. 创建 Mock 函数（手动 Mock 模式）
3. 创建 `src/api/xxx.ts`（API 接口，判断 `USE_MOCK`）
4. 创建 `src/views/xxx/index.vue`（页面组件）
5. 创建 `src/router/modules/xxx.ts`（路由）
6. 在 `src/router/index.ts` 注册路由
7. 在 `src/locales/zh.json` 和 `en.json` 添加菜单翻译
8. 运行 `pnpm build` 验证无报错
