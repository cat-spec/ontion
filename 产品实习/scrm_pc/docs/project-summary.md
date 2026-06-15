# NexsCRM SCRM PC 项目总结

生成日期：2026-06-11

## 1. 项目定位

本项目是一个面向多平台客服会话聚合的 PC 工作台，当前形态为 **Vue Web 前端 + Electron 桌面容器**。

核心目标：

- 在同一个工作台内聚合多个社媒/聊天平台入口，例如抖音、WhatsApp、Telegram、Line、Instagram、Messenger、Facebook、X、Zalo。
- 桌面端通过 Electron `WebContentsView` 承载第三方平台网页，保留平台登录态，并在主界面中展示平台容器。
- 前端提供会话区、平台切换、首页工作台、设置中心、快捷回复、关键词回复、欢迎语回复、右侧工具栏等静态/半静态业务界面。
- 抖音方向已具备 DOM 消息捕获 MVP 结构，后续可扩展到更多平台。

当前项目仍处于原型和 MVP 混合阶段：大量业务页面已经具备交互外壳和静态数据，但后端接口、权限、持久化配置、真实自动回复执行链路还没有完整接入。

## 2. 技术栈

前端：

- Vue 3.5
- TypeScript
- Vite 8
- Pinia
- Vue Router
- Element Plus
- Tailwind CSS 4

桌面端：

- Electron 37
- Electron 主进程管理窗口、平台容器和 IPC
- `WebContentsView` 承载第三方平台网页
- 平台专属 preload 脚本捕获页面状态和消息 DOM

构建与开发：

- `npm run dev`：启动普通 Web 开发环境
- `npm run dev:desktop`：同时启动 Vite、Electron 构建监听和 Electron 桌面端
- `npm run build`：执行 `vue-tsc -b` 和 Vite 前端构建
- `npm run build:electron`：构建 Electron 主进程与 preload
- `npm run build:desktop`：构建 Web 与 Electron
- `npm run test`：运行 Vitest

## 3. Web 端与桌面端为什么展示不同

项目同时支持 Web 运行和 Electron 桌面运行，但能力不同。

Web 端：

- 只运行 Vue renderer。
- `src/platform/runtime.ts` 会返回 `noopBridge`。
- `noopBridge.isDesktop = false`，不会真正创建平台网页容器。
- 因此依赖 Electron 容器的功能不会完整展示，例如真实 Web 容器、右侧容器工具栏、平台登录态监听等。

桌面端：

- Vue renderer 仍然负责主界面。
- Electron 主进程负责创建主窗口和第三方平台 `WebContentsView`。
- `electron/preload.ts` 通过 `contextBridge` 暴露 `window.electronPlatform`。
- 前端通过 `getPlatformBridge()` 调用 Electron IPC。
- 主进程创建/附着/隐藏/销毁平台容器，并把状态与消息捕获事件广播回前端 store。

因此，同一个页面在 Web 和桌面端表现不同是预期行为：Web 端是降级预览，桌面端才具备真实平台容器能力。

## 4. 目录职责

### 根目录

- `package.json`：项目依赖、开发脚本、构建脚本。
- `vite.config.ts`：Vite 构建配置。
- `README.md`：目前仍是 Vue/Vite 模板说明，未更新为业务项目说明。
- `docs/`：项目文档，目前包含抖音 DOM 捕获相关文档和本文档。
- `dist/`：前端构建产物。
- `electron-dist/`：Electron 构建产物。
- `scripts/build-electron.mjs`：Electron 主进程/preload 构建脚本。

### `src/`

- `src/main.ts`：Vue 应用入口。
- `src/App.vue`：应用根组件。
- `src/router/index.ts`：Vue Router 路由配置。
- `src/style.css`：全局样式和 Tailwind 入口。
- `src/mock/index.ts`：Mock 数据入口。
- `src/electron.d.ts`：Electron 注入 API 的类型声明。

### `src/components/client/`

这是当前业务工作台的核心目录。

- `ClientShell.vue`：PC 客户端主布局，决定展示首页、设置、快捷回复、功能应用或平台容器工作区。
- `TopStatusBar.vue`：顶部状态栏。
- `PlatformRail.vue`：最左侧平台栏，包含项目图标、首页、平台列表、功能应用、设置、退出。
- `WorkspaceHome.vue`：首页工作台，包含消息列表、快捷入口、广告/信息区域等。
- `ConversationPanel.vue`：平台会话列表和创建会话区域。
- `ContainerWorkspace.vue`：平台容器工作区，包含容器宿主区域和右侧工具栏。
- `BrowserContainerHost.vue`：WebContentsView 容器在 Vue DOM 中的宿主区域，负责上报 bounds。
- `ContainerStatusBar.vue`：容器状态栏。
- `ToolPanel.vue`：工具面板组件。
- `SettingsView.vue`：系统设置中心。
- `QuickReplyView.vue`：快捷回复页面。
- `FeatureAppsView.vue`：功能应用页面，目前承载关键词回复、欢迎语回复。
- `quick-reply-logic.ts`：快捷回复相关逻辑。
- `feature-apps-logic.ts`：功能应用相关逻辑。
- `CaptureTimelinePanel.vue`：消息捕获时间线面板。

### `src/stores/`

- `client.ts`：客户端工作台核心状态。管理平台、工具页、设置页、会话、容器状态、消息捕获事件。
- `app.ts`：通用应用状态。
- `auth.ts`：认证相关状态。

### `src/platform/`

该目录是前端与 Electron 平台容器能力之间的抽象层。

- `contracts.ts`：平台 ID、会话记录、运行状态、捕获事件、桥接 API 等 TypeScript 类型。
- `runtime.ts`：获取平台桥接对象。桌面端使用 `window.electronPlatform`，Web 端使用 `noopBridge`。
- `ipc.ts`：Electron IPC channel 常量。
- `session.ts`：平台会话草稿构造逻辑。
- `catalog.ts`：平台目录/入口相关信息。

### `electron/`

桌面端核心目录。

- `main.ts`：Electron 主进程入口。创建主窗口，管理 `WebContentsView`，处理 IPC，广播容器状态和捕获事件。
- `preload.ts`：注入到 Vue renderer 主窗口的 preload，暴露受控的 `window.electronPlatform` API。
- `platform-adapters/`：平台适配器。负责平台 URL 白名单、preload 入口、原始事件标准化。
- `platform-preload/`：注入第三方平台页面的 preload 脚本，用于监听页面 DOM、登录态和消息变化。

## 5. 核心运行链路

### 页面切换链路

主入口是 `ClientShell.vue`。

当前展示逻辑：

- `activeUtilityId === 'settings'`：展示 `SettingsView`
- `activeUtilityId === 'quick-reply'`：展示 `QuickReplyView`
- `activeUtilityId === 'apps'`：展示 `FeatureAppsView`
- 当前平台为首页：展示 `WorkspaceHome`
- 其他平台：展示 `ConversationPanel + ContainerWorkspace`

页面状态主要由 `src/stores/client.ts` 控制。

### 平台容器链路

1. 用户点击创建会话。
2. `client.ts` 调用 `buildSessionDraft()` 生成 `PlatformSessionRecord`。
3. 前端通过 `bridge.createSession()` 请求 Electron 主进程登记会话。
4. 用户打开会话时，前端调用 `bridge.openSession(sessionId)`。
5. Electron 主进程创建或复用 `WebContentsView`。
6. 主进程将 `WebContentsView` 附着到主窗口 `contentView`。
7. `BrowserContainerHost.vue` 上报容器区域 bounds。
8. 主进程调用 `view.setBounds()` 让原生平台网页对齐 Vue 页面中的容器区域。

### 消息捕获链路

1. 平台网页 preload 监听第三方页面 DOM 或状态变化。
2. preload 将原始事件发送给 Electron 主进程。
3. 主进程根据 `webContents.id` 找到对应 `sessionId`。
4. 平台 adapter 将原始事件标准化为 `PlatformCaptureEvent`。
5. 主进程广播事件到 Vue renderer。
6. `client.ts` store 接收事件，写入 `captureEvents`。
7. 前端页面可展示捕获时间线、会话消息或后续自动回复记录。

## 6. 当前主要业务模块

### 首页工作台

文件：`src/components/client/WorkspaceHome.vue`

当前定位：

- 聚合展示待处理/未回复消息列表。
- 提供分页，而不是下滑加载更多。
- 快捷入口可跳转设置下的支持平台、翻译设置、代理设置、意见反馈，以及快捷回复页面。
- 中部区域已从“粉丝洞察”方向调整为跨平台消息列表。

### 平台切换与会话区

文件：

- `PlatformRail.vue`
- `ConversationPanel.vue`
- `ContainerWorkspace.vue`

当前能力：

- 左侧平台列表支持首页、多个平台入口、功能应用、设置、退出。
- 会话区支持无数据空状态、创建会话、会话卡片 hover 操作。
- 平台容器区在桌面端有真实容器能力，Web 端为降级展示。
- 右侧工具栏根据是否存在 Web 容器决定是否展示。

### 设置中心

文件：`src/components/client/SettingsView.vue`

当前设置项包括：

- 平台设置：平台展示与拖动排序。
- 翻译设置：翻译模型、接收翻译、发送翻译、群组翻译开关。
- 全局代理：代理开关、协议、地址、端口、用户名、密码等。
- 显示设置：明亮/暗黑主题、翻译字体大小、字体颜色、重粉标记、会话排序设置。
- 系统设置：缓存目录、选择目录、立即清除、缓存大小、关闭窗口最小化到任务栏等。
- 关于我们：版本/联系信息/意见反馈等。
- 退出入口已从设置页面移动到左侧设置按钮下方。

### 快捷回复

文件：`src/components/client/QuickReplyView.vue`

当前能力：

- 左侧分组。
- 分组内新增模板。
- 模板支持文本内容和图片内容占位。
- 支持保存提示、删除提示、删除功能。
- 使用本地状态或 localStorage 形式模拟数据，后续可替换为后端接口。

### 关键词回复

文件：`src/components/client/FeatureAppsView.vue`

当前定位：

- 不提供新增/编辑接口。
- 用于展示中后台已经配置好的关键词自动回复规则。
- 左侧只展示分组。
- 右侧展示该分组下的多个规则卡片。
- 规则卡片展示关键词、启用状态、匹配规则、回复方式、回复内容。
- 最右侧展示命中记录，说明该规则触发的时间、平台、客户和触发原因。

后续接入方向：

- 从中后台读取分组和规则。
- 从自动回复执行系统读取命中记录。
- 当前页面可保持只读，避免 PC 客户端和中后台配置入口冲突。

### 欢迎语回复

文件：`src/components/client/FeatureAppsView.vue`

当前定位：

- 与关键词回复共享页面结构。
- 左侧展示欢迎语分组。
- 右侧展示欢迎语配置详情。
- 最右侧展示命中记录，说明首次会话或回访触发时机。

后续接入方向：

- 中后台配置欢迎语策略。
- PC 客户端只读取并展示。
- 自动回复执行链路根据会话首次进入、时间间隔、人工接管状态决定是否发送。

### 右侧工具栏

文件：`src/components/client/ContainerWorkspace.vue`

当前保留：

- 翻译设置
- 代理环境
- 快捷回复

已删除：

- 聚合翻译
- 粉丝统计
- 截图翻译
- 客户备注
- 电报客服

代理环境当前包含环境设计、指纹设置、Cookie 等展示区域，偏向桌面容器环境配置原型。

## 7. Electron 架构说明

Electron 主进程不是简单套壳，它承担了平台容器的核心能力。

关键设计：

- 主窗口只加载 Vue 工作台。
- 第三方平台网页不会进入 Vue DOM，而是由 `WebContentsView` 承载。
- 每个会话使用独立 `partition`，用于保留平台登录态。
- 主进程维护：
  - `sessionRecords`
  - `sessionStates`
  - `sessionViews`
  - `sessionBounds`
  - `webContentsToSessionId`
- 平台跳转经过 adapter 白名单校验，降低容器跳到不可控 URL 的风险。
- 平台 preload 和主窗口 preload 分离：
  - `electron/preload.ts` 给 Vue renderer 使用。
  - `electron/platform-preload/*` 给第三方平台页面使用。

这个架构的优点：

- Vue 前端和第三方平台页面隔离。
- 可以对每个平台定制 DOM 捕获和登录态判断。
- 多平台、多会话可以用统一 session 模型管理。
- Web 端仍能开发大部分 UI，不强依赖 Electron。

代价：

- 容器位置需要 renderer 持续上报 bounds。
- 第三方平台 DOM 结构变化会导致捕获脚本失效。
- Electron 主进程、renderer、guest preload 三端调试复杂度较高。

## 8. 当前风险与待完善点

### 技术风险

- `electron/main.ts` 中当前存在 `view.webContents.openDevTools({ mode: 'detach' })`，会导致桌面端打开平台容器时自动弹出 DevTools，生产构建前应移除或加开发环境判断。
- 第三方平台 DOM 捕获依赖页面结构，选择器容易失效，需要平台级监控与降级提示。
- Web 端和桌面端能力不同，开发时必须明确当前测试环境，否则容易误判功能缺失。
- 当前主进程会话状态以内存保存，应用重启后会话列表不持久化。
- 删除 session 当前不清理持久 partition 数据，可能保留登录态和缓存。

### 产品风险

- 快捷回复、关键词回复、欢迎语回复之间的边界需要持续保持清晰：
  - 快捷回复：人工选择模板发送。
  - 关键词回复：客户消息命中规则后自动回复。
  - 欢迎语回复：会话首次进入或特定回访场景自动发送。
- 关键词和欢迎语当前建议由中后台统一配置，PC 客户端只展示和执行，否则后期权限与数据一致性会复杂。
- 代理环境和指纹设置涉及平台风控，功能设计需要控制范围，避免过度暴露不必要配置。

### 工程待办

- 更新根目录 `README.md`，替换 Vite 模板说明。
- 为核心逻辑补充单元测试，尤其是快捷回复、功能应用数据结构、平台 session 构造。
- 为 Electron IPC 增加错误处理和 renderer 侧提示。
- 将静态数据逐步替换为 API 层和 mock 层，避免组件内堆积业务数据。
- 增加生产/开发环境差异控制，例如 DevTools、日志等级、调试通道。
- 梳理 UI 组件复用，设置页、工具栏、功能应用页中有较多相似卡片结构。

## 9. 后续开发建议

建议优先级：

1. 先稳定 Electron 容器链路：创建、打开、隐藏、销毁、bounds 同步、登录态保留。
2. 再完善平台 DOM 捕获：先把抖音捕获做稳定，再抽象到其他平台。
3. 然后接入快捷回复真实数据：分组、模板、文本、图片、保存、删除。
4. 再接入关键词回复和欢迎语回复的只读配置展示。
5. 最后接入自动回复执行链路：触发判断、发送前检查、人工接管、命中记录。

推荐的数据边界：

- 中后台：负责配置关键词规则、欢迎语规则、快捷回复模板、平台配置、权限。
- PC 客户端：负责展示配置、创建平台会话、捕获消息、执行人工或自动回复。
- Electron 主进程：负责平台容器、登录态隔离、平台页面安全边界。
- 平台 preload：只做页面状态识别和消息捕获，不承载复杂业务规则。

## 10. 快速入口

常用文件：

- `src/components/client/ClientShell.vue`
- `src/components/client/PlatformRail.vue`
- `src/components/client/WorkspaceHome.vue`
- `src/components/client/ConversationPanel.vue`
- `src/components/client/ContainerWorkspace.vue`
- `src/components/client/SettingsView.vue`
- `src/components/client/QuickReplyView.vue`
- `src/components/client/FeatureAppsView.vue`
- `src/stores/client.ts`
- `src/platform/contracts.ts`
- `src/platform/runtime.ts`
- `electron/main.ts`
- `electron/preload.ts`
- `electron/platform-adapters/index.ts`
- `electron/platform-preload/douyin.ts`
- `electron/platform-preload/douyin-capture.ts`

常用命令：

```bash
npm run dev
npm run dev:desktop
npm run build
npm run build:desktop
npm run test
```
