# Ant Design Vue 页面规范

## 页面布局原则

所有页面用 `PageContainer` 包裹，内部按需组合卡片：

```
PageContainer
  ├── a-card.filter-card    筛选区（有筛选条件时）
  └── a-card.table-card     数据区（表格/内容）
```

样式：
```css
.filter-card { margin-bottom: 16px; border-radius: 8px; }
.table-card { border-radius: 8px; }
.action-bar { display: flex; justify-content: space-between; margin-bottom: 12px; }
```

## 标准列表页结构

```
筛选卡片
  └── a-space（筛选条件横排）
        ├── a-input（文本搜索，width: 200px）
        ├── a-select（状态/类型筛选，width: 140px）
        └── a-button type="primary"（搜索）

数据卡片
  ├── action-bar（操作栏）
  │     ├── 左侧：新增、导入等主操作
  │     └── 右侧：导出、刷新、设置、全屏等工具按钮
  └── a-table（表格，含分页）
```

## 树形表格页结构（菜单/部门）

```
筛选卡片（可选）

数据卡片
  ├── action-bar
  │     ├── 左侧：新增、展开/折叠
  │     └── 右侧：导出等
  └── a-table（树形，不分页）
```

## 弹窗表单结构

```
a-modal（width: 500px，标准 CRUD 弹窗）
  └── a-form（label-col span:5，wrapper-col span:17）
        ├── 必填字段（name 属性 + formRules 校验）
        └── 可选字段
```

## 左右分栏页结构（人员管理等）

```
.user-management（display: flex; gap: 16px）
  ├── a-card.dept-tree-card（width: 260px，部门树）
  └── .user-list-container（flex: 1）
        ├── a-card.filter-card
        └── a-card.table-card
```

## 页面开发流程

1. 创建 `mock/xxx.js`（Mock 数据）
2. 创建 `src/api/xxx.ts`（API 接口）
3. 创建 `src/views/Xxx/index.vue`（页面组件）
4. 创建 `src/router/modules/xxx.ts`（路由）
5. 在 `src/router/index.ts` 注册路由
6. 在 `AppSidebar` 添加菜单项
