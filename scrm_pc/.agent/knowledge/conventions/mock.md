# Mock 数据通用规范

## 核心原则：数据必须持久化

不管用什么 mock 框架，**数据变量必须在模块/文件顶层声明**，不能写在 handler 函数内部。

**错误写法**（每次请求都重置，增删改不生效）：
```javascript
// ❌ 每次请求都重新创建 list，删除后刷新数据还在
response: () => {
  let list = [{ id: 1, name: '管理员' }]
  return { data: list }
}
```

**正确写法**（模块级变量，操作真实生效）：
```javascript
// ✅ list 在顶层，增删改直接操作
let list = [{ id: 1, name: '管理员' }]

response: () => {
  return { data: list }
}
```

## 标准 CRUD 模板

```javascript
let list = [
  { id: 1, name: '示例数据', status: 1, createTime: '2025-07-20 09:00' }
]

// 列表（分页+筛选）
// GET /api/xxx/list?page=1&pageSize=10&name=xxx
response: ({ query }) => {
  const { page = 1, pageSize = 10, name, status } = query
  let filtered = [...list]
  if (name) filtered = filtered.filter(item => item.name.includes(name))
  if (status !== undefined && status !== '') filtered = filtered.filter(item => item.status === Number(status))
  const total = filtered.length
  const start = (Number(page) - 1) * Number(pageSize)
  return {
    code: 200, message: '获取成功',
    data: { list: filtered.slice(start, start + Number(pageSize)), total, page: Number(page), pageSize: Number(pageSize) }
  }
}

// 新增 POST /api/xxx/add
response: ({ body }) => {
  const item = { id: Date.now(), ...body, createTime: new Date().toLocaleString('zh-CN', { hour12: false }) }
  list.push(item)
  return { code: 200, message: '新增成功', data: item }
}

// 更新 PUT /api/xxx/update
response: ({ body }) => {
  const idx = list.findIndex(item => item.id === body.id)
  if (idx > -1) list[idx] = { ...list[idx], ...body }
  return { code: 200, message: '更新成功', data: null }
}

// 删除 DELETE /api/xxx/delete?id=1
response: ({ query }) => {
  list = list.filter(item => item.id !== Number(query.id))
  return { code: 200, message: '删除成功', data: null }
}

// 状态切换 PUT /api/xxx/status
response: ({ body }) => {
  const idx = list.findIndex(item => item.id === body.id)
  if (idx > -1) list[idx].status = body.status
  return { code: 200, message: '状态更新成功', data: null }
}
```

## 树形数据模板

```javascript
let tree = [
  { id: 1, name: '根节点', parentId: null, children: [
    { id: 2, name: '子节点', parentId: 1, children: [] }
  ]}
]

const findNode = (list, id) => {
  for (const node of list) {
    if (node.id === id) return node
    if (node.children) { const found = findNode(node.children, id); if (found) return found }
  }
  return null
}

const removeNode = (list, id) => {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) { list.splice(i, 1); return true }
    if (list[i].children && removeNode(list[i].children, id)) return true
  }
  return false
}
```

## 业务阻断删除

```javascript
// 删除前检查关联关系，阻止删除并返回具体提示
response: ({ query }) => {
  const id = Number(query.id)
  const item = list.find(i => i.id === id)
  if (item?.relatedName) {
    return { code: 400, message: `该记录已与【${item.relatedName}】关联，请先解除绑定`, data: null }
  }
  list = list.filter(i => i.id !== id)
  return { code: 200, message: '删除成功', data: null }
}
```

## 通用注意事项

- query / params 参数都是字符串，数字比较需要显式转换：`Number(query.id)`
- 时间格式建议：`new Date().toLocaleString('zh-CN', { hour12: false })`
- 初始数据用真实业务数据，不要用"测试数据1"这种占位符
- 响应格式与项目实际 API 保持一致（读已有 mock 文件确认格式）
