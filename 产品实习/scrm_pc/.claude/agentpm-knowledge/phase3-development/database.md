---
updated: 2026-05-19
version: 1.0
scope: phase3-development
description: 数据库设计规范，包含命名规范、索引策略、迁移规范、TypeORM 最佳实践
---
# 数据库规范

## 命名规范

| 对象 | 规范 | 示例 |
|------|------|------|
| 表名 | snake_case，复数 | `registered_users`、`api_tokens` |
| 字段名 | snake_case | `created_at`、`user_id` |
| 索引名 | `idx_表名_字段名` | `idx_users_phone` |
| 外键名 | `fk_表名_关联表名` | `fk_orders_users` |
| 主键 | `id`（自增整数） | `id INT AUTO_INCREMENT` |

## 必备字段（所有表）

```sql
id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
created_at  DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
created_by  INT NULL COMMENT '创建人ID',
updated_by  INT NULL COMMENT '更新人ID'
```

## 索引策略

```sql
-- 高频查询字段必须建索引
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- 复合索引：把区分度高的字段放前面
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- 唯一索引
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

**索引原则：**
- 外键字段必须建索引
- 频繁作为 WHERE 条件的字段建索引
- 单表索引不超过 5 个
- 禁止在低区分度字段（如 status、gender）单独建索引

## TypeORM 规范

### Entity 定义

```typescript
@Entity('users', { comment: '用户表' })
export class User extends BaseEntity {
  @Column({ comment: '手机号', unique: true, length: 20 })
  @Index('idx_users_phone')
  phone: string

  @Column({ comment: '状态：1-启用 0-禁用', default: 1, type: 'tinyint' })
  status: number

  @Column({ comment: '部门ID', nullable: true, type: 'int' })
  deptId?: number
}
```

### 查询规范

```typescript
// 分页查询标准写法
const [list, total] = await repo.findAndCount({
  where: { status: 1, deptId },
  select: ['id', 'name', 'phone', 'status'],
  order: { createdAt: 'DESC' },
  skip: (page - 1) * pageSize,
  take: pageSize,
})

// 禁止不带条件的全表查询
// 错误：await repo.find()
// 正确：await repo.find({ where: { status: 1 }, take: 100 })
```

### 软删除

```typescript
// 推荐用 status 字段标记删除，不物理删除
await repo.update(id, { status: 0, updatedBy: operatorId })

// 查询时过滤已删除
await repo.find({ where: { status: 1 } })
```

## 迁移规范

- 所有表结构变更通过迁移文件管理，不直接修改数据库
- 迁移文件命名：`{timestamp}_{描述}.ts`，如 `1716000000000_add_api_token_table.ts`
- 迁移必须同时提供 `up`（升级）和 `down`（回滚）方法
- 生产环境禁止 `synchronize: true`，只允许开发环境使用

```typescript
export class AddApiTokenTable1716000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'api_token',
      columns: [
        { name: 'id', type: 'int', isPrimary: true, isGenerated: true },
        { name: 'user_id', type: 'int' },
        { name: 'token', type: 'varchar', length: '200', isUnique: true },
        { name: 'expires_at', type: 'datetime', isNullable: true },
        { name: 'status', type: 'tinyint', default: 1 },
        { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
      ]
    }))
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('api_token')
  }
}
```

## 性能规范

### 禁止的操作

```sql
-- 禁止：全表扫描
SELECT * FROM orders WHERE YEAR(created_at) = 2024

-- 正确：使用范围查询，可以走索引
SELECT * FROM orders WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'

-- 禁止：函数包裹索引字段
SELECT * FROM users WHERE LOWER(email) = 'test@example.com'

-- 正确：存储时统一小写
SELECT * FROM users WHERE email = 'test@example.com'
```

### 大数据量处理

```typescript
// 禁止：一次性加载全部数据
const all = await repo.find()  // 可能几十万条

// 正确：分批处理
const batchSize = 1000
let page = 0
while (true) {
  const batch = await repo.find({ skip: page * batchSize, take: batchSize })
  if (batch.length === 0) break
  await processBatch(batch)
  page++
}
```

## 数据库检查清单

- [ ] 所有表有 `id`、`created_at`、`updated_at` 字段
- [ ] 外键字段有索引
- [ ] 无不带 WHERE 条件的全表查询
- [ ] 无 `SELECT *`（生产代码）
- [ ] 事务保证多表操作的一致性
- [ ] 生产环境 `synchronize: false`
- [ ] 表结构变更有迁移文件
