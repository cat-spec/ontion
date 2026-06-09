# Electron 官方文档精读与代码用法

> 输出时间：2026-06-09  
> 学习版本：Electron 42.3.3 官方文档示例版本  
> 示例技术栈：Electron + 原生 JavaScript + HTML + CSS  
> 学习重点：进程模型、窗口、preload、IPC、安全、原生 API、打包思路  


## 1. Electron 技术定位与核心模型

Electron 用 Chromium 渲染界面，用 Node.js 提供本地能力，用 Electron API 连接桌面系统能力。它不是简单的“网页套壳”，核心难点是进程模型和安全边界。

### 1.1 核心对象

| 对象 | 类型 | 作用 | 代码位置 | 常见错误 |
| --- | --- | --- | --- | --- |
| `app` | 主进程模块 | 控制应用生命周期 | `main.js` | 在 `app.whenReady()` 前创建窗口 |
| `BrowserWindow` | 主进程类 | 创建和管理窗口 | `main.js` | 随意开启 `nodeIntegration` |
| `webContents` | 主进程对象 | 控制页面加载、导航、消息 | `main.js` | 不限制导航和新窗口 |
| `preload` | 预加载脚本 | 在安全隔离层暴露有限 API | `preload.js` | 直接暴露整个 Electron API |
| `ipcMain` | 主进程模块 | 接收渲染进程消息 | `main.js` | 通道命名混乱、不校验参数 |
| `ipcRenderer` | 渲染进程模块 | 从 preload 发消息到主进程 | `preload.js` | 直接暴露给页面 |
| `contextBridge` | preload 模块 | 在隔离上下文中暴露安全 API | `preload.js` | 暴露过宽、缺少参数限制 |

### 1.2 进程模型

Electron 至少有两类进程：

- 主进程：每个应用只有一个，负责生命周期、窗口、菜单、原生能力。
- 渲染进程：每个窗口页面通常对应一个，负责 HTML/CSS/JS 界面。

preload 脚本运行在渲染进程中，但它比普通页面脚本拥有更高权限，因此它是主进程和页面之间的安全桥。

### 1.3 常考题

1. Electron 为什么需要主进程和渲染进程？
2. `BrowserWindow` 应该在哪个进程中创建？
3. preload 脚本为什么不是普通前端脚本？
4. 为什么不建议在渲染进程直接访问 Node.js API？
5. `contextIsolation` 的作用是什么？

### 1.4 小案例：画出一个 Electron 应用的数据流

目标：理解页面点击按钮后，如何调用本地能力。

流程：

1. 用户在页面点击按钮。
2. `renderer.js` 调用 `window.electronAPI.xxx()`。
3. `preload.js` 通过 `ipcRenderer.invoke()` 发请求。
4. `main.js` 中的 `ipcMain.handle()` 执行业务。
5. 主进程返回结果给页面。

## 2. 环境与最小可运行示例

### 2.1 安装与创建项目

官方推荐使用 Electron Forge 起步。你的本机 Node 环境是 `v24.12.0`，npm 是 `11.6.2`，可以直接创建项目。

```bash
npm init electron-app@latest electron-study-app
cd electron-study-app
npm start
```

### 2.2 最小项目结构

```text
electron-study-app/
├── package.json
├── src/
│   ├── main.js
│   ├── preload.js
│   ├── index.html
│   └── renderer.js
```

### 2.3 最小主进程代码

```js
const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

### 2.4 代码逐条说明

| 代码 | 类型 | 作用 | 注意事项 |
| --- | --- | --- | --- |
| `require('electron/main')` | 模块导入 | 只导入主进程可用 API | 主进程代码不要写到页面里 |
| `app.whenReady()` | 生命周期 API | Electron 初始化完成后执行 | 窗口创建建议放在这里之后 |
| `new BrowserWindow()` | 类实例化 | 创建桌面窗口 | 安全配置在 `webPreferences` 中 |
| `preload` | 配置项 | 指定 preload 文件路径 | 必须使用绝对路径或可靠路径 |
| `contextIsolation: true` | 安全配置 | 隔离 preload 和页面上下文 | 官方安全建议开启 |
| `nodeIntegration: false` | 安全配置 | 禁止页面直接访问 Node.js | 加载远程内容时尤其重要 |
| `sandbox: true` | 安全配置 | 启用渲染进程沙箱 | Electron 20 之后默认行为更偏向沙箱 |
| `win.loadFile()` | 窗口方法 | 加载本地 HTML | 适合本地应用页面 |
| `win.loadURL()` | 窗口方法 | 加载远程 URL | 加载远程页面时安全要求更高 |

### 2.5 常见错误与排查

| 错误 | 原因 | 修复 |
| --- | --- | --- |
| 窗口不显示 | 没有在 `app.whenReady()` 后创建窗口 | 把 `createWindow()` 放进 `app.whenReady().then()` |
| preload 不生效 | 路径错误 | 使用 `path.join(__dirname, 'preload.js')` |
| 页面访问不到 API | 没有通过 `contextBridge` 暴露 | 在 preload 中显式暴露方法 |
| 打包后找不到文件 | 使用了不稳定相对路径 | 区分开发态和生产态资源路径 |

### 2.6 常考题

1. `app.whenReady()` 和 `window-all-closed` 分别解决什么问题？
2. `loadFile()` 和 `loadURL()` 的区别是什么？
3. `webPreferences.preload` 为什么通常要配合 `contextBridge` 使用？
4. 为什么 `nodeIntegration: true` 有安全风险？
5. macOS 下关闭所有窗口后为什么应用通常不退出？

### 2.7 小案例：创建一个固定尺寸窗口

目标：创建一个不可调整尺寸的工具窗口。

```js
const win = new BrowserWindow({
  width: 420,
  height: 320,
  resizable: false,
  minimizable: true,
  maximizable: false,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false
  }
})
```

扩展任务：增加一个设置窗口，尺寸为 `520 x 420`，并设置为主窗口的子窗口。

## 3. BrowserWindow 官方 API 精读

`BrowserWindow` 是 Electron 桌面应用最核心的类。它负责创建窗口、加载页面、控制窗口状态、处理父子窗口、控制标题栏和平台行为。

### 3.1 构造函数

```js
const win = new BrowserWindow(options)
```

| 参数 | 类型 | 作用 | 示例 | 注意事项 |
| --- | --- | --- | --- | --- |
| `width` | number | 初始宽度 | `width: 1000` | 单位是像素 |
| `height` | number | 初始高度 | `height: 700` | 单位是像素 |
| `minWidth` | number | 最小宽度 | `minWidth: 800` | 防止布局被压坏 |
| `minHeight` | number | 最小高度 | `minHeight: 500` | 和响应式布局配合 |
| `resizable` | boolean | 是否允许调整窗口大小 | `resizable: false` | 工具窗口常设为 false |
| `show` | boolean | 创建后是否立即显示 | `show: false` | 可等页面加载完再显示 |
| `parent` | BrowserWindow | 父窗口 | `parent: mainWindow` | 常用于设置窗口、弹窗 |
| `modal` | boolean | 是否模态 | `modal: true` | 通常配合 `parent` |
| `backgroundColor` | string | 背景色 | `backgroundColor: '#fff'` | 可减少加载闪白 |
| `webPreferences` | object | 页面与安全配置 | 见下表 | Electron 安全重点 |

### 3.2 `webPreferences` 常用配置

| 配置 | 推荐值 | 作用 | 错误用法 |
| --- | --- | --- | --- |
| `preload` | `path.join(...)` | 加载预加载脚本 | 路径写错或直接相对路径 |
| `contextIsolation` | `true` | 隔离上下文 | 为方便调试设为 `false` |
| `nodeIntegration` | `false` | 禁止页面直接用 Node | 为了读文件设为 `true` |
| `sandbox` | `true` | 渲染进程沙箱 | 以为关闭后更方便 |
| `webSecurity` | `true` | 启用同源和安全限制 | 为跨域临时设为 `false` |

### 3.3 常用方法

| 方法 | 作用 | 基本写法 | 返回值/结果 |
| --- | --- | --- | --- |
| `loadFile(file)` | 加载本地 HTML | `win.loadFile('index.html')` | 返回 Promise |
| `loadURL(url)` | 加载 URL | `win.loadURL('https://example.com')` | 返回 Promise |
| `show()` | 显示窗口 | `win.show()` | 无 |
| `hide()` | 隐藏窗口 | `win.hide()` | 无 |
| `close()` | 请求关闭窗口 | `win.close()` | 触发关闭流程 |
| `destroy()` | 强制销毁窗口 | `win.destroy()` | 跳过部分关闭流程 |
| `setTitle(title)` | 设置窗口标题 | `win.setTitle('Demo')` | 无 |
| `getTitle()` | 获取窗口标题 | `win.getTitle()` | string |
| `maximize()` | 最大化窗口 | `win.maximize()` | 无 |
| `minimize()` | 最小化窗口 | `win.minimize()` | 无 |
| `restore()` | 从最小化/最大化恢复 | `win.restore()` | 无 |
| `isDestroyed()` | 判断窗口是否销毁 | `win.isDestroyed()` | boolean |

### 3.4 页面加载完成后显示窗口

```js
const win = new BrowserWindow({
  width: 1000,
  height: 700,
  show: false,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false
  }
})

win.loadFile('index.html')

win.once('ready-to-show', () => {
  win.show()
})
```

使用场景：避免窗口先显示空白页面，再突然出现内容。

### 3.5 常见错误与排查

| 错误 | 原因 | 修复 |
| --- | --- | --- |
| 页面闪白 | 窗口提前显示 | 设置 `show: false`，监听 `ready-to-show` |
| 子窗口不跟随父窗口 | 没设置 `parent` | 创建子窗口时传入 `parent: mainWindow` |
| 远程页面能执行危险代码 | 安全配置过宽 | 关闭 Node 集成，限制导航和窗口创建 |
| 窗口对象被回收 | 没有保存引用 | 将窗口变量保存在模块作用域 |

### 3.6 常考题

1. `BrowserWindow` 的构造参数中哪些属于窗口外观，哪些属于安全配置？
2. `close()` 和 `destroy()` 有什么区别？
3. `show: false` 配合 `ready-to-show` 的作用是什么？
4. 为什么 `webPreferences` 是 Electron 面试高频点？
5. 什么时候使用父子窗口和模态窗口？

### 3.7 小案例：创建设置窗口

目标：点击菜单后打开一个设置窗口，不允许重复打开。

```js
let settingsWindow = null

function openSettingsWindow(parentWindow) {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 560,
    height: 420,
    parent: parentWindow,
    modal: false,
    title: 'Settings',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  settingsWindow.loadFile('settings.html')
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}
```

## 4. Preload 与 contextBridge 精读

preload 是 Electron 安全架构中最关键的一层。它负责把主进程能力包装成有限、明确、可控的页面 API。

### 4.1 错误写法

```js
window.api = {
  readFile: require('node:fs').readFileSync
}
```

问题：

- 页面可以直接接触高权限能力。
- API 范围不可控。
- 加载不可信内容时风险极高。

### 4.2 推荐写法

```js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  openFile: () => ipcRenderer.invoke('dialog:openFile')
})
```

### 4.3 代码逐条说明

| 代码 | 类型 | 作用 | 注意事项 |
| --- | --- | --- | --- |
| `contextBridge` | Electron 模块 | 在隔离上下文中暴露 API | 只在 preload 中使用 |
| `exposeInMainWorld(name, api)` | 方法 | 向页面注入 `window[name]` | `name` 应稳定清晰 |
| `ipcRenderer.invoke(channel)` | 方法 | 向主进程发起异步请求 | 推荐用于请求-响应 |
| `electronAPI` | 自定义对象 | 页面可访问的 API 命名空间 | 不要暴露底层原始对象 |

### 4.4 渲染层调用

```js
async function init() {
  const version = await window.electronAPI.getAppVersion()
  document.querySelector('#version').textContent = version
}

init()
```

### 4.5 类型安全建议

如果后续使用 TypeScript，应声明 `window.electronAPI` 的类型，避免页面里乱调用。

```ts
export interface ElectronAPI {
  getAppVersion: () => Promise<string>
  openFile: () => Promise<string | undefined>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

### 4.6 常见错误与排查

| 错误 | 原因 | 修复 |
| --- | --- | --- |
| `window.electronAPI` 是 `undefined` | preload 没加载或路径错误 | 检查 `webPreferences.preload` |
| API 调用没结果 | 主进程没有注册对应 channel | 检查 `ipcMain.handle()` |
| 页面能访问过多能力 | 暴露了整个 `ipcRenderer` | 只暴露业务方法 |
| 参数不可控 | preload 不校验输入 | 对外暴露方法时限制参数类型 |

### 4.7 常考题

1. preload 和 renderer 都运行在渲染进程，为什么权限不同？
2. `contextBridge.exposeInMainWorld()` 的两个参数分别是什么？
3. 为什么不应该暴露整个 `ipcRenderer`？
4. `contextIsolation` 开启后，为什么不能直接给 `window` 挂对象？
5. preload 适合写业务逻辑吗？

### 4.8 小案例：暴露读取应用版本 API

主进程：

```js
ipcMain.handle('app:getVersion', () => {
  return app.getVersion()
})
```

preload：

```js
contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app:getVersion')
})
```

页面：

```js
document.querySelector('#btn').addEventListener('click', async () => {
  const version = await window.electronAPI.getVersion()
  document.querySelector('#result').textContent = version
})
```

## 5. IPC 官方用法精读

IPC 是 Electron 中主进程和渲染进程通信的机制。官方教程重点介绍了三类模式：单向渲染进程到主进程、双向渲染进程到主进程、主进程到渲染进程。

### 5.1 `ipcMain.handle` + `ipcRenderer.invoke`

这是最推荐的请求-响应模式。

主进程：

```js
const { ipcMain, dialog } = require('electron/main')

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile']
  })

  if (result.canceled) {
    return undefined
  }

  return result.filePaths[0]
})
```

preload：

```js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile')
})
```

renderer：

```js
document.querySelector('#open').addEventListener('click', async () => {
  const filePath = await window.electronAPI.openFile()
  document.querySelector('#path').textContent = filePath || '未选择文件'
})
```

### 5.2 API 逐条说明

| API | 所在进程 | 作用 | 参数 | 返回值 |
| --- | --- | --- | --- | --- |
| `ipcMain.handle(channel, listener)` | 主进程 | 注册可被 invoke 调用的处理器 | channel、处理函数 | 无 |
| `ipcRenderer.invoke(channel, ...args)` | preload/渲染进程 | 调用主进程 handler | channel、参数 | Promise |
| `ipcMain.on(channel, listener)` | 主进程 | 监听单向消息 | channel、处理函数 | 无 |
| `ipcRenderer.send(channel, ...args)` | preload/渲染进程 | 发送单向消息 | channel、参数 | 无 |
| `webContents.send(channel, ...args)` | 主进程 | 主动发消息给页面 | channel、参数 | 无 |

### 5.3 通道命名规范

推荐格式：

```text
模块:动作
```

示例：

```text
app:getVersion
dialog:openFile
settings:read
settings:write
window:setTitle
```

不要这样写：

```text
message
event
call
test
```

### 5.4 参数校验示例

```js
ipcMain.handle('window:setTitle', (event, title) => {
  if (typeof title !== 'string') {
    throw new Error('title must be a string')
  }

  const safeTitle = title.trim().slice(0, 80)
  const win = BrowserWindow.fromWebContents(event.sender)
  win.setTitle(safeTitle)
})
```

### 5.5 常见错误与排查

| 错误 | 原因 | 修复 |
| --- | --- | --- |
| `No handler registered` | 主进程没有 `ipcMain.handle()` | 注册对应 channel |
| 页面卡住 | handler 中执行耗时同步任务 | 使用异步 API 或子进程 |
| 安全风险 | 不校验来源和参数 | 校验 `event.sender` 和参数 |
| 通信混乱 | channel 命名随意 | 使用 `模块:动作` |

### 5.6 常考题

1. `send/on` 和 `invoke/handle` 的区别是什么？
2. 为什么读取文件路径适合用 `invoke/handle`？
3. IPC channel 为什么需要命名规范？
4. 主进程如何主动通知渲染进程？
5. IPC 参数为什么必须校验？

### 5.7 小案例：页面修改窗口标题

主进程：

```js
ipcMain.on('window:setTitle', (event, title) => {
  if (typeof title !== 'string') return
  const win = BrowserWindow.fromWebContents(event.sender)
  win.setTitle(title)
})
```

preload：

```js
contextBridge.exposeInMainWorld('electronAPI', {
  setTitle: (title) => ipcRenderer.send('window:setTitle', title)
})
```

renderer：

```js
document.querySelector('#title-form').addEventListener('submit', (event) => {
  event.preventDefault()
  const title = document.querySelector('#title').value
  window.electronAPI.setTitle(title)
})
```

## 6. dialog 官方 API 精读

`dialog` 用于显示系统原生对话框，例如打开文件、保存文件、消息确认。

### 6.1 打开文件

```js
const { dialog } = require('electron/main')

const result = await dialog.showOpenDialog({
  title: '选择 Markdown 文件',
  properties: ['openFile'],
  filters: [
    { name: 'Markdown', extensions: ['md'] },
    { name: 'All Files', extensions: ['*'] }
  ]
})
```

### 6.2 参数逐条说明

| 参数 | 类型 | 作用 | 示例 |
| --- | --- | --- | --- |
| `title` | string | 对话框标题 | `'选择文件'` |
| `defaultPath` | string | 默认路径 | `app.getPath('documents')` |
| `buttonLabel` | string | 按钮文字 | `'打开'` |
| `filters` | array | 文件类型过滤 | `[{ name: 'Images', extensions: ['png'] }]` |
| `properties` | string[] | 行为配置 | `['openFile', 'multiSelections']` |

### 6.3 `properties` 常用值

| 值 | 作用 |
| --- | --- |
| `openFile` | 选择文件 |
| `openDirectory` | 选择文件夹 |
| `multiSelections` | 多选 |
| `showHiddenFiles` | 显示隐藏文件 |
| `createDirectory` | 允许创建目录，主要用于 macOS |

### 6.4 返回值

```js
{
  canceled: false,
  filePaths: ['/Users/work1/demo.md']
}
```

处理方式：

```js
if (result.canceled) {
  return undefined
}

return result.filePaths[0]
```

### 6.5 常考题

1. `showOpenDialog()` 为什么通常写在主进程？
2. 如何限制用户只能选择 `.md` 文件？
3. `canceled` 为 `true` 时应该怎么处理？
4. 多选文件时读取哪个字段？
5. `dialog` 和浏览器原生 `<input type="file">` 的区别是什么？

### 6.6 小案例：选择文件夹并返回路径

```js
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })

  if (result.canceled) return undefined
  return result.filePaths[0]
})
```

## 7. 安全官方清单精读

Electron 安全文档强调：如果应用加载远程内容，必须格外注意安全。即使只加载本地内容，也应该默认使用安全配置。

### 7.1 核心安全配置速查

| 配置/行为 | 推荐 | 原因 |
| --- | --- | --- |
| `nodeIntegration` | `false` | 防止页面直接使用 Node.js |
| `contextIsolation` | `true` | 隔离页面和 preload |
| `sandbox` | `true` | 限制渲染进程能力 |
| `webSecurity` | `true` | 保持浏览器安全限制 |
| CSP | 设置严格策略 | 限制脚本来源 |
| IPC | 校验发送方和参数 | 避免被滥用 |
| `shell.openExternal` | 校验 URL | 防止打开恶意链接 |

### 7.2 推荐 CSP

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
/>
```

说明：

- `default-src 'self'`：默认只允许同源资源。
- `script-src 'self'`：脚本只能来自自身。
- `style-src 'self' 'unsafe-inline'`：允许本地样式和内联样式。
- `img-src 'self' data:`：允许本地图片和 data URL。

### 7.3 危险配置示例

```js
const win = new BrowserWindow({
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
    webSecurity: false
  }
})
```

问题：

- 页面可以直接接触 Node。
- preload 和页面没有隔离。
- 浏览器安全限制被关闭。

### 7.4 常考题

1. 为什么 `nodeIntegration: true` 危险？
2. `contextIsolation` 和 `sandbox` 是同一个东西吗？
3. CSP 的作用是什么？
4. 为什么不能直接对不可信 URL 调用 `shell.openExternal()`？
5. IPC 为什么也属于安全边界？

### 7.5 小案例：安全打开外部链接

```js
const { shell } = require('electron')

function openTrustedExternal(url) {
  const parsed = new URL(url)
  const allowedHosts = ['electronjs.org', 'github.com']

  if (!['https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTPS links are allowed')
  }

  if (!allowedHosts.includes(parsed.hostname)) {
    throw new Error('Host is not allowed')
  }

  return shell.openExternal(url)
}
```

## 8. 高频 API / 配置速查表

### 8.1 主进程

| API | 作用 | 示例 |
| --- | --- | --- |
| `app.whenReady()` | 应用初始化完成 | `app.whenReady().then(createWindow)` |
| `app.quit()` | 退出应用 | `app.quit()` |
| `app.getPath(name)` | 获取系统路径 | `app.getPath('userData')` |
| `BrowserWindow.getAllWindows()` | 获取所有窗口 | `BrowserWindow.getAllWindows()` |
| `BrowserWindow.fromWebContents()` | 从页面找到窗口 | `BrowserWindow.fromWebContents(event.sender)` |

### 8.2 窗口

| API | 作用 | 示例 |
| --- | --- | --- |
| `new BrowserWindow()` | 创建窗口 | `new BrowserWindow({ width: 800 })` |
| `win.loadFile()` | 加载本地页面 | `win.loadFile('index.html')` |
| `win.loadURL()` | 加载远程页面 | `win.loadURL('https://example.com')` |
| `win.setTitle()` | 设置标题 | `win.setTitle('Demo')` |
| `win.webContents` | 操作页面内容 | `win.webContents.send(...)` |

### 8.3 IPC

| API | 作用 | 示例 |
| --- | --- | --- |
| `ipcMain.handle()` | 注册异步处理 | `ipcMain.handle('x:y', handler)` |
| `ipcRenderer.invoke()` | 请求主进程并等待返回 | `ipcRenderer.invoke('x:y')` |
| `ipcMain.on()` | 监听单向消息 | `ipcMain.on('x:y', listener)` |
| `ipcRenderer.send()` | 发送单向消息 | `ipcRenderer.send('x:y', data)` |

### 8.4 preload

| API | 作用 | 示例 |
| --- | --- | --- |
| `contextBridge.exposeInMainWorld()` | 暴露页面 API | `exposeInMainWorld('electronAPI', api)` |
| `ipcRenderer.invoke()` | 调主进程 | `ipcRenderer.invoke('dialog:openFile')` |
| `ipcRenderer.send()` | 发单向消息 | `ipcRenderer.send('window:setTitle')` |

## 9. 综合小项目：本地 Markdown 文件选择器

### 9.1 项目目标

做一个 Electron 桌面小工具：

- 点击按钮选择 Markdown 文件。
- 页面显示文件路径。
- 页面可修改窗口标题。
- 使用安全 preload 和 IPC。

### 9.2 主进程

```js
const { app, BrowserWindow, ipcMain, dialog } = require('electron/main')
const path = require('node:path')

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.loadFile('index.html')
}

ipcMain.handle('dialog:openMarkdown', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择 Markdown 文件',
    properties: ['openFile'],
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })

  if (result.canceled) return undefined
  return result.filePaths[0]
})

ipcMain.on('window:setTitle', (event, title) => {
  if (typeof title !== 'string') return
  const win = BrowserWindow.fromWebContents(event.sender)
  win.setTitle(title.trim().slice(0, 80))
})

app.whenReady().then(createWindow)
```

### 9.3 preload

```js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openMarkdown: () => ipcRenderer.invoke('dialog:openMarkdown'),
  setTitle: (title) => ipcRenderer.send('window:setTitle', title)
})
```

### 9.4 页面

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
    />
    <title>Markdown Selector</title>
  </head>
  <body>
    <h1>Markdown 文件选择器</h1>
    <button id="open">选择 Markdown</button>
    <p id="path">尚未选择文件</p>

    <form id="title-form">
      <input id="title" placeholder="输入窗口标题" />
      <button type="submit">修改标题</button>
    </form>

    <script src="./renderer.js"></script>
  </body>
</html>
```

```js
document.querySelector('#open').addEventListener('click', async () => {
  const filePath = await window.electronAPI.openMarkdown()
  document.querySelector('#path').textContent = filePath || '用户取消选择'
})

document.querySelector('#title-form').addEventListener('submit', (event) => {
  event.preventDefault()
  const title = document.querySelector('#title').value
  window.electronAPI.setTitle(title)
})
```

### 9.5 扩展任务

1. 读取 Markdown 文件内容并展示。
2. 增加最近打开文件列表。
3. 增加设置窗口。
4. 打包成桌面应用。

## 10. 复习题总表

### 10.1 基础题

1. Electron 的主进程负责什么？
2. 渲染进程负责什么？
3. `BrowserWindow` 的作用是什么？
4. `app.whenReady()` 什么时候触发？
5. `loadFile()` 和 `loadURL()` 有什么区别？

### 10.2 代码题

1. 写一个创建 `800 x 600` 窗口的 `BrowserWindow` 示例。
2. 写一个通过 preload 暴露 `getVersion()` 的示例。
3. 写一个 `ipcMain.handle()` 处理文件选择的示例。
4. 写一个页面调用 `window.electronAPI.openFile()` 的示例。
5. 写一个严格 CSP meta 标签。

### 10.3 进阶题

1. 为什么官方不建议直接暴露 `ipcRenderer`？
2. 如果页面加载远程 URL，哪些配置必须重点检查？
3. IPC 如何验证调用来源？
4. 如何避免窗口重复创建？
5. 打包后资源路径为什么容易出错？

### 10.4 答案提示

1. 主进程管理应用生命周期、窗口和原生能力。
2. 渲染进程负责页面 UI。
3. `BrowserWindow` 是窗口类。
4. `app.whenReady()` 在 Electron 完成初始化后触发。
5. `loadFile()` 加载本地文件，`loadURL()` 加载 URL。
6. 不暴露 `ipcRenderer` 是为了缩小页面可用能力边界。
7. 远程 URL 要重点检查 `nodeIntegration`、`contextIsolation`、`sandbox`、CSP、导航限制。

## 11. 学习检查清单

学完后，你应该能做到：

- 独立创建 Electron 项目。
- 解释主进程、渲染进程、preload 的职责。
- 用 `BrowserWindow` 创建和控制窗口。
- 用 `contextBridge` 暴露安全 API。
- 用 `ipcMain.handle()` 和 `ipcRenderer.invoke()` 完成请求-响应通信。
- 用 `dialog.showOpenDialog()` 选择本地文件。
- 写出基础安全配置。
- 判断哪些代码应该放主进程，哪些应该放渲染进程。
- 完成一个可运行的 Electron 小工具。

## 12. 下一步学习建议

完成本文后，再继续学习这些官方主题：

- Menu：应用菜单和右键菜单。
- Tray：系统托盘。
- nativeImage：图标处理。
- shell：打开外部链接和文件。
- globalShortcut：全局快捷键。
- autoUpdater：自动更新。
- Electron Forge：打包和发布。

学习顺序建议：先完成本文综合小项目，再继续扩展菜单、托盘、打包发布。
