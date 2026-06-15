# 图表示例库

生成图表时，**必须先查阅对应类型的示例文件**，严格按照示例的结构、颜色、格式生成，不得自由发挥。

## 示例文件索引

### 活动图（D2 + ELK）— 用于「用户操作流程」

| 文件 | 适用场景 | 来源 |
|------|---------|------|
| `activity/basic-crud.d2` | 列表页新增/编辑/删除操作流程（最常用） | 通用模板 |
| `activity/approval-flow.d2` | 需要审批的业务流程（工单、申请等） | 通用模板 |
| `activity/search-filter.d2` | 列表页筛选/搜索/重置/分页操作 | 通用模板 |
| `activity/issue-ledger-activity.d2` | 问题台账查询流程（真实案例） | ⭐ 项目实例 |
| `activity/login-flow.d2` | 登录流程（含失败重试和账号锁定） | ⭐ 项目实例 |

**渲染命令：**
```bash
d2 -l elk input.d2 output.png
```

**颜色规范（必须遵守）：**
- 开始/结束：`shape: oval` + `style.fill: "#e8f5e9"`
- 普通步骤：`shape: rectangle` + `style.fill: "#e3f2fd"`
- 判断节点：`shape: diamond` + `style.fill: "#fff3e0"`
- 成功结果：`style.fill: "#d5e8d4"`
- 失败/错误：`style.fill: "#fce4ec"`

**禁止词汇（活动图中不能出现）：**
调用接口、API请求、数据库查询、前端处理、后端处理、返回数据、响应结果

---

### 时序图（PlantUML）— 用于「系统交互时序」

| 文件 | 适用场景 | 来源 |
|------|---------|------|
| `sequence/basic-crud.puml` | 标准增删改查的前后端交互（最常用） | 通用模板 |
| `sequence/approval-flow.puml` | 多角色审批流程的交互时序 | 通用模板 |
| `sequence/file-upload.puml` | 文件上传、Excel批量导入场景 | 通用模板 |
| `sequence/issue-ledger-sequence.puml` | 问题台账查询时序（真实案例） | ⭐ 项目实例 |

**渲染命令：**
```bash
python3 scripts/render_diagram.py --type plantuml --file input.puml --output output.png
```

**必须包含的文件头：**
```
skinparam backgroundColor #FFFFFF
skinparam sequenceMessageAlign center
```

**参与者固定格式：**
```
actor 用户
participant "[功能名]页面" as Frontend
participant "后端服务" as Backend
database "数据库" as DB
```

**分组格式：**
```
== 查看列表流程 ==
== 新增流程 ==
== 编辑流程 ==
== 删除流程 ==
```

---

### 泳道图（D2）— 用于「多角色业务协作流程」

| 文件 | 适用场景 |
|------|---------|
| `swimlane/multi-role-swimlane.d2` | 多角色协作的业务流程（巡检、审批、工单等） |

**渲染命令：**
```bash
d2 -l elk input.d2 output.png
```

---

### 架构图（D2）— 用于「总体功能架构」

| 文件 | 适用场景 | 来源 |
|------|---------|------|
| `architecture/menu-structure.d2` | 需求说明书 3.1 系统菜单功能架构图（最常用） | 通用模板 |
| `architecture/web-admin-architecture.d2` | 系统技术架构图（前后端+数据层） | 通用模板 |
| `architecture/system-architecture-real.d2` | 系统功能架构（真实案例，分组容器） | ⭐ 项目实例 |
| `architecture/risk-calc-flow.d2` | 复杂业务计算流程（分层架构） | ⭐ 项目实例 |

**渲染命令：**
```bash
d2 -l elk input.d2 output.png
```

---

## 生成图表的标准流程

1. 根据图表类型，找到对应示例文件
2. 读取示例文件，理解结构和颜色规范
3. 按照示例结构，替换为实际业务内容
4. 将 `.d2` 或 `.puml` 源文件保存到 `docs/images/src/` 目录
5. 渲染为 PNG，保存到 `docs/images/` 目录
6. 在 Markdown 文档中插入：`![](images/文件名.png)`

## 参考真实项目示例

项目中已有高质量的参考文件（⭐ 标记的示例）：
- `activity/issue-ledger-activity.d2` — 问题台账查询流程，包含筛选/重置/详情等多分支
- `activity/login-flow.d2` — 登录流程，包含失败重试和账号锁定逻辑
- `sequence/issue-ledger-sequence.puml` — 问题台账时序图，标准的4参与者交互
- `architecture/system-architecture-real.d2` — 系统功能架构，使用分组容器展示层级
- `architecture/risk-calc-flow.d2` — 复杂业务计算流程，分层架构（采集→计算→判定→展示）

**优先参考真实案例**：生成图表时，优先参考带 ⭐ 标记的项目实例，它们更贴近实际业务场景。
