---
updated: 2026-05-19
version: 1.0
scope: phase3-development
description: 后端开发规范，包含 REST API 设计、Repository/Service 模式、数据库优化、缓存、错误处理、认证授权、限流
---
# 后端开发规范

## API 设计规范

### RESTful 路由结构

```typescript
GET    /api/users          // 列表
GET    /api/users/:id      // 单条
POST   /api/users          // 创建
PUT    /api/users/:id      // 全量更新
PATCH  /api/users/:id      // 部分更新
DELETE /api/users/:id      // 删除

// 查询参数用于筛选、排序、分页
GET /api/users?status=active&sort=createdAt&page=1&pageSize=20
```

### 统一响应格式

```typescript
interface ApiResponse<T> {
  code: number
  success: boolean
  message: string
  data?: T
  timestamp: number
}

// 分页响应
interface PageResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}
```

## 分层架构模式

### Repository 模式（数据访问层）

```typescript
interface UserRepository {
  findAll(filters?: UserFilters): Promise<User[]>
  findById(id: number): Promise<User | null>
  create(data: CreateUserDto): Promise<User>
  update(id: number, data: UpdateUserDto): Promise<User>
  delete(id: number): Promise<void>
}
```

### Service 模式（业务逻辑层）

```typescript
class UserService {
  constructor(private userRepo: UserRepository) {}

  async getUserWithPermissions(userId: number) {
    const user = await this.userRepo.findById(userId)
    if (!user) throw new Error('用户不存在')
    // 业务逻辑与数据访问分离
    return this.enrichWithPermissions(user)
  }
}
```

### 中间件模式

```typescript
// 认证中间件
export function withAuth(handler: Handler): Handler {
  return async (ctx) => {
    const token = ctx.headers.authorization?.replace('Bearer ', '')
    if (!token) return ctx.throw(401, '未登录')
    ctx.state.user = await verifyToken(token)
    return handler(ctx)
  }
}
```

## 数据库规范

### 禁止 N+1 查询

```typescript
// 错误：N+1 查询
const users = await getUsers()
for (const user of users) {
  user.dept = await getDept(user.deptId)  // N 次查询
}

// 正确：批量查询
const users = await getUsers()
const deptIds = [...new Set(users.map(u => u.deptId))]
const depts = await getDeptsByIds(deptIds)  // 1 次查询
const deptMap = new Map(depts.map(d => [d.id, d]))
users.forEach(u => { u.dept = deptMap.get(u.deptId) })
```

### 只查需要的字段

```typescript
// 错误
const users = await repo.find()  // SELECT *

// 正确
const users = await repo.find({
  select: ['id', 'name', 'email', 'status']
})
```

### 事务处理

```typescript
await dataSource.transaction(async (manager) => {
  const order = await manager.save(Order, orderData)
  await manager.save(OrderItem, items.map(i => ({ ...i, orderId: order.id })))
  await manager.update(Stock, { id: stockId }, { quantity: () => 'quantity - 1' })
})
```

## 缓存策略

### Redis 缓存模式

```typescript
async function getUserWithCache(id: number): Promise<User> {
  const cacheKey = `user:${id}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const user = await userRepo.findById(id)
  if (!user) throw new Error('用户不存在')

  await redis.setex(cacheKey, 300, JSON.stringify(user))  // 缓存 5 分钟
  return user
}

// 更新时清除缓存
async function updateUser(id: number, data: UpdateUserDto) {
  const user = await userRepo.update(id, data)
  await redis.del(`user:${id}`)
  return user
}
```

## 错误处理

### 统一错误类

```typescript
class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message)
  }
}

// 使用
throw new ApiError(404, '用户不存在')
throw new ApiError(403, '权限不足')
```

### 错误响应不泄露内部信息

```typescript
// 错误：暴露内部细节
catch (error) {
  return { error: error.message, stack: error.stack }
}

// 正确：通用错误消息
catch (error) {
  logger.error('内部错误', error)
  return { code: 500, success: false, message: '服务器内部错误' }
}
```

### 重试机制（指数退避）

```typescript
async function fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000))
    }
  }
}
```

## 认证与授权

### JWT 验证

```typescript
export function verifyToken(token: string): JwtUser {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as JwtUser
  } catch {
    throw new ApiError(401, 'Token 无效或已过期')
  }
}
```

### 基于角色的权限控制

```typescript
const rolePermissions = {
  admin: ['read', 'write', 'delete', 'manage'],
  editor: ['read', 'write'],
  viewer: ['read'],
}

export function hasPermission(role: string, permission: string): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}
```

## 限流

```typescript
// 每个 IP 每分钟最多 100 次请求
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: '请求过于频繁，请稍后再试'
})

// 敏感接口更严格
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: '登录尝试次数过多，请 15 分钟后再试'
})
```

## 结构化日志

```typescript
logger.info('用户登录', { userId: user.id, ip: ctx.ip })
logger.error('数据库查询失败', { error: err.message, query, params })

// 禁止记录敏感信息
// 错误：logger.info('登录', { phone, password })
// 正确：logger.info('登录', { phone })
```

## 后端开发检查清单

- [ ] 所有接口有输入验证（Zod/class-validator）
- [ ] 无 N+1 查询
- [ ] 无 `SELECT *`（只查需要的字段）
- [ ] 事务保证数据一致性
- [ ] 错误消息不泄露内部信息
- [ ] 所有接口有限流
- [ ] 日志不包含密码/Token 等敏感信息
- [ ] 参数化查询，无 SQL 拼接
