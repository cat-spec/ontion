# Gemini CLI 工具映射

Skills 使用 Claude Code 工具名编写。在 Gemini CLI 中，按以下映射使用对应工具：

| Skill 中的工具名 | Gemini CLI 等效工具 |
|-----------------|-------------------|
| `Read`（读取文件） | `read_file` |
| `Write`（创建文件） | `write_file` |
| `Edit`（编辑文件） | `replace` |
| `Bash`（执行命令） | `run_shell_command` |
| `Grep`（搜索内容） | `grep_search` |
| `Glob`（搜索文件名） | `glob` |
| `Skill`（调用技能） | `activate_skill` |
| `Agent/Task`（派发子 Agent） | `@generalist` |
| `WebSearch` | `google_web_search` |
| `WebFetch` | `web_fetch` |
| `TodoWrite`（任务追踪） | `write_todos` |

## 子 Agent 调度

当 skill 要求派发子 Agent 时，使用 `@generalist` 并传入完整 prompt：

```
@generalist 审查以下代码的安全性...
```

## 并行调度

Gemini CLI 支持并行子 Agent。当 skill 要求并行派发多个独立任务时，在同一条消息中请求所有 `@generalist` 任务。
