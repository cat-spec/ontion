# 平台工具映射说明

## 原则

所有 Skills 统一使用 Claude Code 的工具名编写（`Read`、`Write`、`Edit`、`Bash`、`Skill`、`Agent`）。

在非 Claude Code 平台运行时，AI 应自动将工具名映射为当前平台的等效工具。

## 映射表

| 平台 | 映射文件 |
|------|---------|
| Gemini CLI | `gemini-tools.md` |
| Codex | `codex-tools.md` |
| Cursor | 工具名与 Claude Code 基本一致，无需映射 |
| Kiro | 基于 Claude，工具名一致，无需映射 |
| Trae | 工具名与 Claude Code 基本一致，无需映射 |
| OpenCode | 工具名与 Claude Code 基本一致，无需映射 |
| Windsurf | 工具名与 Claude Code 基本一致，无需映射 |

## 何时需要映射

只有 Gemini CLI 和 Codex 的工具名与 Claude Code 有显著差异，需要查阅映射表。其他平台（Cursor、Kiro、Trae、OpenCode、Windsurf）基于相同的底层模型，工具名基本一致。
