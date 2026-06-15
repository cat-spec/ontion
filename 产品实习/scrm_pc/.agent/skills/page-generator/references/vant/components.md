# Vant 组件规范

适用于使用 `vant` 的移动端 H5 项目（Vue 3 + TypeScript）。

## 基础约定

- Vant 组件按需引入
- 消息提示：`showSuccessToast`、`showFailToast`（从 vant 导入）
- 确认弹窗：`showConfirmDialog`

## 导航栏

```vue
<van-nav-bar title="页面标题" left-arrow @click-left="router.back()" />
```

## 列表（下拉刷新 + 上拉加载）

```vue
<van-pull-refresh v-model="refreshing" @refresh="onRefresh">
  <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
    <!-- 列表项 -->
  </van-list>
</van-pull-refresh>
```

## 表单

```vue
<van-form ref="formRef" @submit="handleSubmit">
  <van-cell-group inset>
    <van-field v-model="form.name" name="name" label="名称" placeholder="请输入"
      :rules="[{ required: true, message: '请输入名称' }]" />
    <van-field v-model="form.desc" name="desc" label="备注" type="textarea" rows="3" autosize />
  </van-cell-group>
  <div style="padding: 24px 16px">
    <van-button round block type="primary" native-type="submit" :loading="submitting">提交</van-button>
  </div>
</van-form>
```

## 状态标签

```vue
<van-tag type="success">启用</van-tag>
<van-tag type="default">禁用</van-tag>
<van-tag type="warning">待处理</van-tag>
<van-tag type="danger">已拒绝</van-tag>
```

## 空状态

```vue
<van-empty description="暂无数据" />
```

## 确认删除

```typescript
await showConfirmDialog({ title: '提示', message: '确定要删除吗？' })
```

## 颜色和间距

```css
--color-primary: #1989fa;
--color-success: #07c160;
--color-warning: #ff976a;
--color-danger: #ee0a24;
--color-bg: #f5f7fa;
--spacing-md: 16px;
```
