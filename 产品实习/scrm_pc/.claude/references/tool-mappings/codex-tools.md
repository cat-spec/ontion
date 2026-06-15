# Codex 工具映射

Skills 使用 Claude Code 工具名编写。在 Codex 中，按以下映射使用对应工具：

| Skill 中的工具名 | Codex 等效工具 |
|-----------------|---------------|
| `Read`、`Write`、`Edit`（文件操作） | 使用原生文件工具 |
| `Bash`（执行命令） | 使用原生 shell 工具 |
| `Agent/Task`（派发子 Agent） | `spawn_agent` |
| `TodoWrite`（任务追踪） | `update_plan` |
| `Skill`（调用技能） | Skills 原生加载，直接遵循指令 |

## 子 Agent 调度

需要在 Codex 配置中启用多 Agent 支持：

```toml
# ~/.codex/config.toml
[features]
multi_agent = true
```

派发子 Agent：
- `spawn_agent` — 创建子 Agent
- `wait_agent` — 等待子 Agent 完成
- `close_agent` — 释放子 Agent 槽位

## 并行调度

当 skill 要求并行派发多个独立任务时，同时调用多个 `spawn_agent`，不要串行等待。
