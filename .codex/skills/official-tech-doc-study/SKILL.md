---
name: official-tech-doc-study
description: Use when the user wants to learn a specific technology, framework, library, tool, API, or language by having the agent read official documentation and produce a detailed technical study document. Trigger on requests like "我想学习 X 技术", "学习 X 官方文档", "精读 X 文档", "输出 X 的详细代码用法", "按章节整理 X API", "给我 X 的常考题和小案例", or similar. The output must be based primarily on official docs, include detailed code/API usage item by item, and end each major section with practice questions and small examples.
---

# Official Tech Doc Study

## Overview

Create a detailed technical learning document by reading official documentation, not by inventing a generic roadmap. The document should teach the technology's real code usage: APIs, configuration fields, commands, options, lifecycle hooks, patterns, constraints, edge cases, questions, and small cases.

Use current official sources whenever the technology is version-sensitive. Prefer official docs, official guides, official API references, official GitHub repositories, and official release notes. Clearly mark any non-official source as supplementary.

## Workflow

1. Identify the technology name, target version if provided, output path, and learner level if provided.
2. Find official documentation entry points. If the user did not provide official links, browse and locate them.
3. Build a chapter map from the official docs. Use the official docs' structure when it is usable; otherwise group by practical usage areas.
4. For each chapter, extract code-relevant items one by one: APIs, methods, functions, classes, components, directives, hooks, commands, options, config fields, CLI flags, file conventions, lifecycle rules, and error handling.
5. Write a markdown document to the requested path when a path is provided. If no path is provided, output the document directly or choose a reasonable file name in the current workspace if the user asked for a file.
6. Include source links in the document for major sections. For current or changing facts, include the access date.

## Required Output Structure

Use this structure unless the user provides a stricter format:

```markdown
# [Technology] 官方文档精读与代码用法

> 资料来源：
> - [Official doc name](official URL)
> - [Official API reference](official URL)
> 
> 目标版本：
> 适合人群：
> 输出时间：

## 1. 技术定位与核心模型

解释这项技术解决什么问题、核心架构、核心对象、运行机制。

## 2. 环境与最小可运行示例

给出安装命令、项目结构、最小代码、运行命令、预期输出。

## 3. 官方章节精读

### 3.x [官方章节名或主题名]

#### 3.x.1 作用

说明该章节/API/配置项解决什么问题。

#### 3.x.2 代码用法逐条说明

| 项目 | 类型 | 作用 | 基本写法 | 参数/选项 | 返回值/结果 | 注意事项 |
| --- | --- | --- | --- | --- | --- | --- |

#### 3.x.3 可运行代码示例

Provide complete examples, not isolated fragments, whenever possible.

#### 3.x.4 常见错误与排查

Explain wrong usage, error symptoms, root cause, and fix.

#### 3.x.5 常考题

Include 5-10 questions for the chapter. Mix concept questions, code reading, API usage, and troubleshooting.

#### 3.x.6 小案例

Include 1-3 small practical cases. Each case should contain goal, steps, code, expected behavior, and extension task.

## 4. 高频 API / 配置速查表

Group by category. Include exact usage and constraints.

## 5. 综合小项目

Provide one realistic mini project that combines the important chapters.

## 6. 复习题总表

Group questions by difficulty: basic, intermediate, advanced.

## 7. 学习检查清单

List concrete abilities the learner should now have.
```

## Code Usage Requirements

For each important API, config field, command, or syntax item, include:

- What it does.
- When to use it.
- Minimal syntax.
- Parameters or options.
- Return value, output, or side effect.
- A runnable or near-runnable example.
- Common mistakes.
- Related APIs.

Do not stop at high-level explanation. The primary value of the output is detailed operational usage.

## Official Source Rules

- Browse official docs for current technologies, libraries, frameworks, APIs, or version-sensitive tools.
- Prefer official documentation domains and official GitHub repositories.
- If official docs are incomplete, use reputable supplementary sources only after noting that they are supplementary.
- Do not fabricate APIs, version numbers, release dates, or official recommendations.
- When uncertain, say what was verified and what remains uncertain.

## Question And Case Rules

Each major chapter should include both questions and cases:

- Basic questions test definitions, purpose, and syntax.
- Intermediate questions test parameter choices, code reading, and usage scenarios.
- Advanced questions test edge cases, architecture, performance, security, or debugging.
- Small cases must be implementable in a short session and must include code.
- Include expected answers or answer hints unless the user asks for questions only.

## Output Style

- Write in Chinese when the user asks in Chinese, unless requested otherwise.
- Use precise technical wording.
- Prefer tables for API/config reference.
- Prefer complete code blocks for examples.
- Keep roadmap content brief; spend most of the document on code usage and official-doc details.
- Include local file links in the final response when a file is created.
