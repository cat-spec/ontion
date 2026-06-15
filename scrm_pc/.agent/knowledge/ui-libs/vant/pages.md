# Vant 页面规范

## 页面布局原则

```
.page-container（min-height: 100vh; background: #f5f7fa）
  ├── van-nav-bar（顶部导航）
  └── .page-content（padding: 16px）
```

底部有操作栏时，`.page-container` 加 `padding-bottom: 80px`，操作栏 `position: fixed; bottom: 0`。

## 标准列表页结构

```
.list-page
  ├── van-nav-bar
  ├── van-search（可选，搜索栏）
  └── van-pull-refresh
        └── van-list（上拉加载）
              └── .list-item × N（卡片样式：border-radius: 12px; background: #fff; margin: 8px 16px; padding: 16px）
```

## 标准表单页结构

```
.form-page
  ├── van-nav-bar
  └── van-form
        ├── van-cell-group inset
        │     └── van-field × N
        └── .submit-btn（padding: 24px 16px）
              └── van-button round block type="primary"
```

## 标准详情页结构

```
.detail-page（padding-bottom: 80px）
  ├── van-nav-bar
  ├── van-cell-group inset（基本信息）
  │     └── van-cell × N
  └── .bottom-bar（position: fixed; bottom: 0; padding: 12px 16px; background: #fff）
        └── van-button（操作按钮）
```

## Tabbar 页结构

```
.tabbar-page
  ├── .tab-content（padding-bottom: 50px）
  │     └── 各 tab 内容
  └── van-tabbar（fixed）
        └── van-tabbar-item × N
```

## 页面开发流程

1. 创建 `mock/xxx.js`（Mock 数据）
2. 创建 `src/api/xxx.ts`（API 接口）
3. 创建 `src/views/xxx/index.vue`（页面组件）
4. 在 `src/router/index.ts` 添加路由
