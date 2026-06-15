# draw.io 图表模板库

生成图表时，**必须先读取对应类型的模板文件**，以模板结构为骨架替换业务内容。

## 模板索引

### 流程图 `flowchart/`

| 文件 | 适用场景 |
|------|---------|
| `flowchart/basic-flow.xml` | 基本操作流程（开始→步骤→判断→结束） |
| `flowchart/approval-flow.xml` | 多步审批流程（含驳回循环） |

### 泳道图 `swimlane/`

| 文件 | 适用场景 |
|------|---------|
| `swimlane/cross-functional.xml` | 跨部门/跨角色协作流程 |

### 时序图 `sequence/`

| 文件 | 适用场景 |
|------|---------|
| `sequence/system-interaction.xml` | 系统间交互、API 调用链 |

### UML 类图 `class/`

| 文件 | 适用场景 |
|------|---------|
| `class/uml-class.xml` | 数据模型、类继承关系 |

### 组织结构图 `orgchart/`

| 文件 | 适用场景 |
|------|---------|
| `orgchart/org-structure.xml` | 人员架构、部门层级 |

### E-R 图 `er/`

| 文件 | 适用场景 |
|------|---------|
| `er/entity-relationship.xml` | 数据库表关系、实体关系 |

### 系统架构图 `architecture/`

| 文件 | 适用场景 |
|------|---------|
| `architecture/system-arch.xml` | 分层架构（表现层/业务层/数据层） |

### BPMN `bpmn/`

| 文件 | 适用场景 |
|------|---------|
| `bpmn/business-process.xml` | 业务流程建模（含泳道和网关） |

## 渲染方式

```bash
# 使用渲染脚本
.claude/skills/diagram-generator/scripts/render-diagram.sh <源文件.xml> <输出.png>

# 直接调用 API
curl -X POST "https://draw.axuremart.com/api/export" \
  -H "Content-Type: application/json" \
  -d '{"xml":"...","format":"png","scale":2}' \
  --output output.png
```

## 使用规则

1. 根据图表类型找到对应模板
2. 读取模板 XML，理解节点布局和样式
3. 以模板为骨架替换为实际业务内容
4. 保存 XML 源文件到 `docs/images/src/`
5. 渲染为 PNG 保存到 `docs/images/`
6. 在文档中插入 `![描述](docs/images/文件名.png)`
