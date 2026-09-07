# Vue.js 知识精要与实战指南

> 资料来源：
> - 官方文档：[https://vuejs.org/](https://vuejs.org/)
> - API 文档：[https://vuejs.org/api/](https://vuejs.org/api/)
> - 中文文档：[https://cn.vuejs.org/](https://cn.vuejs.org/)
> - 官方仓库：[https://github.com/vuejs/core](https://github.com/vuejs/core)
> - 核心社区：[Stack Overflow Vue.js](https://stackoverflow.com/questions/tagged/vue.js)
>
> 目标版本：Vue 3.5.39
> 适合人群：初学者到中级开发者
> 生成时间：2026-06-29

---

## 知识体系总览

**学习路径**：

```
Vue.js 3 知识体系
├── 1. 技术定位与核心模型
├── 2. 环境与快速开始
├── 3. 基础语法与响应式
├── 4. 计算属性与侦听器
├── 5. 组件基础
├── 6. 组件通信
├── 7. 组合式 API (Composition API)
├── 8. 生命周期钩子
├── 9. 指令与修饰符
├── 10. Vue Router 路由
├── 11. Pinia 状态管理
├── 12. 过渡与动画
├── 13. 组合式函数与可复用性
└── 14. 工具链与工程化
```

**章节导航**：
1. [技术定位与核心模型](#1-技术定位与核心模型)
2. [环境与快速开始](#2-环境与快速开始)
3. [基础语法与响应式](#3-基础语法与响应式)
4. [计算属性与侦听器](#4-计算属性与侦听器)
5. [组件基础](#5-组件基础)
6. [组件通信](#6-组件通信)
7. [组合式 API (Composition API)](#7-组合式-api-composition-api)
8. [生命周期钩子](#8-生命周期钩子)
9. [指令与修饰符](#9-指令与修饰符)
10. [Vue Router 路由](#10-vue-router-路由)
11. [Pinia 状态管理](#11-pinia-状态管理)
12. [过渡与动画](#12-过渡与动画)
13. [组合式函数与可复用性](#13-组合式函数与可复用性)
14. [工具链与工程化](#14-工具链与工程化)

---

## 1. 技术定位与核心模型

### 核心知识点

#### 1.1 Vue 的定位

**Vue.js**（读音 /vjuː/，类似于 view）是一个用于**构建用户界面**的**渐进式 JavaScript 框架**。

**核心特性**：
- **渐进式**：可以从一个轻量级的视图层库逐步扩展到完整的框架
- **声明式渲染**：使用模板语法声明式地描述 HTML
- **响应式系统**：自动追踪 JavaScript 状态变化并在改变时响应式更新 DOM
- **组件化**：通过小型、独立、通常可复用的组件构建大型应用

#### 1.2 核心模型 - 响应式系统

Vue 3 使用 **Proxy** 实现响应式系统（Vue 2 使用 Object.defineProperty）。

**响应式原理**：
```javascript
// Vue 3 响应式创建
const state = Vue.reactive({ count: 0 })

// 当 state.count 发生变化时，Vue 自动追踪并更新依赖它的视图
state.count++ // 自动触发更新
```

**依赖收集**：Vue 会在组件渲染时收集哪些数据被访问，建立依赖关系图。

**副作用执行**：当响应式数据变化时，Vue 会重新执行依赖于这些数据的副作用（如重新渲染组件）。

#### 1.3 MVVM 模式

Vue 采用 **Model-View-ViewModel** 架构模式：

```
┌─────────────┐
│    View     │  ← 模板 (Template)
│  (DOM 元素)  │
└──────┬──────┘
       │ 双向绑定
       ↓
┌─────────────┐
│ ViewModel   │  ← Vue 实例 / 组件
│ (响应式对象) │
└──────┬──────┘
       │ 数据绑定
       ↓
┌─────────────┐
│    Model    │  ← 原始数据 (JavaScript 对象)
│   (data)    │
└─────────────┘
```

---

### 章节题目（12道）

#### 【面试题】

**Q1. Vue 和 React 的核心区别是什么？**
- 答案：
  - **模板 vs JSX**：Vue 使用模板语法，React 使用 JSX
  - **响应式系统**：Vue 有内置响应式系统，React 需要手动触发更新（useState/useEffect）
  - **API 风格**：Vue 提供 Options API 和 Composition API，React 主要使用 Hooks
  - **学习曲线**：Vue 模板语法更接近 HTML，学习曲线较平缓
- 考点：框架对比、设计理念差异

**Q2. Vue 2 和 Vue 3 的主要区别是什么？**
- 答案：
  - **响应式原理**：Vue 2 使用 Object.defineProperty，Vue 3 使用 Proxy
  - **Composition API**：Vue 3 新增，更好的逻辑复用和类型推导
  - **性能**：Vue 3 重写了虚拟 DOM，提升了渲染性能
  - **Tree-shaking**：Vue 3 支持，打包体积更小
  - **TypeScript**：Vue 3 用 TypeScript 重写，更好的类型支持
- 考点：版本演进、技术升级

#### 【论坛题】

**Q3. 来源：Stack Overflow 高赞问题 - 什么时候应该用 Vue 而不是原生 JS？**
- 答案：
  - 需要构建**复杂单页应用**时
  - 需要**状态管理和组件复用**时
  - 需要**响应式数据绑定**时
  - 简单页面或静态页面用原生 JS 更合适
- 考点：框架选择决策

**Q4. 来源：Reddit 热议 - Vue 的"渐进式"是什么意思？**
- 答案：渐进式意味着你可以：
  - 只用 Vue 的**视图层**（像 jQuery 一样增强页面）
  - 逐步引入**组件系统**
  - 需要时再添加**路由**（Vue Router）
  - 需要时再添加**状态管理**（Pinia）
  - 不需要一开始就学习所有功能
- 考点：框架设计理念

#### 【期末题/认证题】

**Q5. 下列关于 Vue 响应式的说法，错误的是？**
A. Vue 3 使用 Proxy 实现响应式
B. 响应式数据会自动更新视图
C. 所有 JavaScript 对象都是响应式的
D. 需要通过 Vue API 创建响应式对象

- 答案：C。普通 JavaScript 对象不是响应式的，需要通过 reactive() 或 ref() 创建
- 考点：响应式系统理解

**Q6. Vue 的 MVVM 模式中，ViewModel 的作用是？**
A. 存储原始数据
B. 负责业务逻辑
C. 连接 View 和 Model，实现双向绑定
D. 定义路由规则

- 答案：C。ViewModel 是 View 和 Model 之间的桥梁
- 考点：架构模式理解

#### 【官网题】

**Q7. 来源：Vue 官方 FAQ - Vue 可以用于移动端开发吗？**
- 答案：可以。通过 **Weex**（阿里）或 **Capacitor** 等跨平台方案，Vue 也可以用于移动端
- 考点：框架应用场景

**Q8. 来源：Vue 官方文档 - "渐进式框架"的含义是什么？**
- 答案：你可以**逐步采用** Vue，不需要一开始就用完整功能栈
- 考点：框架设计理念

#### 【实战题】

**Q9. 项目场景：你有一个用 jQuery 写的旧项目，想逐步迁移到 Vue，应该怎么做？**
- 答案：
  1. 先在页面中引入 Vue CDN
  2. 选择一个小的功能模块用 Vue 重写
  3. 逐步扩大 Vue 的使用范围
  4. 最终完全迁移到 Vue
- 考点：渐进式迁移策略

**Q10. 项目场景：什么时候不应该使用 Vue？**
- 答案：
  - 简单的静态页面
  - SEO 要求极高的内容页面（服务端渲染可能更好）
  - 团队完全没有 JS 基础
  - 需要极高性能且不想引入框架开销的场景
- 考点：技术选型判断

**Q11. 来源：Stack Overflow - Vue 的虚拟 DOM 和 React 的有什么区别？**
- 答案：
  - Vue 2 的虚拟 DOM 与 React 类似
  - Vue 3 优化了编译时的静态提升，减少了 diff 开销
  - Vue 编译时可以做更多优化（如静态树提升）
- 考点：底层实现原理

**Q12. 来源：技术博客 - 为什么 Vue 被称为"渐进式"框架？**
- 答案：因为 Vue 的**核心库只关注视图层**，其他功能（路由、状态管理）可以按需引入
- 考点：框架设计理念

---

### 项目常用场景

**场景1：选择 Vue 作为项目框架**

```
背景：团队需要开发一个管理后台系统
决策过程：
1. 团队成员熟悉 HTML/CSS，学习 Vue 成本低
2. 需要良好的中文文档和社区支持
3. 需要组件化和状态管理
4. → 选择 Vue + Element Plus/Ant Design Vue
```

**场景2：在现有项目中引入 Vue**

```
背景：一个传统多页应用需要添加交互功能
实施方案：
1. 通过 CDN 引入 Vue
2. 在需要交互的页面挂载 Vue 实例
3. 逐步将功能模块组件化
4. → 不需要重构整个项目
```

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|---------|---------|
| Vue 2 | Vue 3 | 响应式原理不同（Object.defineProperty vs Proxy），API 不同 | 新项目用 Vue 3，旧项目继续用 Vue 2 |
| Options API | Composition API | 组织代码的方式不同（对象选项 vs 函数组合） | 简单组件用 Options，复杂逻辑用 Composition |
| 渐进式框架 | 一体化框架 | 渐进式可逐步采用，一体化需全部学习 | Vue 是渐进式，Angular 是一体化 |
| 响应式对象 | 普通对象 | 响应式对象变化会触发视图更新 | 状态数据用响应式，临时数据用普通 |

---

### 常见陷阱与坑点

**陷阱1：直接修改数组索引不会触发更新（Vue 2）**

- 现象：`arr[index] = newValue` 不触发视图更新
- 原因：Vue 2 的响应式系统无法检测到数组索引的直接修改
- 解决方案：使用 `Vue.set()` 或 `arr.splice(index, 1, newValue)`
- 注意：Vue 3 使用 Proxy 后已解决此问题

**陷阱2：直接添加对象属性不会触发更新（Vue 2）**

- 现象：`obj.newProp = value` 不触发视图更新
- 原因：Vue 2 无法检测到对象属性的添加
- 解决方案：使用 `Vue.set(obj, 'newProp', value)`
- 注意：Vue 3 无此限制

---

### 实践信号

#### 官方进阶文档

- **[响应式原理](https://vuejs.org/guide/extras/reactivity-in-depth.html)** - 深入理解 Vue 的响应式系统实现机制

- **[渲染机制](https://vuejs.org/guide/extras/rendering-mechanism.html)** - 了解虚拟 DOM 和编译优化

#### 社区热议话题

- **"Vue 3 was a mistake that we should not repeat"** - 来源：Medium
  - 讨论要点：对 Vue 3 Composition API 的批评声音
  - 学习价值：了解不同观点，做出自己的判断

#### 动手验证

1. **创建一个简单的 Vue 应用**
   - 要求：使用 CDN 引入 Vue 3，创建一个计数器
   - 预期输出：点击按钮时数字增加
   - 提示：使用 `Vue.createApp()` 和 `mount()`

2. **体验响应式系统**
   - 要求：创建一个响应式对象并修改它，观察变化
   - 预期输出：控制台和页面都能看到变化
   - 提示：使用 `Vue.reactive()` 或 `Vue.ref()`

---

## 2. 环境与快速开始

### 核心知识点

#### 2.1 创建 Vue 项目

**方式1：使用 CDN（适合快速原型）**

```html
<script src="https://unpkg.com/vue@3"></script>
<div id="app">{{ message }}</div>
<script>
  const { createApp } = Vue
  createApp({
    data() {
      return { message: 'Hello Vue!' }
    }
  }).mount('#app')
</script>
```

**方式2：使用 Vite（推荐）**

```bash
npm create vue@latest
# 或
yarn create vue@latest

# 按提示选择配置后
cd your-project
npm install
npm run dev
```

**方式3：使用 Vue CLI（传统方式）**

```bash
npm install -g @vue/cli
vue create my-project
```

#### 2.2 项目结构

```
my-vue-app/
├── public/           # 静态资源
│   └── favicon.ico
├── src/
│   ├── assets/       # 资源文件
│   ├── components/   # 组件
│   ├── App.vue       # 根组件
│   └── main.js       # 入口文件
├── package.json
├── vite.config.js    # Vite 配置
└── index.html        # HTML 入口
```

#### 2.3 SFC（单文件组件）

Vue 的 `.vue` 文件包含三部分：

```vue
<template>
  <!-- HTML 模板 -->
</template>

<script>
// JavaScript 逻辑
export default {
  // Options API 或 setup()
}
</script>

<style>
/* CSS 样式 */
</style>
```

---

### 章节题目（10道）

#### 【面试题】

**Q1. Vite 和 Webpack 的区别是什么？**
- 答案：
  - Vite 使用 **ESM** 和 **浏览器原生模块**，开发时按需编译
  - Webpack 需要打包整个 bundle
  - Vite 开发服务器启动**快得多**
  - Vite 使用 Rollup 进行生产构建
- 考点：构建工具理解

**Q2. 单文件组件（SFC）的优势是什么？**
- 答案：
  - 将模板、逻辑、样式**封装在一个文件**中
  - 更好的**代码组织**和**可维护性**
  - 支持 **预处理语言**（Pug、TypeScript、SCSS 等）
  - 支持 **Scoped CSS**
- 考点：组件设计理解

#### 【论坛题】

**Q3. 来源：Stack Overflow - 什么时候应该用 CDN 而不是 Vite？**
- 答案：
  - **快速原型**或**简单页面**用 CDN
  - **正式项目**用构建工具（Vite）
  - CDN 不支持单文件组件
- 考点：项目架构选择

**Q4. 来源：知乎热帖 - Vite 为什么比 Webpack 快？**
- 答案：
  - Vite 利用浏览器**原生 ESM**，不需要打包
  - Webpack 需要先打包再加载
  - Vite 使用 **esbuild** 预编译依赖，比 Webpack 快 10-100 倍
- 考点：构建工具原理

#### 【期末题/认证题】

**Q5. 下列不是 Vue 项目创建方式的是？**
A. npm create vue@latest
B. vue create my-project
C. npm init vue-app
D. 使用 CDN

- 答案：C。没有 `npm init vue-app` 这个命令
- 考点：项目创建命令

**Q6. Vite 配置文件的默认名称是？**
A. webpack.config.js
B. vite.config.js
C. rollup.config.js
D. vue.config.js

- 答案：B
- 考点：项目配置理解

#### 【官网题】

**Q7. 来源：Vue 官方文档 - SFC 中的 `<script setup>` 有什么作用？**
- 答案：它是 **Composition API 的语法糖**，让代码更简洁，不需要 return
- 考点：新语法特性

**Q8. 来源：Vite 官方文档 - Vite 生产环境使用什么打包？**
- 答案：使用 **Rollup** 打包生产代码
- 考点：构建工具理解

#### 【实战题】

**Q9. 项目场景：团队想从 Vue CLI 迁移到 Vite，应该怎么做？**
- 答案：
  1. 创建新的 Vite 项目
  2. 迁移 src 目录下的文件
  3. 修改配置文件
  4. 更新依赖
  5. 注意：Vue CLI 插件可能不兼容
- 考点：项目迁移策略

**Q10. 项目场景：一个简单的 HTML 页面需要添加 Vue，应该用什么方式？**
- 答案：使用 **CDN** 方式引入 Vue，不需要完整的项目结构
- 考点：技术选型判断

---

### 项目常用场景

**场景1：企业级项目初始化**

```
需求：创建一个 Vue 3 + TypeScript + Vite + Pinia + Vue Router 项目
命令：
npm create vue@latest
# 选择：TypeScript ✓, Router ✓, Pinia ✓, ESLint ✓
```

**场景2：在现有页面添加交互**

```
需求：一个简单的表单页面需要验证功能
方案：
1. 在 HTML 中引入 Vue CDN
2. 创建 Vue 实例处理表单逻辑
3. 不需要构建工具
```

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|---------|---------|
| Vite | Webpack | Vite 用 ESM + esbuild，Webpack 用打包 | 新项目推荐 Vite |
| Vite | Vue CLI | Vite 是新一代构建工具，Vue CLI 基于 Webpack | Vue 3 用 Vite |
| CDN | NPM | CDN 直接引入，NPM 需要构建 | 简单页面用 CDN |
| `<script>` | `<script setup>` | setup 是 Composition API 语法糖 | 新项目用 setup |

---

### 常见陷阱与坑点

**陷阱1：CDN 方式不支持单文件组件**

- 现象：直接在浏览器中使用 `.vue` 文件报错
- 原因：浏览器不认识 `.vue` 格式
- 解决方案：使用构建工具或 CDN 全局组件 API

**陷阱2：Vite 热更新不生效**

- 现象：修改代码后页面不更新
- 原因：可能是文件监听限制或配置问题
- 解决方案：检查 `vite.config.js` 中的 `server.watch` 配置

---

### 实践信号

#### 官方进阶文档

- **[Vite 配置](https://cn.vitejs.dev/config/)** - Vite 完整配置选项

- **[Vue SFC 编译器](https://vuejs.org/api/sfc-compile.html)** - 理解 `.vue` 文件如何编译

#### 社区热议话题

- **"Vite vs Webpack 2025"** - 来源：Dev.to
  - 讨论要点：性能对比、生态系统
  - 学习价值：了解构建工具选择

#### 动手验证

1. **创建第一个 Vue 项目**
   - 要求：使用 `npm create vue@latest` 创建项目并运行
   - 预期输出：http://localhost:5173 显示欢迎页面

2. **体验热更新**
   - 要求：修改 App.vue 中的内容，保存后观察页面变化
   - 预期输出：页面自动刷新显示新内容

---

## 3. 基础语法与响应式

### 核心知识点

#### 3.1 模板语法

**文本插值**：
```vue
<template>
  <div>{{ message }}</div>
  <div>{{ message.split('').reverse().join('') }}</div>
</template>
```

**原始 HTML**：
```vue
<div v-html="rawHtml"></div>
```

**属性绑定**：
```vue
<div :id="dynamicId"></div>
<button :disabled="isDisabled">Button</button>
```

**条件渲染**：
```vue
<div v-if="seen">Now you see me</div>
<div v-else-if="type === 'B'">B</div>
<div v-else>Not seen</div>
<div v-show="isVisible">Always in DOM</div>
```

**列表渲染**：
```vue
<li v-for="item in items" :key="item.id">
  {{ item.name }}
</li>

<li v-for="(value, key) in object" :key="key">
  {{ key }}: {{ value }}
</li>
```

#### 3.2 响应式基础

**ref() - 用于基本类型**：
```javascript
import { ref } from 'vue'

const count = ref(0)
console.log(count.value) // 0
count.value++
```

**reactive() - 用于对象**：
```javascript
import { reactive } from 'vue'

const state = reactive({
  count: 0,
  name: 'Vue'
})
state.count++ // 不需要 .value
```

**computed() - 计算属性**：
```javascript
const doubledCount = computed(() => count.value * 2)
```

---

### 章节题目（12道）

#### 【面试题】

**Q1. v-if 和 v-show 的区别是什么？**
- 答案：
  - `v-if` 是**真正**的条件渲染，元素会被**销毁/重建**
  - `v-show` 只是切换 `display: none`，元素**始终存在**
  - `v-if` 有更高的**切换开销**，`v-show` 有更高的**初始渲染开销**
  - 频繁切换用 `v-show`，条件很少改变用 `v-if`
- 考点：条件渲染性能考虑

**Q2. 为什么 v-for 需要使用 key？**
- 答案：
  - key 帮助 Vue **追踪节点身份**，提高 diff 效率
  - 避免**不必要的 DOM 操作**
  - 防止**状态混乱**（如输入框内容错乱）
  - key 应该是**唯一且稳定**的（避免用 index）
- 考点：列表渲染优化

**Q3. ref() 和 reactive() 的区别是什么？**
- 答案：
  - `ref()` 用于**基本类型**（Number、String、Boolean）和对象，访问需要 `.value`
  - `reactive()` 只用于**对象类型**，访问不需要 `.value`
  - `reactive()` 不能**重新赋值整个对象**
  - 解构时会**丢失响应性**，需要用 `toRefs()`
- 考点：响应式 API 理解

#### 【论坛题】

**Q4. 来源：Stack Overflow 高赞 - 为什么不能用 index 作为 v-for 的 key？**
- 答案：
  - index 不是**稳定唯一**的标识
  - 列表**增删**时，index 会变化
  - 可能导致**错误复用** DOM 元素
  - 可能导致**状态错误**（如输入框内容错位）
- 考点：列表渲染最佳实践

**Q5. 来源：知乎热帖 - Vue 3 的响应式系统有什么改进？**
- 答案：
  - 使用 **Proxy** 代替 `Object.defineProperty`
  - 可以检测**对象属性添加/删除**
  - 可以检测**数组索引修改**
  - 支持 **Map、Set、WeakMap、WeakSet**
  - 更好的**TypeScript 支持**
- 考点：版本演进理解

#### 【期末题/认证题】

**Q6. 下列关于 Vue 响应式的说法，正确的是？**
A. ref() 只能用于基本类型
B. reactive() 可以用于基本类型
C. ref() 访问需要 .value
D. reactive() 可以重新赋值

- 答案：C
- 考点：响应式 API 理解

**Q7. v-if 和 v-for 的优先级是？**
A. v-if 优先级更高
B. v-for 优先级更高
C. 相同优先级
D. 不能同时使用

- 答案：B（v-for 优先级更高），但不推荐同时使用
- 考点：指令优先级

#### 【官网题】

**Q8. 来源：Vue 官方文档 - 什么时候应该用 toRefs？**
- 答案：需要**解构 reactive 对象**并保持响应性时
- 考点：响应式 API 使用

**Q9. 来源：Vue 官方 FAQ - 为什么模板中 ref 不需要 .value？**
- 答案：Vue 在模板中**自动解包** ref
- 考点：语法糖理解

#### 【实战题】

**Q10. 项目场景：一个购物车列表需要显示商品和数量，应该用什么响应式 API？**
- 答案：使用 `reactive()` 存储购物车状态，因为购物车是**对象数组**
- 考点：API 选择判断

**Q11. 项目场景：一个计数器组件需要响应式数字，应该用什么？**
- 答案：使用 `ref(0)`，因为计数器是**基本类型**
- 考点：API 选择判断

**Q12. 项目场景：列表项可以删除和添加，用什么作为 key？**
- 答案：使用每项的**唯一 ID**，不能用 index
- 考点：最佳实践

---

### 项目常用场景

**场景1：动态类名绑定**

```vue
<template>
  <!-- 对象语法 -->
  <div :class="{ active: isActive, disabled: isDisabled }"></div>

  <!-- 数组语法 -->
  <div :class="[activeClass, errorClass]"></div>

  <!-- 三元表达式 -->
  <div :class="isRed ? 'red-class' : 'blue-class'"></div>
</template>
```

**场景2：列表渲染与编辑**

```vue
<template>
  <div v-for="item in items" :key="item.id">
    <input v-model="item.name" />
  </div>
</template>
```

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|---------|---------|
| v-if | v-show | v-if 销毁/重建，v-show 切换 display | 频繁切换用 v-show |
| ref() | reactive() | ref 需要 .value，reactive 不需要 | 基本类型用 ref |
| :id | v-bind:id | : 是 v-bind 的简写 | 都可以，推荐简写 |
| {{ }} | v-text | {{ }} 可以包含表达式，v-text 只能文本 | 简单文本用 v-text |

---

### 常见陷阱与坑点

**陷阱1：解构 reactive 失去响应性**

```javascript
const state = reactive({ count: 0 })
const { count } = state // count 不再是响应式！

// 解决方案
const { count } = toRefs(state)
```

**陷阱2：v-if 和 v-for 同时使用**

```vue
<!-- 不推荐：v-for 优先级更高，导致 v-if 无法访问 v-for 中的变量 -->
<li v-for="user in users" v-if="user.isActive" :key="user.id">

<!-- 推荐：使用计算属性过滤 -->
<li v-for="user in activeUsers" :key="user.id">
```

**陷阱3：模板中忘记使用 .value**

```vue
<template>
  <!-- 错误：模板中自动解包，不需要 .value -->
  {{ count.value }} ❌

  <!-- 正确 -->
  {{ count }} ✓
</template>
```

---

### 实践信号

#### 官方进阶文档

- **[响应式 API 完整指南](https://vuejs.org/api/reactivity-utilities.html)** - 所有响应式工具函数

- **[响应式深入](https://vuejs.org/guide/extras/reactivity-in-depth.html)** - 理解响应式原理

#### 社区热议话题

- **"Vue 3 Composition API 常见错误"** - 来源：Telerik Blog
  - 讨论要点：reactive/ref 误用、解构陷阱
  - 学习价值：避免常见错误

#### 动手验证

1. **响应式练习**
   - 创建一个使用 ref 和 reactive 的计数器
   - 验证解构后的响应性变化

2. **列表渲染练习**
   - 创建一个可编辑的列表
   - 体验正确使用 key 的重要性

---

## 4. 计算属性与侦听器

### 核心知识点

#### 4.1 计算属性 computed

计算属性是基于**响应式依赖**进行**缓存**的值。

```javascript
import { ref, computed } from 'vue'

const firstName = ref('John')
const lastName = ref('Doe')

const fullName = computed(() => {
  return firstName.value + ' ' + lastName.value
})

// 可写计算属性
const fullName = computed({
  get() {
    return firstName.value + ' ' + lastName.value
  },
  set(newValue) {
    [firstName.value, lastName.value] = newValue.split(' ')
  }
})
```

#### 4.2 侦听器 watch

侦听器用于在**响应式状态变化**时执行**副作用**。

```javascript
// 侦听单个源
watch(source, (newValue, oldValue) => {
  console.log(`值从 ${oldValue} 变为 ${newValue}`)
})

// 侦听多个源
watch([fooRef, barRef], ([newFoo, newBar], [oldFoo, oldBar]) => {
  console.log(`foo: ${oldFoo} -> ${newFoo}, bar: ${oldBar} -> ${newBar}`)
})

// 深度侦听
watch(state, (newValue) => {
  console.log('state 变化了', newValue)
}, { deep: true })

// 即时回调
watch(source, (newValue, oldValue) => {
  console.log('初始值', newValue)
}, { immediate: true })
```

#### 4.3 watchEffect

`watchEffect` 自动追踪回调内的响应式依赖。

```javascript
watchEffect(() => {
  console.log(count.value) // 自动追踪 count
})
```

---

### 章节题目（12道）

#### 【面试题】

**Q1. 计算属性和方法有什么区别？**
- 答案：
  - 计算属性有**缓存**，依赖不变不会重新计算
  - 方法每次渲染都会**重新执行**
  - 计算属性**必须返回值**
  - 计算属性**不能有副作用**
- 考点：性能优化理解

**Q2. watch 和 watchEffect 的区别是什么？**
- 答案：
  - `watch` 需要**明确指定侦听源**
  - `watchEffect` **自动追踪**依赖
  - `watch` 可以访问 **newValue 和 oldValue**
  - `watchEffect` **无法访问旧值**
  - `watch` 可以配置 **deep、immediate** 等
- 考点：侦听器选择

**Q3. 什么时候应该用计算属性，什么时候用侦听器？**
- 答案：
  - 需要**派生数据**时用**计算属性**
  - 需要**执行副作用**（API 请求、DOM 操作）时用**侦听器**
  - 计算属性应该是**纯函数**
- 考点：API 选择判断

#### 【论坛题】

**Q4. 来源：Stack Overflow - watch 的 deep 选项有什么作用？**
- 答案：强制**深度遍历**侦听对象的所有嵌套属性，有性能开销
- 考点：侦听器配置理解

**Q5. 来源：知乎热帖 - 计算属性不更新怎么办？**
- 答案：检查依赖是否是**响应式数据**，计算属性是否访问了响应式属性
- 考点：响应式理解

#### 【期末题/认证题】

**Q6. 下列关于计算属性的说法，错误的是？**
A. 计算属性有缓存
B. 计算属性必须返回值
C. 计算属性可以有副作用
D. 计算属性可以依赖其他计算属性

- 答案：C。计算属性不应该有副作用
- 考点：计算属性规范

**Q7. watchEffect 的特点是？**
A. 可以访问旧值
B. 需要手动指定侦听源
C. 自动追踪依赖
D. 不能停止侦听

- 答案：C
- 考点：watchEffect 理解

#### 【官网题】

**Q8. 来源：Vue 官方文档 - 计算属性的缓存机制是什么？**
- 答案：计算属性会**缓存结果**，只有依赖变化才重新计算
- 考点：性能机制理解

**Q9. 来源：Vue 官方文档 - watch 的 flush 选项有什么作用？**
- 答案：控制回调的**触发时机**（pre、sync、post）
- 考点：侦听器配置

#### 【实战题】

**Q10. 项目场景：表单验证需要实时提示，应该用什么？**
- 答案：使用 `computed` 计算验证状态，因为有缓存且不需要副作用
- 考点：API 选择

**Q11. 项目场景：数据变化后需要调用 API，应该用什么？**
- 答案：使用 `watch` 侦听数据变化，然后调用 API
- 考点：API 选择

**Q12. 项目场景：需要在组件挂载时立即执行侦听器回调，应该怎么做？**
- 答案：使用 `immediate: true` 选项
- 考点：侦听器配置

---

### 项目常用场景

**场景1：表单验证计算属性**

```javascript
const email = ref('')
const isValidEmail = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
})
```

**场景2：数据变化后调用 API**

```javascript
watch(userId, (newId) => {
  if (newId) {
    fetchUser(newId)
  }
}, { immediate: true })
```

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|---------|---------|
| computed | methods | computed 有缓存，methods 无 | 派生数据用 computed |
| watch | watchEffect | watch 需指定源，watchEffect 自动 | 需要旧值用 watch |
| immediate: true | flush: 'sync' | immediate 立即执行，sync 同步触发 | 初始化执行用 immediate |
| computed | watch | computed 返回值，watch 执行副作用 | 派生数据用 computed |

---

### 常见陷阱与坑点

**陷阱1：计算属性中执行副作用**

```javascript
// ❌ 错误：计算属性不应该有副作用
const fullName = computed(() => {
  console.log('计算中...') // 副作用
  return firstName.value + ' ' + lastName.value
})

// ✓ 正确：使用 watchEffect 执行副作用
watchEffect(() => {
  console.log('全名是', firstName.value + ' ' + lastName.value)
})
```

**陷阱2：侦听 reactive 对象需要 deep**

```javascript
const state = reactive({ count: 0 })

// ❌ 错误：state.count 变化时不会触发
watch(state, () => {
  console.log('state 变化了')
})

// ✓ 正确：使用 deep 选项
watch(state, () => {
  console.log('state 变化了')
}, { deep: true })

// ✓ 或直接侦听属性
watch(() => state.count, () => {
  console.log('count 变化了')
})
```

---

### 实践信号

#### 官方进阶文档

- **[计算属性最佳实践](https://vuejs.org/guide/essentials/computed.html)** - 计算属性完整指南

- **[侦听器完整指南](https://vuejs.org/guide/essentials/watchers.html)** - watch 和 watchEffect 详解

#### 社区热议话题

- **"Vue 3 watch vs computed"** - 来源：Stack Overflow
  - 讨论要点：何时使用哪个 API
  - 学习价值：正确选择 API

#### 动手验证

1. **计算属性缓存验证**
   - 创建一个计算属性
   - 多次访问它，观察只计算一次

2. **侦听器练习**
   - 侦听一个 ref 的变化
   - 使用 immediate 和 deep 选项
   - 观察触发时机

---

## 5. 组件基础

### 核心知识点

#### 5.1 组件定义

**Options API 方式**：
```vue
<script>
export default {
  name: 'MyComponent',
  props: ['title'],
  data() {
    return {
      count: 0
    }
  },
  methods: {
    increment() {
      this.count++
    }
  }
}
</script>
```

**Composition API 方式**：
```vue
<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: String
})

const emit = defineEmits(['update'])

const count = ref(0)

function increment() {
  count.value++
  emit('update', count.value)
}
</script>
```

#### 5.2 组件使用

```vue
<template>
  <MyComponent title="Hello" />
</template>

<script setup>
import MyComponent from './MyComponent.vue'
</script>
```

#### 5.3 组件生命周期

| Options API | Composition API | 触发时机 |
|-------------|-----------------|---------|
| beforeCreate | setup() 前 | 组件实例初始化前 |
| created | setup() | 组件实例创建完成 |
| beforeMount | onBeforeMount() | 挂载到 DOM 前 |
| mounted | onMounted() | 挂载到 DOM 后 |
| beforeUpdate | onBeforeUpdate() | 更新前 |
| updated | onUpdated() | 更新后 |
| beforeUnmount | onBeforeUnmount() | 卸载前 |
| unmounted | onUnmounted() | 卸载后 |

---

### 章节题目（12道）

#### 【面试题】

**Q1. 组件的 props 为什么是单向数据流？**
- 答案：
  - 防止**子组件意外修改父组件状态**
  - 保持**数据流清晰**，易于调试
  - 父组件更新时，子组件的 props 会**自动更新**
- 考点：组件通信理解

**Q2. 组件名的命名规范是什么？**
- 答案：
  - 组件名应该是**多个单词**
  - 避免与**HTML 标签冲突**
  - 推荐使用**PascalCase**（如 `MyComponent`）
  - 模板中可以使用 **kebab-case**（如 `<my-component>`）
- 考点：命名规范

**Q3. 什么时候应该使用组件？**
- 答案：
  - 需要**代码复用**时
  - 需要**关注点分离**时
  - UI 需要**抽象**成独立单元时
  - 复杂页面需要**拆分**时
- 考点：组件化思维

#### 【论坛题】

**Q4. 来源：Stack Overflow - Vue 组件如何递归调用自己？**
- 答案：组件在 `name` 选项中指定名称，然后在模板中使用该名称
- 考点：递归组件

**Q5. 来源：知乎热帖 - 为什么组件名推荐多个单词？**
- 答案：避免与现有或未来的 HTML 标签冲突
- 考点：最佳实践

#### 【期末题/认证题】

**Q6. 下列关于组件 props 的说法，正确的是？**
A. 子组件可以直接修改 props
B. props 可以是任何类型
C. props 是可选的
D. props 可以是函数

- 答案：B、C
- 考点：props 理解

**Q7. 组件的 mounted 钩子什么时候触发？**
A. 组件创建时
B. 组件更新时
C. 组件挂载到 DOM 后
D. 组件卸载时

- 答案：C
- 考点：生命周期理解

#### 【官网题】

**Q8. 来源：Vue 官方文档 - defineProps 和 defineEmits 是什么？**
- 答案：**编译器宏**，在 `<script setup>` 中定义 props 和 events
- 考点：Composition API 语法

**Q9. 来源：Vue 官方文档 - 组件的 name 选项有什么作用？**
- 答案：用于**递归组件**、**调试**、**keep-alive 缓存**
- 考点：组件配置

#### 【实战题】

**Q10. 项目场景：一个按钮需要在多个页面使用，应该如何设计？**
- 答案：抽取为**独立组件**，通过 props 自定义样式和行为
- 考点：组件设计

**Q11. 项目场景：如何避免组件 props 类型错误？**
- 答案：使用 **Prop 验证**定义类型和默认值
- 考点：类型安全

**Q12. 项目场景：组件需要在挂载后初始化一些数据，应该用哪个钩子？**
- 答案：使用 `onMounted()` 钩子
- 考点：生命周期选择

---

### 项目常用场景

**场景1：基础组件封装**

```vue
<!-- BaseButton.vue -->
<template>
  <button
    :type="type"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot />
  </button>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'button'
  },
  disabled: Boolean
})

const emit = defineEmits(['click'])

function handleClick(event) {
  emit('click', event)
}
</script>
```

**场景2：异步组件加载**

```vue
<script setup>
import { defineAsyncComponent } from 'vue'

const AsyncComponent = defineAsyncComponent(() =>
  import('./AsyncComponent.vue')
)
</script>
```

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|---------|---------|
| props | data | props 来自父组件，data 是组件内部状态 | 外部数据用 props |
| defineProps | props 选项 | setup 编译器宏 vs Options API | 新项目用 defineProps |
| onMounted | mounted | Composition API vs Options API | 对应关系一致 |
| 递归组件 | 普通组件 | 递归组件可以调用自己 | 树形结构用递归 |

---

### 常见陷阱与坑点

**陷阱1：直接修改 props**

```javascript
// ❌ 错误：直接修改 props
props.count++

// ✓ 正确：使用 computed 或 emit
const localCount = computed(() => props.count)
emit('update:count', props.count + 1)
```

**陷阱2：忘记定义 emits**

```javascript
// ❌ 错误：没有声明 emit
emit('some-event')

// ✓ 正确：声明 emits
const emit = defineEmits(['some-event'])
```

---

### 实践信号

#### 官方进阶文档

- **[组件基础完整指南](https://vuejs.org/guide/essentials/component-basics.html)** - 组件完整文档

- **[异步组件](https://vuejs.org/guide/essentials/async-components.html)** - 异步加载组件

#### 社区热议话题

- **"Vue 3 组件设计最佳实践"** - 来源：Vue Mastery
  - 讨论要点：组件拆分原则、命名规范
  - 学习价值：组件设计指导

#### 动手验证

1. **创建可复用按钮组件**
   - 支持 type、size、disabled 属性
   - 支持自定义内容插槽

2. **练习组件通信**
   - 父组件向子组件传递数据
   - 子组件向父组件发送事件

---

## 6. 组件通信

### 核心知识点

#### 6.1 Props down, Events up

**父传子（Props）**：
```vue
<!-- 父组件 -->
<template>
  <ChildComponent :message="parentMsg" />
</template>

<!-- 子组件 -->
<script setup>
const props = defineProps({
  message: String
})
</script>
```

**子传父（Events）**：
```vue
<!-- 子组件 -->
<script setup>
const emit = defineEmits(['update'])
function handleClick() {
  emit('update', 'new value')
}
</script>

<!-- 父组件 -->
<template>
  <ChildComponent @update="handleUpdate" />
</template>
```

#### 6.2 v-model

**v-model 本质**：
```vue
<!-- 等价于 -->
<Input
  :modelValue="value"
  @update:modelValue="value = $event"
/>
```

**自定义 v-model**：
```vue
<script setup>
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])

function updateValue(newValue) {
  emit('update:modelValue', newValue)
}
</script>

<template>
  <input :value="modelValue" @input="updateValue($event.target.value)" />
</template>
```

#### 6.3 Provide / Inject

**跨层级通信**：
```vue
<!-- 祖先组件 -->
<script setup>
import { provide } from 'vue'

provide('theme', 'dark')
provide('updateTheme', (newTheme) => {
  theme.value = newTheme
})
</script>

<!-- 后代组件 -->
<script setup>
import { inject } from 'vue'

const theme = inject('theme')
const updateTheme = inject('updateTheme')
</script>
```

#### 6.4 组件 ref

**父组件访问子组件**：
```vue
<!-- 父组件 -->
<template>
  <ChildComponent ref="childRef" />
</template>

<script setup>
import { ref } from 'vue'

const childRef = ref(null)

function callChildMethod() {
  childRef.value.childMethod()
}
</script>

<!-- 子组件 -->
<script setup>
import { defineExpose } from 'vue'

function childMethod() {
  console.log('子组件方法被调用')
}

// 暴露方法给父组件
defineExpose({
  childMethod
})
</script>
```

---

### 章节题目（13道）

#### 【面试题】

**Q1. Vue 组件通信有哪些方式？**
- 答案：
  1. **Props / Events**（父子通信）
  2. **v-model**（双向绑定）
  3. **provide / inject**（跨层级）
  4. **组件 ref**（父访问子）
  5. **$attrs / $listeners**（透传）
  6. **事件总线**（Vue 3 官方不推荐，用 Pinia）
  7. **状态管理**（Pinia/Vuex）
- 考点：通信方式全面了解

**Q2. provide/inject 的响应式如何实现？**
- 答案：
  - 提供的是 **ref 或 reactive** 对象
  - 使用 **readonly** 防止被子组件修改
  - 修改时通过提供**更新函数**
- 考点：跨层级通信理解

**Q3. .sync 修饰符在 Vue 3 中怎么处理？**
- 答案：Vue 3 移除了 `.sync`，改用 **v-model** 或 **参数化 v-model**
- 考点：版本差异

#### 【论坛题】

**Q4. 来源：Stack Overflow - 祖先组件如何与后代组件通信？**
- 答案：使用 **provide / inject**
- 考点：跨层级通信

**Q5. 来源：知乎热帖 - Vue 3 为什么移除了事件总线？**
- 答案：
  - 容易导致**数据流混乱**
  - 不利于**代码维护**
  - 推荐使用 **Pinia** 状态管理
- 考点：设计理念理解

#### 【期末题/认证题】

**Q6. 下列关于组件通信的说法，错误的是？**
A. props 是单向数据流
B. emit 可以向父组件发送事件
C. provide/inject 只能向下传递
D. 组件 ref 可以访问子组件方法

- 答案：C。provide/inject 可以传递更新函数，实现双向通信
- 考点：通信方式理解

**Q7. v-model 的等价写法是？**
A. :value + @input
B. :modelValue + @update:modelValue
C. :value + @change
D. :modelValue + @change

- 答案：B
- 考点：v-model 理解

#### 【官网题】

**Q8. 来源：Vue 官方文档 - defineExpose 的作用是什么？**
- 答案：在 `<script setup>` 中**暴露属性和方法**给父组件
- 考点：组件 ref 理解

**Q9. 来源：Vue 官方文档 - v-model 的参数是什么？**
- 答案：`v-model:xxx` 用于绑定多个 v-model
- 考点：v-model 高级用法

#### 【实战题】

**Q10. 项目场景：深层级组件需要祖先的数据，应该用什么通信方式？**
- 答案：使用 **provide / inject**
- 考点：通信方式选择

**Q11. 项目场景：表单组件需要双向绑定，如何实现？**
- 答案：使用 **v-model**，子组件接收 `modelValue` prop 并 emit `update:modelValue`
- 考点：双向绑定实现

**Q12. 项目场景：父组件需要调用子组件的方法，应该怎么做？**
- 答案：使用 **组件 ref** + **defineExpose**
- 考点：组件访问

**Q13. 项目场景：兄弟组件之间如何通信？**
- 答案：
  - 通过**共同父组件**（props + emit）
  - 使用 **Pinia** 状态管理
  - 使用 **provide/inject**（如果层级允许）
- 考点：通信策略

---

### 项目常用场景

**场景1：自定义 v-model 组件**

```vue
<!-- CustomInput.vue -->
<template>
  <input
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>

<script setup>
defineProps(['modelValue'])
defineEmits(['update:modelValue'])
</script>

<!-- 使用 -->
<CustomInput v-model="inputValue" />
```

**场景2：跨层级主题传递**

```vue
<!-- 祖先 -->
<script setup>
import { provide, ref } from 'vue'

const theme = ref('light')
provide('theme', theme)
</script>

<!-- 后代 -->
<script setup>
import { inject } from 'vue'

const theme = inject('theme')
</script>
```

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|---------|---------|
| props | provide | props 父传子，provide 跨层级 | 父子用 props |
| emit | inject | emit 子传父，inject 后代接收 | 子传父用 emit |
| v-model | :value + @input | v-model 是语法糖 | 简化代码用 v-model |
| 组件 ref | $refs | Composition API vs Options API | 新项目用 ref |

---

### 常见陷阱与坑点

**陷阱1：provide 不是响应式**

```javascript
// ❌ 错误：直接提供普通值
provide('config', { theme: 'dark' })

// ✓ 正确：提供响应式对象
const config = reactive({ theme: 'dark' })
provide('config', config)
```

**陷阱2：inject 没有默认值**

```javascript
// ⚠️ 可能出错：如果祖先没有提供
const theme = inject('theme')

// ✓ 正确：提供默认值
const theme = inject('theme', 'light')
```

---

### 实践信号

#### 官方进阶文档

- **[组件 Props 完整指南](https://vuejs.org/guide/components/props.html)** - Props 验证和类型

- **[组件 Events 完整指南](https://vuejs.org/guide/components/events.html)** - Events 定义和使用

#### 社区热议话题

- **"Vue 3 组件通信最佳实践"** - 来源：Vue School
  - 讨论要点：各种通信方式的适用场景
  - 学习价值：正确选择通信方式

#### 动手验证

1. **v-model 组件练习**
   - 创建一个支持 v-model 的输入组件
   - 验证双向绑定是否正常

2. **provide/inject 练习**
   - 创建三层组件（祖先-父-子）
   - 通过 provide/inject 传递数据和更新函数

---

## 7. 组合式 API (Composition API)

### 核心知识点

#### 7.1 为什么需要 Composition API

**Options API 的问题**：
```javascript
// Options API - 逻辑分散
export default {
  data() { return { count: 0 } },
  methods: { increment() { this.count++ } },
  computed: { doubled() { return this.count * 2 } },
  mounted() { console.log(this.count) }
}
```

**Composition API 解决**：
```javascript
// Composition API - 逻辑集中
import { ref, computed, onMounted } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const doubled = computed(() => count.value * 2)

    function increment() { count.value++ }
    onMounted(() => console.log(count.value))

    return { count, doubled, increment }
  }
}
```

#### 7.2 setup 函数

```javascript
import { ref, computed } from 'vue'

export default {
  setup(props, context) {
    // props: 响应式的 props 对象
    // context: { attrs, slots, emit, expose }

    const count = ref(0)

    // 返回的内容会暴露给模板
    return {
      count
    }
  }
}
```

#### 7.3 script setup

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)

function increment() {
  count.value++
}

// 自动暴露给模板，不需要 return
</script>
```

#### 7.4 组合式函数（Composables）

```javascript
// useMouse.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  function update(event) {
    x.value = event.pageX
    y.value = event.pageY
  }

  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  return { x, y }
}

// 使用
<script setup>
import { useMouse } from './useMouse'

const { x, y } = useMouse()
</script>
```

---

### 章节题目（12道）

#### 【面试题】

**Q1. Composition API 相比 Options API 的优势是什么？**
- 答案：
  - **逻辑复用**更灵活（组合式函数 vs Mixins）
  - **代码组织**更灵活（按功能组织 vs 按选项组织）
  - **更好的 TypeScript 支持**
  - **更小的打包体积**（更好的 tree-shaking）
  - **更清晰的依赖来源**
- 考点：API 理解和选择

**Q2. setup 函数的参数是什么？**
- 答案：
  1. **props**：响应式的 props 对象
  2. **context**：包含 attrs、slots、emit、expose 的对象
- 考点：setup 理解

**Q3. 组合式函数的命名规范是什么？**
- 答案：以 **"use"** 开头，如 `useMouse`、`useFetch`
- 考点：命名规范

#### 【论坛题】

**Q4. 来源：Stack Overflow - Composition API 中如何获取组件实例？**
- 答案：在 setup 中使用 **getCurrentInstance()**（通常不需要）
- 考点：API 理解

**Q5. 来源：知乎热帖 - Composition API 会取代 Options API 吗？**
- 答案：
  - 两者会**共存**
  - 简单组件用 Options API
  - 复杂逻辑用 Composition API
  - 新项目推荐 Composition API
- 考点：API 选择策略

#### 【期末题/认证题】

**Q6. 下列关于 Composition API 的说法，错误的是？**
A. setup 在组件创建前执行
B. setup 中没有 this
C. setup 必须返回对象
D. setup 可以是异步的

- 答案：C。使用 `<script setup>` 不需要返回
- 考点：setup 理解

**Q7. script setup 中的变量会自动暴露给模板吗？**
A. 是的
B. 不是
C. 只有 ref 会暴露
D. 需要手动导出

- 答案：A
- 考点：script setup 理解

#### 【官网题】

**Q8. 来源：Vue 官方文档 - 组合式函数的命名约定是什么？**
- 答案：以 "use" 开头，如 `useFeatureName`
- 考点：命名规范

**Q9. 来源：Vue 官方文档 - setup 中为什么没有 this？**
- 答案：setup 在 **Options API 实例创建之前**执行，无法访问 this
- 考点：执行时机理解

#### 【实战题】

**Q10. 项目场景：多个组件都需要使用鼠标位置功能，如何复用？**
- 答案：创建 **useMouse** 组合式函数
- 考点：代码复用策略

**Q11. 项目场景：如何组织复杂的组件逻辑？**
- 答案：使用 Composition API 按功能拆分成多个组合式函数
- 考点：代码组织策略

**Q12. 项目场景：Composition API 中如何调用方法？**
- 答案：直接调用函数，不需要 this
- 考点：API 使用

---

### 项目常用场景

**场景1：数据获取组合式函数**

```javascript
// useFetch.js
import { ref, onMounted } from 'vue'

export function useFetch(url) {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)

  async function fetch() {
    loading.value = true
    try {
      const response = await fetch(url)
      data.value = await response.json()
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  }

  onMounted(fetch)

  return { data, error, loading, fetch }
}
```

**场景2：本地存储组合式函数**

```javascript
// useStorage.js
import { ref, watch } from 'vue'

export function useStorage(key, defaultValue) {
  const stored = localStorage.getItem(key)
  const value = ref(stored ? JSON.parse(stored) : defaultValue)

  watch(value, (newValue) => {
    localStorage.setItem(key, JSON.stringify(newValue))
  }, { deep: true })

  return value
}
```

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|---------|---------|
| setup() | script setup | 手动 return vs 自动暴露 | 新项目用 script setup |
| 组合式函数 | Mixins | 函数式显式依赖 vs 对象合并隐式 | 推荐组合式函数 |
| ref() | reactive() | 基本类型 vs 对象类型 | 基本类型用 ref |
| toRefs() | 解构 | 保持响应性 vs 丢失响应性 | 需要解构时用 toRefs |

---

### 常见陷阱与坑点

**陷阱1：解构 reactive 丢失响应性**

```javascript
const state = reactive({ count: 0 })

// ❌ count 不是响应式
const { count } = state

// ✓ 正确
const { count } = toRefs(state)
```

**陷阱2：组合式函数命名不规范**

```javascript
// ❌ 错误：没有 use 前缀
function getMouse() { ... }

// ✓ 正确
function useMouse() { ... }
```

---

### 实践信号

#### 官方进阶文档

- **[Composition API 完整指南](https://vuejs.org/guide/extras/composition-api-faq.html)** - 常见问题解答

- **[组合式函数最佳实践](https://vuejs.org/guide/reusability/composables.html)** - 编写可复用逻辑

#### 社区热议话题

- **"Top 3 Composition API pitfalls"** - 来源：Escuela Vue
  - 讨论要点：常见错误和解决方案
  - 学习价值：避免常见陷阱

#### 动手验证

1. **创建组合式函数**
   - 创建 `useCounter` 函数
   - 在多个组件中使用

2. **setup vs script setup**
   - 比较两种写法的差异
   - 体验 script setup 的简洁性

---

## 8. 生命周期钩子

### 核心知识点

#### 8.1 生命周期图解

```
创建阶段:
  beforeCreate → setup() → created → beforeMount → mounted

更新阶段:
  beforeUpdate → updated

卸载阶段:
  beforeUnmount → unmounted
```

#### 8.2 Options API vs Composition API

| Options API | Composition API | 说明 |
|-------------|-----------------|------|
| beforeCreate | setup() 前 | 实例初始化前 |
| created | setup() | 实例创建完成 |
| beforeMount | onBeforeMount() | DOM 挂载前 |
| mounted | onMounted() | DOM 挂载后 |
| beforeUpdate | onBeforeUpdate() | 更新前 |
| updated | onUpdated() | 更新后 |
| beforeUnmount | onBeforeUnmount() | 卸载前 |
| unmounted | onUnmounted() | 卸载后 |
| errorCaptured | onErrorCaptured() | 捕获错误 |

#### 8.3 常用生命周期

```vue
<script setup>
import { onMounted, onUpdated, onUnmounted } from 'vue'

onMounted(() => {
  console.log('组件已挂载到 DOM')
  // 适合：DOM 操作、API 请求
})

onUpdated(() => {
  console.log('组件已更新')
  // 注意：避免在这里修改状态
})

onUnmounted(() => {
  console.log('组件即将卸载')
  // 适合：清理定时器、事件监听器
})
</script>
```

---

### 章节题目（12道）

#### 【面试题】

**Q1. onMounted 和 created 的区别是什么？**
- 答案：
  - `created` 时**DOM 还未创建**
  - `onMounted` 时**DOM 已经挂载**
  - DOM 操作只能在 `onMounted` 中进行
- 考点：生命周期选择

**Q2. 为什么在 onUpdated 中要避免修改状态？**
- 答案：
  - 会导致**无限循环更新**
  - `onUpdated` 在状态变化后触发
  - 修改状态会再次触发更新
- 考点：生命周期陷阱

**Q3. beforeUnmount 和 unmounted 的区别是什么？**
- 答案：
  - `beforeUnmount` 时组件**还存在**，可以访问状态和 DOM
  - `unmounted` 时组件**已完全卸载**
  - 清理工作应在 `beforeUnmount` 中进行
- 考点：生命周期选择

#### 【论坛题】

**Q4. 来源：Stack Overflow - Vue 3 中如何替代 Vue 2 的 beforeCreate？**
- 答案：Vue 3 中使用 **setup()** 的开始部分
- 考点：版本差异

**Q5. 来源：知乎热帖 - 为什么 Composition API 没有对应的 beforeCreate？**
- 答案：**setup()** 本身就在 `beforeCreate`/`created` 之间执行
- 考点：生命周期理解

#### 【期末题/认证题】

**Q6. 下列生命周期钩子中，可以访问 DOM 的是？**
A. created
B. beforeMount
C. mounted
D. beforeCreate

- 答案：C
- 考点：DOM 访问时机

**Q7. 组件卸载时应该清理什么？**
A. 定时器
B. 事件监听器
C. 订阅
D. 以上都是

- 答案：D
- 考点：清理职责

#### 【官网题】

**Q8. 来源：Vue 官方文档 - onMounted 的执行时机是什么？**
- 答案：组件挂载到 DOM **之后**
- 考点：生命周期理解

**Q9. 来源：Vue 官方文档 - onErrorCaptured 的作用是什么？**
- 答案：捕获**后代组件**的错误
- 考点：错误处理

#### 【实战题】

**Q10. 项目场景：组件挂载后需要请求初始数据，应该用哪个钩子？**
- 答案：使用 **onMounted()**
- 考点：生命周期选择

**Q11. 项目场景：组件需要设置定时器，在哪个钩子中清理？**
- 答案：在 **onBeforeUnmount()** 或 **onUnmounted()** 中清理
- 考点：资源管理

**Q12. 项目场景：需要监听组件更新后的 DOM 变化，应该用什么？**
- 答案：使用 **onUpdated()**，但要小心无限循环
- 考点：DOM 操作时机

---

### 项目常用场景

**场景1：初始化数据请求**

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { fetchUser } from './api'

const user = ref(null)

onMounted(async () => {
  user.value = await fetchUser()
})
</script>
```

**场景2：清理定时器**

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const timer = ref(null)

onMounted(() => {
  timer.value = setInterval(() => {
    console.log('tick')
  }, 1000)
})

onUnmounted(() => {
  clearInterval(timer.value)
})
</script>
```

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|---------|---------|
| created | mounted | created 无 DOM，mounted 有 DOM | DOM 操作用 mounted |
| beforeUpdate | updated | beforeUpdate 前触发，updated 后触发 | 操作更新后的 DOM 用 updated |
| beforeUnmount | unmounted | beforeUnmount 组件还在，unmounted 已卸载 | 清理在 beforeUnmount |
| onMounted | mounted | Composition API vs Options API | 对应关系 |

---

### 常见陷阱与坑点

**陷阱1：在 created 中操作 DOM**

```javascript
// ❌ 错误：DOM 还不存在
created() {
  document.getElementById('app') // null
}

// ✓ 正确：在 mounted 中操作
mounted() {
  document.getElementById('app') // 正常
}
```

**陷阱2：忘记清理副作用**

```javascript
// ❌ 错误：没有清理定时器
onMounted(() => {
  setInterval(() => console.log('tick'), 1000)
})

// ✓ 正确：清理定时器
onMounted(() => {
  const timer = setInterval(() => console.log('tick'), 1000)
  onUnmounted(() => clearInterval(timer))
})
```

---

### 实践信号

#### 官方进阶文档

- **[生命周期完整指南](https://vuejs.org/guide/essentials/lifecycle.html)** - 所有生命周期钩子详解

- **[生命周期图示](https://vuejs.org/guide/extras/lifecycle.html)** - 可视化生命周期

#### 社区热议话题

- **"Vue 生命周期最佳实践"** - 来源：Vue.js Developers
  - 讨论要点：每个钩子的正确使用方式
  - 学习价值：避免生命周期误用

#### 动手验证

1. **生命周期顺序验证**
   - 在不同钩子中打印日志
   - 观察执行顺序

2. **清理副作用练习**
   - 创建一个带定时器的组件
   - 确保卸载时清理定时器

---

## 9. 指令与修饰符

### 核心知识点

#### 9.1 内置指令

**v-bind / :** - 属性绑定
```vue
<img :src="imageSrc" :alt="imageAlt" />
<div :class="{ active: isActive }"></div>
```

**v-on / @** - 事件监听
```vue
<button @click="handleClick">Click</button>
<input @keyup.enter="handleSubmit" />
```

**v-model** - 双向绑定
```vue
<input v-model="text" />
<input v-model.trim="text" />
```

**v-show / v-if** - 条件渲染
```vue
<div v-show="isVisible">Visible</div>
<div v-if="isVisible">Visible</div>
```

**v-for** - 列表渲染
```vue
<li v-for="item in items" :key="item.id">{{ item.name }}</li>
```

**v-html** - 原始 HTML
```vue
<div v-html="rawHtml"></div>
```

**v-once** - 只渲染一次
```vue
<span v-once>{{ message }}</span>
```

**v-memo** - 跳过更新（Vue 3.2+）
```vue
<div v-memo="[valueA, valueB]">
  <!-- 只有 valueA 或 valueB 变化时才更新 -->
</div>
```

#### 9.2 修饰符

**事件修饰符**：
```vue
@click.stop="onClick"      <!-- 阻止冒泡 -->
@click.prevent="onClick"   <!-- 阻止默认行为 -->
@click.self="onClick"      <!-- 只在自身触发 -->
@click.once="onClick"      <!-- 只触发一次 -->
@keyup.enter="onEnter"     <!-- 按键修饰符 -->
```

**v-model 修饰符**：
```vue
<input v-model.trim="text" />    <!-- 去除首尾空格 -->
<input v-model.number="age" />    <!-- 转为数字 -->
<input v-model.lazy="text" />    <!-- change 事件同步 -->
```

#### 9.3 自定义指令

```javascript
// 全局指令
app.directive('focus', {
  mounted(el) {
    el.focus()
  }
})

// 局部指令
<script setup>
const vFocus = {
  mounted(el) {
    el.focus()
  }
}
</script>

<!-- 使用 -->
<input v-focus />
```

**带参数的自定义指令**：
```javascript
app.directive('color', (el, binding) => {
  el.style.color = binding.value
})

<!-- 使用 -->
<div v-color="'red'">Text</div>
```

---

### 章节题目（12道）

#### 【面试题】

**Q1. v-if 和 v-show 的区别是什么？**
- 答案：
  - `v-if` 是**真正的条件渲染**，元素被**销毁/重建**
  - `v-show` 只是切换 **display: none**
  - `v-if` 切换开销大，`v-show` 初始渲染开销大
  - 频繁切换用 `v-show`
- 考点：条件渲染性能

**Q2. 事件修饰符 .stop 和 .self 的区别是什么？**
- 答案：
  - `.stop` 阻止**事件冒泡**
  - `.self` 只在**事件源是自己**时触发
- 考点：事件处理理解

**Q3. 自定义指令有哪些钩子？**
- 答案：
  - `created` - 元素创建前
  - `beforeMount` - 挂载前
  - `mounted` - 挂载后
  - `beforeUpdate` - 更新前
  - `updated` - 更新后
  - `beforeUnmount` - 卸载前
  - `unmounted` - 卸载后
- 考点：自定义指令理解

#### 【论坛题】

**Q4. 来源：Stack Overflow - v-once 的使用场景是什么？**
- 答案：**只渲染一次**的内容，如静态文本、性能优化
- 考点：性能优化

**Q5. 来源：知乎热帖 - v-memo 的作用是什么？**
- 答案：**跳过子树更新**，用于大型列表性能优化
- 考点：性能优化

#### 【期末题/认证题】

**Q6. 下列修饰符中，用于阻止事件冒泡的是？**
A. .prevent
B. .stop
C. .self
D. .once

- 答案：B
- 考点：修饰符理解

**Q7. v-model.trim 的作用是？**
A. 转为数字
B. 去除首尾空格
C. 延迟同步
D. 阻止默认行为

- 答案：B
- 考点：v-model 修饰符

#### 【官网题】

**Q8. 来源：Vue 官方文档 - 自定义指令的钩子参数有哪些？**
- 答案：`el`、`binding`、`vnode`、`prevVnode`
- 考点：自定义指令 API

**Q9. 来源：Vue 官方文档 - v-memo 的作用是什么？**
- 答案：条件性地跳过子树更新
- 考点：性能优化

#### 【实战题】

**Q10. 项目场景：表单提交需要阻止默认行为，应该怎么做？**
- 答案：使用 `.prevent` 修饰符或 `event.preventDefault()`
- 考点：事件处理

**Q11. 项目场景：需要一个自动聚焦的输入框，如何实现？**
- 答案：创建 `v-focus` 自定义指令
- 考点：自定义指令

**Q12. 项目场景：大量数据列表需要优化渲染性能，应该用什么？**
- 答案：使用 **v-memo** 或 **虚拟滚动**
- 考点：性能优化

---

### 项目常用场景

**场景1：表单提交**

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input v-model.trim="username" />
    <input v-model.number="age" type="number" />
    <button type="submit">Submit</button>
  </form>
</template>
```

**场景2：自动聚焦输入框**

```javascript
// main.js
app.directive('focus', {
  mounted(el) {
    el.focus()
  }
})

<!-- 使用 -->
<input v-focus />
```

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|---------|---------|
| v-if | v-show | v-if 销毁/重建，v-show 隐藏/显示 | 频繁切换用 v-show |
| .stop | .self | .stop 阻止冒泡，.self 只触发自己 | 需要阻止冒泡用 .stop |
| .prevent | .stop | .prevent 阻止默认，.stop 阻止冒泡 | 取消默认用 .prevent |
| v-once | v-memo | v-once 一次渲染，v-memo 条件跳过 | 性能优化 |

---

### 常见陷阱与坑点

**陷阱1：v-if 和 v-for 同时使用**

```vue
<!-- ❌ 错误：v-for 优先级更高，v-if 无法访问 item -->
<li v-for="item in items" v-if="item.active" :key="item.id">

<!-- ✓ 正确：使用计算属性 -->
<li v-for="item in activeItems" :key="item.id">
```

**陷阱2：修饰符顺序**

```vue
<!-- ✅ 正确：修饰符顺序不影响功能 -->
@click.stop.prevent="handleClick"
@click.prevent.stop="handleClick"
```

---

### 实践信号

#### 官方进阶文档

- **[指令完整指南](https://vuejs.org/guide/essentials/template-syntax.html)** - 所有指令详解

- **[自定义指令完整指南](https://vuejs.org/guide/reusability/custom-directives.html)** - 自定义指令详解

#### 社区热议话题

- **"Vue 3 性能优化技巧"** - 来源：Vue.js Developers
  - 讨论要点：v-memo、v-once 等优化手段
  - 学习价值：性能优化技巧

#### 动手验证

1. **修饰符练习**
   - 尝试不同的事件修饰符
   - 观察事件传播差异

2. **自定义指令**
   - 创建一个 v-copy 指令
   - 点击时复制文本到剪贴板

---

## 10. Vue Router 路由

### 核心知识点

#### 10.1 路由基础

**安装**：
```bash
npm install vue-router@4
```

**创建路由**：
```javascript
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import About from '../views/About.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

**注册路由**：
```javascript
// main.js
import router from './router'

app.use(router)
```

#### 10.2 路由导航

**声明式导航**：
```vue
<template>
  <router-link to="/">Home</router-link>
  <router-link to="/about">About</router-link>
  <router-view />
</template>
```

**编程式导航**：
```javascript
import { useRouter } from 'vue-router'

const router = useRouter()

router.push('/')           // 导航到 /
router.push({ path: '/' })
router.push({ name: 'home' })
router.replace('/')        // 替换历史记录
router.go(-1)              // 后退一页
```

#### 10.3 动态路由

```javascript
const routes = [
  // 动态段以 : 开头
  { path: '/user/:id', component: User }
]
```

```vue
<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const userId = route.params.id
</script>
```

#### 10.4 嵌套路由

```javascript
const routes = [
  {
    path: '/user/:id',
    component: User,
    children: [
      { path: 'profile', component: UserProfile },
      { path: 'posts', component: UserPosts }
    ]
  }
]
```

```vue
<!-- User.vue -->
<template>
  <div>
    <h2>User {{ $route.params.id }}</h2>
    <router-view />
  </div>
</template>
```

#### 10.5 路由守卫

```javascript
// 全局前置守卫
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/login')
  } else {
    next()
  }
})

// 全局后置钩子
router.afterEach((to, from) => {
  document.title = to.meta.title || 'App'
})

// 路由独享守卫
{
  path: '/admin',
  component: Admin,
  beforeEnter: (to, from, next) => {
    // ...
  }
}

// 组件内守卫
export default {
  beforeRouteEnter(to, from, next) {
    // 不能访问组件实例
    next()
  },
  beforeRouteUpdate(to, from, next) {
    // 当前路由改变，组件复用时调用
    next()
  },
  beforeRouteLeave(to, from, next) {
    // 导航离开时调用
    next()
  }
}
```

---

### 章节题目（12道）

#### 【面试题】

**Q1. router.push 和 router.replace 的区别是什么？**
- 答案：
  - `push` **添加**历史记录
  - `replace` **替换**当前历史记录
  - 用户点击**后退**时，replace 不会回到替换前的页面
- 考点：导航方法理解

**Q2. 路由守卫有哪些类型？**
- 答案：
  1. **全局守卫**：`beforeEach`、`beforeResolve`、`afterEach`
  2. **路由独享守卫**：`beforeEnter`
  3. **组件内守卫**：`beforeRouteEnter`、`beforeRouteUpdate`、`beforeRouteLeave`
- 考点：路由守卫全面了解

**Q3. $route 和 $router 的区别是什么？**
- 答案：
  - `$route` 是**当前路由对象**（path、params、query 等）
  - `$router` 是**路由实例**（push、replace、go 等方法）
- 考点：API 理解

#### 【论坛题】

**Q4. 来源：Stack Overflow - Vue Router 如何获取查询参数？**
- 答案：使用 `route.query` 或 `this.$route.query`
- 考点：查询参数获取

**Q5. 来源：知乎热帖 - 路由模式 history 和 hash 的区别是什么？**
- 答案：
  - `history`：**真正的 URL**，需要服务器配置
  - `hash`：URL 带有 **#**，不需要服务器配置
  - `history` 更美观，但需要服务器支持
- 考点：路由模式选择

#### 【期末题/认证题】

**Q6. 下列关于路由守卫的说法，错误的是？**
A. beforeEach 是全局前置守卫
B. beforeRouteLeave 是组件内守卫
C. 守卫可以异步
D. 守卫必须调用 next

- 答案：D。Vue Router 4 中守卫可以 return false 或返回路径
- 考点：路由守卫理解

**Q7. 动态路由的参数如何获取？**
A. route.query
B. route.params
C. route.meta
D. route.path

- 答案：B
- 考点：动态路由参数获取

#### 【官网题】

**Q8. 来源：Vue Router 官方文档 - createWebHistory 和 createWebHashHistory 的区别？**
- 答案：history 模式使用 HTML5 History API，hash 模式使用 URL hash
- 考点：路由模式

**Q9. 来源：Vue Router 官方文档 - router-view 的作用是什么？**
- 答案：**路由组件渲染出口**，匹配的组件会渲染在这里
- 考点：路由视图理解

#### 【实战题】

**Q10. 项目场景：用户未登录时访问需要认证的页面，应该怎么做？**
- 答案：在 **beforeEach** 守卫中检查认证状态，未登录则跳转到登录页
- 考点：路由守卫应用

**Q11. 项目场景：需要在离开页面时提示用户保存修改，应该怎么做？**
- 答案：使用 **beforeRouteLeave** 守卫
- 考点：组件内守卫

**Q12. 项目场景：子路由的 path 不需要 /，为什么？**
- 答案：嵌套路由的 path 是**相对路径**，会自动拼接父路由的 path
- 考点：嵌套路由理解

---

### 项目常用场景

**场景1：路由权限控制**

```javascript
router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('token')

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  } else {
    next()
  }
})
```

**场景2：页面标题设置**

```javascript
router.afterEach((to) => {
  document.title = to.meta.title || 'My App'
})
```

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|---------|---------|
| $route | $router | route 是路由对象，router 是路由实例 | 获取参数用 route |
| router.params | router.query | params 是动态路由，query 是 URL 参数 | 动态路由用 params |
| push | replace | push 添加历史，replace 替换历史 | 不希望回退用 replace |
| history | hash | history 需要 server 配置，hash 不需要 | 简单部署用 hash |

---

### 常见陷阱与坑点

**陷阱1：history 模式刷新 404**

```javascript
// 问题：服务器不支持 history 模式
// 解决方案：配置服务器 fallback

// Nginx 配置
location / {
  try_files $uri $uri/ /index.html;
}
```

**陷阱2：守卫中忘记调用 next**

```javascript
// ❌ 错误：导航不会继续
beforeEach((to, from) => {
  if (to.meta.requiresAuth) {
    // 忘记调用 next()
  }
})

// ✓ 正确：Vue Router 4 支持 return
beforeEach((to) => {
  if (!isAuthenticated() && to.meta.requiresAuth) {
    return '/login'  // 或 return false 取消导航
  }
})
```

---

### 实践信号

#### 官方进阶文档

- **[Vue Router 完整指南](https://router.vuejs.org/)** - Vue Router 官方文档

- **[导航守卫详解](https://router.vuejs.org/guide/advanced/navigation-guards.html)** - 守卫使用详解

#### 社区热议话题

- **"Vue Router 4 最佳实践"** - 来源：Vue School
  - 讨论要点：路由组织、守卫使用、权限控制
  - 学习价值：路由设计最佳实践

#### 动手验证

1. **路由模式对比**
   - 切换 history 和 hash 模式
   - 观察URL差异和刷新行为

2. **路由守卫练习**
   - 创建需要认证的路由
   - 实现登录拦截

---

## 11. Pinia 状态管理

### 核心知识点

#### 11.1 Pinia 基础

**安装**：
```bash
npm install pinia
```

**创建 Pinia**：
```javascript
// main.js
import { createPinia } from 'pinia'

const pinia = createPinia()
app.use(pinia)
```

#### 11.2 定义 Store

**Options Store**：
```javascript
// stores/user.js
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    name: 'John',
    age: 30
  }),

  getters: {
    doubleAge: (state) => state.age * 2
  },

  actions: {
    incrementAge() {
      this.age++
    }
  }
})
```

**Setup Store**：
```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const name = ref('John')
  const age = ref(30)

  const doubleAge = computed(() => age.value * 2)

  function incrementAge() {
    age.value++
  }

  return { name, age, doubleAge, incrementAge }
})
```

#### 11.3 使用 Store

```vue
<script setup>
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 访问 state
console.log(userStore.name)

// 访问 getters
console.log(userStore.doubleAge)

// 调用 actions
userStore.incrementAge()

// 解构（需要 storeToRefs 保持响应性）
import { storeToRefs } from 'pinia'
const { name, age } = storeToRefs(userStore)
</script>
```

#### 11.4 Store 持久化

```javascript
// 使用 pinia-plugin-persistedstate
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// Store 中配置
export const useUserStore = defineStore('user', {
  state: () => ({ user: null }),
  persist: true  // 持久化整个 store
})
```

---

### 章节题目（12道）

#### 【面试题】

**Q1. Pinia 和 Vuex 的区别是什么？**
- 答案：
  - Pinia **不需要 mutations**，直接修改 state
  - Pinia **更好的 TypeScript 支持**
  - Pinia 支持 **Composition API 风格**
  - Pinia **没有 modules**，每个 store 独立
  - Pinia **更轻量**，打包体积更小
- 考点：状态管理框架选择

**Q2. 为什么 Pinia 不需要 mutations？**
- 答案：
  - Vue 3 的响应式系统可以**追踪所有变化**
  - mutations 增加了**不必要的代码层级**
  - devtools 仍然可以**追踪状态变化**
- 考点：框架设计理解

**Q3. storeToRefs 的作用是什么？**
- 答案：
  - 解构 store 时**保持响应性**
  - 直接解构会**失去响应性**
  - 只解构 **state 和 getters**
- 考点：响应式理解

#### 【论坛题】

**Q4. 来源：Stack Overflow - Pinia store 如何持久化？**
- 答案：使用 **pinia-plugin-persistedstate** 插件
- 考点：状态持久化

**Q5. 来源：知乎热帖 - Pinia 如何实现模块化？**
- 答案：
  - Pinia **不需要** Vuex 的 modules
  - 每个 store 是**独立文件**
  - 一个 store 可以**使用其他 store**
- 考点：状态组织理解

#### 【期末题/认证题】

**Q6. 下列关于 Pinia 的说法，错误的是？**
A. Pinia 需要 mutations
B. Pinia 支持 Composition API
C. Pinia store 可以互相使用
D. Pinia 更轻量

- 答案：A。Pinia 不需要 mutations
- 考点：Pinia 特点

**Q7. Options Store 和 Setup Store 的区别是？**
A. API 风格不同
B. Setup Store 必须返回值
C. Options Store 不支持 TypeScript
D. 以上都是

- 答案：A、B
- 考点：Store 定义方式

#### 【官网题】

**Q8. 来源：Pinia 官方文档 - defineStore 的作用是什么？**
- 答案：**定义**一个新的 store
- 考点：API 理解

**Q9. 来源：Pinia 官方文档 - $reset 的作用是什么？**
- 答案：**重置** store 到初始状态（仅 Options Store）
- 考点：API 理解

#### 【实战题】

**Q10. 项目场景：用户信息需要在多个组件中共享，应该怎么做？**
- 答案：创建 **user store**
- 考点：状态共享

**Q11. 项目场景：购物车数据需要持久化到 localStorage，应该怎么做？**
- 答案：使用 **pinia-plugin-persistedstate** 插件
- 考点：状态持久化

**Q12. 项目场景：一个 store 需要使用另一个 store 的数据，应该怎么做？**
- 答案：在 store 中**引入并使用**另一个 store
- 考点：store 互操作

---

### 项目常用场景

**场景1：用户状态管理**

```javascript
// stores/auth.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)

  function setUser(userData) {
    user.value = userData
  }

  function setToken(tokenValue) {
    token.value = tokenValue
  }

  function logout() {
    user.value = null
    token.value = null
  }

  return { user, token, setUser, setToken, logout }
})
```

**场景2：购物车状态**

```javascript
// stores/cart.js
import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: []
  }),

  getters: {
    totalPrice: (state) => {
      return state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    },

    itemCount: (state) => state.items.length
  },

  actions: {
    addItem(product) {
      const existing = this.items.find(item => item.id === product.id)
      if (existing) {
        existing.quantity++
      } else {
        this.items.push({ ...product, quantity: 1 })
      }
    },

    removeItem(productId) {
      const index = this.items.findIndex(item => item.id === productId)
      if (index > -1) {
        this.items.splice(index, 1)
      }
    }
  },

  persist: true
})
```

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|---------|---------|
| Pinia | Vuex | Pinia 更简单，不需要 mutations | 新项目用 Pinia |
| state | getters | state 是数据，getters 是计算属性 | 派生数据用 getters |
| actions | methods | actions 是 store 方法，methods 是组件方法 | store 逻辑用 actions |
| storeToRefs | 直接解构 | storeToRefs 保持响应性 | 解构 store 用 storeToRefs |

---

### 常见陷阱与坑点

**陷阱1：直接解构失去响应性**

```javascript
const userStore = useUserStore()

// ❌ 错误：name 不是响应式
const { name } = userStore

// ✓ 正确：使用 storeToRefs
import { storeToRefs } from 'pinia'
const { name } = storeToRefs(userStore)
```

**陷阱2：在 Setup Store 中使用 this**

```javascript
// Setup Store 中没有 this
export const useUserStore = defineStore('user', () => {
  const name = ref('John')

  function setName(newName) {
    // ❌ 错误：Setup Store 中没有 this
    this.name = newName

    // ✓ 正确：直接修改
    name.value = newName
  }

  return { name, setName }
})
```

---

### 实践信号

#### 官方进阶文档

- **[Pinia 完整指南](https://pinia.vuejs.org/)** - Pinia 官方文档

- **[Store 持久化](https://pinia.vuejs.org/plugins/#persist-state)** - 状态持久化方案

#### 社区热议话题

- **"Pinia vs Vuex 2025"** - 来源：Dev.to
  - 讨论要点：迁移策略、最佳实践
  - 学习价值：框架选择和迁移

#### 动手验证

1. **创建用户 Store**
   - 定义用户状态和相关操作
   - 在多个组件中使用

2. **状态持久化**
   - 安装持久化插件
   - 观察刷新后状态保持

---

## 12. 过渡与动画

### 核心知识点

#### 12.1 Transition 组件

**基本用法**：
```vue
<template>
  <button @click="show = !show">Toggle</button>

  <Transition>
    <p v-if="show">Hello Vue!</p>
  </Transition>
</template>

<style>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
```

#### 12.2 过渡类名

Vue 提供了 6 个过渡类名：

| 类名 | 进入阶段 | 离开阶段 |
|-----|---------|---------|
| `-enter-from` | ✓ | | 开始进入 |
| `-enter-active` | ✓ | | 进入过程 |
| `-enter-to` | ✓ | | 进入结束 |
| `-leave-from` | | ✓ | 开始离开 |
| `-leave-active` | | ✓ | 离开过程 |
| `-leave-to` | | ✓ | 离开结束 |

#### 12.3 命名过渡

```vue
<Transition name="fade">
  <p v-if="show">Hello</p>
</Transition>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

#### 12.4 列表过渡

```vue
<TransitionGroup name="list" tag="ul">
  <li v-for="item in items" :key="item">
    {{ item }}
  </li>
</TransitionGroup>

<style>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-leave-active {
  position: absolute;
}
</style>
```

#### 12.5 JavaScript 钩子

```vue
<Transition
  @before-enter="beforeEnter"
  @enter="enter"
  @after-enter="afterEnter"
  @enter-cancelled="enterCancelled"
  @before-leave="beforeLeave"
  @leave="leave"
  @after-leave="afterLeave"
  @leave-cancelled="leaveCancelled"
>
  <p v-if="show">Hello</p>
</Transition>

<script setup>
function beforeEnter(el) {
  console.log('进入前')
}

function enter(el, done) {
  console.log('进入中')
  done() // 调用 done 表示过渡完成
}

function afterEnter(el) {
  console.log('进入后')
}
</script>
```

---

### 章节题目（11道）

#### 【面试题】

**Q1. Transition 和 TransitionGroup 的区别是什么？**
- 答案：
  - `Transition` 用于**单个元素/组件**
  - `TransitionGroup` 用于**多个元素/列表**
  - `TransitionGroup` 需要 **key**
- 考点：过渡组件选择

**Q2. Vue 过渡的类名有哪些？**
- 答案：
  - `v-enter-from`、`v-enter-active`、`v-enter-to`
  - `v-leave-from`、`v-leave-active`、`v-leave-to`
- 考点：过渡类名记忆

**Q3. 为什么列表过渡需要 position: absolute？**
- 答案：
  - 让元素**脱离文档流**
  - 其他元素可以**平滑移动**到新位置
  - 实现 **FLIP 动画**效果
- 考点：列表过渡原理

#### 【论坛题】

**Q4. 来源：Stack Overflow - Vue 过渡不生效怎么办？**
- 答案：
  - 检查是否使用了 **key**（TransitionGroup 必需）
  - 检查 CSS **transition 属性**
  - 检查元素是否**真正渲染/销毁**
- 考点：过渡调试

**Q5. 来源：知乎热帖 - 如何实现复杂动画？**
- 答案：
  - 使用 **JavaScript 钩子**
  - 集成 **GSAP** 或其他动画库
  - 使用 **FLIP 技术**
- 考点：复杂动画实现

#### 【期末题/认证题】

**Q6. 下列哪个类名表示进入过程的过渡？**
A. v-enter-from
B. v-enter-active
C. v-enter-to
D. v-leave-active

- 答案：B
- 考点：过渡类名理解

**Q7. JavaScript 钩子中 done 的作用是？**
A. 取消过渡
B. 标记过渡完成
C. 触发下一个钩子
D. 清理副作用

- 答案：B
- 考点：钩子理解

#### 【官网题】

**Q8. 来源：Vue 官方文档 - TransitionGroup 的 mode 属性是什么？**
- 答案：Vue 3 移除了 mode 属性，TransitionGroup 不再需要
- 考点：版本差异

**Q9. 来源：Vue 官方文档 - 如何实现 appear 动画？**
- 答案：使用 `appear` prop
- 考点：初始动画

#### 【实战题】

**Q10. 项目场景：列表项添加/删除需要动画，应该用什么？**
- 答案：使用 **TransitionGroup**
- 考点：过渡组件选择

**Q11. 项目场景：需要使用 GSAP 做复杂动画，应该怎么做？**
- 答案：使用 **JavaScript 钩子**，在钩子中调用 GSAP
- 考点：动画库集成

---

### 项目常用场景

**场景1：淡入淡出**

```vue
<Transition name="fade">
  <div v-if="show" class="box"></div>
</Transition>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

**场景2：滑动展开**

```vue
<Transition name="slide">
  <div v-if="show" class="panel">
    <p>Content</p>
  </div>
</Transition>

<style>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  max-height: 200px;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
```

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|---------|---------|
| Transition | TransitionGroup | 单个 vs 多个 | 单元素用 Transition |
| v-enter-from | v-enter-to | from 是开始，to 是结束 | 初始状态用 from |
| CSS 过渡 | JS 钩子 | CSS 简单，JS 复杂 | 简单动画用 CSS |
| enter | leave | enter 是进入，leave 是离开 | 进入时用 enter |

---

### 常见陷阱与坑点

**陷阱1：TransitionGroup 忘记 key**

```vue
<!-- ❌ 错误：没有 key -->
<TransitionGroup tag="ul">
  <li v-for="item in items">{{ item }}</li>
</TransitionGroup>

<!-- ✓ 正确：添加 key -->
<TransitionGroup tag="ul">
  <li v-for="item in items" :key="item">{{ item }}</li>
</TransitionGroup>
```

**陷阱2：列表动画没有 position: absolute**

```vue
<!-- 列表项离开时需要 absolute -->
<style>
.list-leave-active {
  position: absolute;  /* 重要！*/
}
</style>
```

---

### 实践信号

#### 官方进阶文档

- **[过渡完整指南](https://vuejs.org/guide/built-ins/transition.html)** - 过渡动画完整文档

- **[TransitionGroup 完整指南](https://vuejs.org/guide/built-ins/transition-group.html)** - 列表过渡详解

#### 社区热议话题

- **"Vue 动画最佳实践"** - 来源：Vue.js Developers
  - 讨论要点：性能优化、动画库集成
  - 学习价值：动画设计技巧

#### 动手验证

1. **基础过渡练习**
   - 创建淡入淡出效果
   - 尝试不同的 easing 函数

2. **列表过渡练习**
   - 创建一个可添加/删除的列表
   - 添加列表过渡动画

---

## 13. 组合式函数与可复用性

### 核心知识点

#### 13.1 组合式函数设计原则

**命名规范**：
```javascript
// ✅ 正确：use 前缀
function useMouse() { }
function useFetch() { }

// ❌ 错误：没有 use 前缀
function getMouse() { }
function fetch() { }
```

**参数设计**：
```javascript
// 可配置参数
function useFetch(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body = null
  } = options

  // ...
}
```

**返回值设计**：
```javascript
function useCounter(initialValue = 0) {
  const count = ref(initialValue)

  const doubled = computed(() => count.value * 2)

  function increment() { count.value++ }
  function decrement() { count.value-- }
  function reset() { count.value = initialValue }

  // 返回响应式状态和方法
  return {
    count,
    doubled,
    increment,
    decrement,
    reset
  }
}
```

#### 13.2 常见组合式函数模式

**本地存储同步**：
```javascript
import { watch } from 'vue'

export function useStorage(key, defaultValue) {
  const value = ref(defaultValue)

  // 从 localStorage 读取
  const stored = localStorage.getItem(key)
  if (stored !== null) {
    value.value = JSON.parse(stored)
  }

  // 同步到 localStorage
  watch(value, (newValue) => {
    localStorage.setItem(key, JSON.stringify(newValue))
  }, { deep: true })

  return value
}
```

**防抖/节流**：
```javascript
import { watch } from 'vue'

export function useDebouncedWatch(source, callback, delay = 300) {
  let timeout
  watch(source, (newValue, oldValue) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      callback(newValue, oldValue)
    }, delay)
  })
}
```

**鼠标位置**：
```javascript
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  function update(event) {
    x.value = event.pageX
    y.value = event.pageY
  }

  onMounted(() => {
    window.addEventListener('mousemove', update)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', update)
  })

  return { x, y }
}
```

#### 13.3 组合式函数组合

```javascript
import { useMouse } from './useMouse'
import { useWindowSize } from './useWindowSize'

export function useResponsive() {
  const { x, y } = useMouse()
  const { width, height } = useWindowSize()

  const isMobile = computed(() => width.value < 768)

  return {
    x, y,
    width, height,
    isMobile
  }
}
```

---

### 章节题目（11道）

#### 【面试题】

**Q1. 组合式函数相比 Mixins 的优势是什么？**
- 答案：
  - **清晰的依赖来源**（参数明确）
  - **避免命名冲突**（显式返回）
  - **更好的 TypeScript 支持**
  - **更容易测试**
- 考点：代码复用方式对比

**Q2. 组合式函数的命名规范是什么？**
- 答案：以 **"use"** 开头，如 `useFeatureName`
- 考点：命名规范

**Q3. 组合式函数中如何清理副作用？**
- 答案：使用 **onUnmounted** 钩子清理
- 考点：副作用管理

#### 【论坛题】

**Q4. 来源：Stack Overflow - 如何组合多个组合式函数？**
- 答案：在一个组合式函数中**调用其他组合式函数**，组合返回值
- 考点：函数组合

**Q5. 来源：知乎热帖 - 组合式函数应该放在哪里？**
- 答案：通常放在 **`composables/`** 或 **`use/`** 目录
- 考点：项目组织

#### 【期末题/认证题】

**Q6. 下列关于组合式函数的说法，错误的是？**
A. 必须以 use 开头
B. 可以接受参数
C. 不能调用生命周期钩子
D. 可以返回响应式对象

- 答案：C。可以调用生命周期钩子
- 考点：组合式函数理解

**Q7. 组合式函数返回值应该包含什么？**
A. 只有数据
B. 只有方法
C. 数据和方法
D. 必须返回对象

- 答案：C、D
- 考点：返回值设计

#### 【官网题】

**Q8. 来源：Vue 官方文档 - 组合式函数和普通函数的区别？**
- 答案：组合式函数可以使用**响应式 API**和**生命周期钩子**
- 考点：概念理解

**Q9. 来源：Vue 官方文档 - 组合式函数的参数设计原则？**
- 答案：**可配置**、**合理默认值**、**类型明确**
- 考点：API 设计

#### 【实战题】

**Q10. 项目场景：多个组件需要防抖功能，如何复用？**
- 答案：创建 **useDebounce** 组合式函数
- 考点：代码复用

**Q11. 项目场景：如何确保组合式函数清理副作用？**
- 答案：在函数中使用 **onUnmounted** 钩子清理
- 考点：副作用管理

---

### 项目常用场景

**场景1：API 请求封装**

```javascript
// composables/useFetch.js
import { ref } from 'vue'

export function useFetch(url) {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)

  async function fetch() {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(url)
      data.value = await response.json()
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  }

  return { data, error, loading, fetch }
}
```

**场景2：窗口大小**

```javascript
// composables/useWindowSize.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useWindowSize() {
  const width = ref(window.innerWidth)
  const height = ref(window.innerHeight)

  function update() {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }

  onMounted(() => {
    window.addEventListener('resize', update)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', update)
  })

  return { width, height }
}
```

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|---------|---------|
| 组合式函数 | 普通函数 | 可以用响应式 API 和钩子 | 需要响应式时用组合式函数 |
| composables | utils | composables 有状态，utils 纯函数 | 有状态用 composables |
| use 开头 | 其他命名 | use 是约定，不是强制 | 遵循命名约定 |

---

### 常见陷阱与坑点

**陷阱1：忘记清理副作用**

```javascript
// ❌ 错误：没有清理事件监听器
export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  onMounted(() => {
    window.addEventListener('mousemove', (e) => {
      x.value = e.pageX
      y.value = e.pageY
    })
  })
  // 忘记清理！

  // ✓ 正确：清理副作用
  onUnmounted(() => {
    window.removeEventListener('mousemove', update)
  })
}
```

---

### 实践信号

#### 官方进阶文档

- **[组合式函数完整指南](https://vuejs.org/guide/reusability/composables.html)** - 官方完整文档

- **[VueUse 文档](https://vueuse.org/)** - 丰富的组合式函数库

#### 社区热议话题

- **"VueUse 最佳实践"** - 来源：VueUse GitHub
  - 讨论要点：常用组合式函数、使用技巧
  - 学习价值：组合式函数库使用

#### 动手验证

1. **创建 useCounter**
   - 支持加减、重置
   - 支持自定义初始值

2. **创建 useLocalStorage**
   - 同步 localStorage
   - 支持默认值

---

## 14. 工具链与工程化

### 核心知识点

#### 14.1 Vite 配置

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },

  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue': ['vue', 'vue-router', 'pinia']
        }
      }
    }
  }
})
```

#### 14.2 TypeScript 支持

```vue
<script setup lang="ts">
import { ref } from 'vue'

interface User {
  name: string
  age: number
}

const user = ref<User>({
  name: 'John',
  age: 30
})

function greet(user: User): string {
  return `Hello, ${user.name}!`
}
</script>
```

#### 14.3 环境变量

```bash
# .env
VITE_APP_TITLE=My App
VITE_API_URL=http://localhost:8080

# .env.development
VITE_API_URL=http://localhost:8080

# .env.production
VITE_API_URL=https://api.example.com
```

```javascript
// 访问环境变量
const apiUrl = import.meta.env.VITE_API_URL
```

#### 14.4 测试

**Vitest**（单元测试）：
```javascript
// __tests__/Counter.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Counter from '../Counter.vue'

describe('Counter', () => {
  it('increments count when button is clicked', async () => {
    const wrapper = mount(Counter)
    const button = wrapper.find('button')

    await button.trigger('click')

    expect(wrapper.find('span').text()).toContain('1')
  })
})
```

#### 14.5 代码规范

**ESLint 配置**：
```javascript
// .eslintrc.cjs
module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true
  },
  extends: [
    'plugin:vue/vue3-recommended',
    'eslint:recommended',
    '@vue/typescript/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021
  }
}
```

---

### 章节题目（12道）

#### 【面试题】

**Q1. Vite 相比 Webpack 的优势是什么？**
- 答案：
  - 开发服务器启动**快得多**
  - 热更新**更快**
  - 使用 **ESM** 和 **esbuild**
  - 配置更**简洁**
- 考点：构建工具理解

**Q2. 环境变量为什么需要 VITE_ 前缀？**
- 答案：
  - 安全性：防止**泄露敏感信息**
  - 只有 `VITE_` 前缀的变量才会**暴露给客户端**
- 考点：环境变量理解

**Q3. Vue 项目中如何配置路径别名？**
- 答案：在 `vite.config.js` 或 `vue.config.js` 中配置 **resolve.alias**
- 考点：项目配置

#### 【论坛题】

**Q4. 来源：Stack Overflow - Vite 构建后空白页面怎么办？**
- 答案：
  - 检查 **base** 配置
  - 检查 **路由模式**（history 需要 server 配置）
  - 检查 **资源路径**
- 考点：构建问题调试

**Q5. 来源：知乎热帖 - Vue 项目如何优化打包体积？**
- 答案：
  - 使用 **Tree-shaking**
  - **代码分割**（manualChunks）
  - **按需引入**组件库
  - **压缩**和**混淆**
- 考点：性能优化

#### 【期末题/认证题】

**Q6. 下列不是 Vite 特点的是？**
A. 快速冷启动
B. 即时热更新
C. 需要 Webpack
D. 使用 Rollup 打包

- 答案：C
- 考点：Vite 理解

**Q7. 环境变量文件优先级是？**
A. .env > .env.development
B. .env.development > .env
C. 相同
D. 不确定

- 答案：B。特定环境优先级更高
- 考点：环境变量理解

#### 【官网题】

**Q8. 来源：Vite 官方文档 - Vite 的生产打包使用什么？**
- 答案：**Rollup**
- 考点：构建工具理解

**Q9. 来源：Vue 官方文档 - 如何在 Vite 中使用环境变量？**
- 答案：使用 `import.meta.env.VITE_` 前缀
- 考点：环境变量使用

#### 【实战题】

**Q10. 项目场景：开发环境需要代理 API，如何配置？**
- 答案：在 `vite.config.js` 中配置 **server.proxy**
- 考点：开发配置

**Q11. 项目场景：生产构建后文件过大，应该怎么优化？**
- 答案：使用 **manualChunks** 代码分割，**按需引入**依赖
- 考点：打包优化

**Q12. 项目场景：如何在 CI/CD 中运行测试？**
- 答案：使用 **Vitest** 或 **Jest**，配置测试命令
- 考点：测试集成

---

### 项目常用场景

**场景1：路径别名配置**

```javascript
// vite.config.js
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@utils': resolve(__dirname, 'src/utils')
    }
  }
})

// 使用
import Button from '@components/Button.vue'
```

**场景2：环境变量管理**

```javascript
// config/index.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  appTitle: import.meta.env.VITE_APP_TITLE || 'My App'
}
```

---

### 易混淆知识点

| 概念A | 概念B | 核心区别 | 使用场景 |
|-------|-------|---------|---------|
| Vite | Webpack | Vite 用 ESM，Webpack 用打包 | 新项目用 Vite |
| .env | .env.development | .env 是基础，development 覆盖 | 基础配置用 .env |
| Vitest | Jest | Vitest 与 Vite 集成更好 | Vue 3 用 Vitest |
| Tree-shaking | 代码分割 | Tree-shaking 删除未使用，代码分割拆分文件 | 都用于优化 |

---

### 常见陷阱与坑点

**陷阱1：环境变量没有 VITE_ 前缀**

```javascript
// ❌ 错误：无法访问
const apiKey = import.meta.env.API_KEY

// ✓ 正确：添加 VITE_ 前缀
const apiKey = import.meta.env.VITE_API_KEY
```

**陷阱2：history 模式刷新 404**

```javascript
// 服务器需要配置 fallback

// Nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

### 实践信号

#### 官方进阶文档

- **[Vite 完整配置](https://cn.vitejs.dev/config/)** - Vite 配置选项

- **[Vue TypeScript 支持](https://vuejs.org/guide/typescript/overview.html)** - TypeScript 集成指南

#### 社区热议话题

- **"Vite 性能优化 2025"** - 来源：Vite GitHub
  - 讨论要点：构建优化、配置技巧
  - 学习价值：项目优化技巧

#### 动手验证

1. **配置 Vite**
   - 设置路径别名
   - 配置开发代理

2. **环境变量**
   - 创建 .env 文件
   - 在代码中使用环境变量

---

## 费曼总结

> 用简单通俗的语言重新解释 Vue 的核心概念

### 核心概念类比

可以把 Vue 想象成一个**智能的 Excel 表格**：

- **响应式数据**就像 Excel 单元格——你改变一个值，所有引用它的公式自动更新
- **组件**就像 Excel 的工作表——每个工作表独立，但可以互相引用
- **Props**就像单元格引用——只能单向读取，不能修改源数据
- **Events**就像单元格联动——子表格发生变化通知父表格
- **生命周期**就像 Excel 的计算顺序——先输入数据，再计算公式，最后显示结果

### 一句话总结

**Vue 是一个自动更新 UI 的 JavaScript 框架——你改变数据，它自动更新界面。**

### 关键要点回顾

1. **响应式是核心**：数据变化自动触发 UI 更新
2. **组件化是方式**：把 UI 拆成可复用的小块
3. **声明式是风格**：描述"要什么"而不是"怎么做"
4. **渐进式是设计**：可以逐步采用，不需要一次学完

---

## 综合实践问题（3题）

### 问题1：构建一个用户管理系统

**问题描述**：
使用 Vue 3 + Composition API + Pinia + Vue Router 构建一个用户管理系统，需要实现：
1. 用户列表（支持分页、搜索、排序）
2. 用户新增/编辑表单
3. 用户删除确认
4. 路由权限控制

**涉及章节**：
- 组件基础、组件通信
- 组合式 API
- Pinia 状态管理
- Vue Router 路由
- 生命周期钩子

**解题思路**：
- 步骤1：设计路由结构和权限守卫
- 步骤2：创建 user store 管理状态
- 步骤3：创建列表、表单、确认对话框组件
- 步骤4：使用组合式函数封装 API 请求
- 步骤5：实现组件通信和状态同步

**参考答案要点**：
- 路由配置：`/users`、`/users/create`、`/users/:id/edit`
- store：`users`、`currentUser`、`loading`、`error`
- 组件：`UserList`、`UserForm`、`DeleteConfirm`
- 权限：`beforeEach` 守卫检查认证状态

---

### 问题2：实现一个购物车功能

**问题描述**：
实现一个完整的购物车功能，需要：
1. 商品列表展示
2. 添加到购物车
3. 购物车数量修改
4. 购物车总价计算
5. 持久化购物车状态

**涉及章节**：
- 响应式基础、计算属性
- 组件通信
- Pinia 状态管理
- 组合式函数
- 过渡动画

**解题思路**：
- 步骤1：创建 cart store 管理购物车状态
- 步骤2：使用计算属性计算总价和数量
- 步骤3：使用持久化插件保存状态
- 步骤4：添加过渡动画优化体验
- 步骤5：实现商品和购物车的组件通信

**参考答案要点**：
- store：`items`、`totalPrice`、`itemCount` getter
- actions：`addItem`、`removeItem`、`updateQuantity`、`clear`
- 持久化：使用 `pinia-plugin-persistedstate`
- 动画：购物车图标、列表项添加/删除动画

---

### 问题3：开发一个实时聊天应用

**问题描述**：
开发一个实时聊天应用，需要：
1. WebSocket 连接管理
2. 消息发送和接收
3. 消息列表滚动
4. 在线状态显示
5. 消息未读提醒

**涉及章节**：
- 响应式基础、侦听器
- 生命周期钩子
- 组件通信
- 组合式函数
- 工具链配置

**解题思路**：
- 步骤1：创建 `useWebSocket` 组合式函数管理连接
- 步骤2：创建 chat store 管理消息和状态
- 步骤3：使用侦听器处理新消息滚动
- 步骤4：使用组件通信实现消息提醒
- 步骤5：配置 Vite 代理处理 WebSocket

**参考答案要点**：
- `useWebSocket`：连接状态、发送消息、关闭连接
- store：`messages`、`onlineUsers`、`unreadCount`
- 生命周期：`onMounted` 连接，`onUnmounted` 断开
- 滚动：`nextTick` + `scrollIntoView`

---

## 该领域最难挑战（5题）

### 挑战1：实现虚拟滚动

**挑战描述**：
实现一个支持 10,000+ 条数据的高性能列表渲染，要求：
- 平滑滚动
- 支持动态高度
- 支持滚动到指定位置
- 内存占用恒定

**难度等级**：⭐⭐⭐⭐⭐

**涉及知识点**：
- 虚拟 DOM 原理
- 滚动事件优化
- 性能优化技巧
- IntersectionObserver API

**解决方向**：
- 只渲染可见区域内的元素
- 使用 `transform` 而非 `scrollTop` 实现滚动
- 缓存已计算的高度
- 使用 `requestAnimationFrame` 优化

**推荐资源**：
- [vue-virtual-scroller](https://github.com/Akryum/vue-virtual-scroller) 源码
- [虚拟滚动原理](https://blog.cloudflare.com/how-we-built-the-cloudflare-dashboard-2/)

**预计攻克时间**：20-40 小时

---

### 挑战2：设计一个高可复用的表单系统

**挑战描述**：
设计一个支持以下特性的表单系统：
- 动态表单生成（基于 JSON schema）
- 字段级验证和跨字段验证
- 条件显示（某些字段基于其他字段显示/隐藏）
- 异步验证（如用户名唯一性检查）
- 表单状态持久化和恢复

**难度等级**：⭐⭐⭐⭐⭐

**涉及知识点**：
- 组件设计模式
- 响应式深入理解
- 异步状态管理
- TypeScript 高级类型
- 表单验证理论

**解决方向**：
- 设计清晰的 Schema 规范
- 实现递归组件渲染
- 使用依赖图处理条件显示
- 设计可插拔的验证器系统

**推荐资源**：
- [FormKit](https://formkit.com/) 源码
- [VeeValidate](https://vee-validate.logaretm.com/) 文档

**预计攻克时间**：30-50 小时

---

### 挑战3：实现一个完全响应式的拖拽系统

**挑战描述**：
实现一个支持以下特性的拖拽系统：
- 列表内排序
- 跨列表拖拽
- 嵌套列表拖拽
- 触摸设备支持
- 拖拽预览和占位符

**难度等级**：⭐⭐⭐⭐

**涉及知识点**：
- HTML5 Drag & Drop API
- Touch Events
- 坐标计算和碰撞检测
- 性能优化
- 响应式与 DOM 操作结合

**解决方向**：
- 统一处理 Mouse 和 Touch 事件
- 使用 `transform` 实现拖拽预览
- 实现高效的碰撞检测算法
- 优化拖拽过程中的重渲染

**推荐资源**：
- [SortableJS](https://github.com/SortableJS/Sortable) 源码
- [Vue.Draggable](https://github.com/SortableJS/Vue.Draggable) 文档

**预计攻克时间**：20-30 小时

---

### 挑战4：从零实现一个迷你 Vue 响应式系统

**挑战描述**：
不使用 Vue，从零实现一个包含以下特性的响应式系统：
- `reactive` 和 `ref` API
- `computed` 计算属性
- `watch` 和 `watchEffect`
- 依赖收集和触发更新
- 嵌套对象和数组支持

**难度等级**：⭐⭐⭐⭐⭐

**涉及知识点**：
- Proxy API 深入理解
- 依赖追踪算法
- 副作用队列
- 计算属性缓存
- 循环依赖处理

**解决方向**：
- 使用 Proxy 包装对象
- 使用 WeakMap 存储依赖关系
- 实现依赖收集和触发机制
- 实现计算属性的缓存系统

**推荐资源**：
- [Vue 3 响应式原理](https://vuejs.org/guide/extras/reactivity-in-depth.html)
- [@vue/reactivity](https://github.com/vuejs/core/tree/main/packages/reactivity) 源码

**预计攻克时间**：40-60 小时

---

### 挑战5：设计一个大型 Vue 应用的状态架构

**挑战描述**：
为一个包含以下模块的大型应用设计状态架构：
- 用户认证和权限
- 多实体数据管理（如 CRM 系统的客户、订单、产品）
- 实时数据同步
- 离线支持
- 状态持久化

**难度等级**：⭐⭐⭐⭐⭐

**涉及知识点**：
- 状态管理设计模式
- 数据一致性理论
- 实时同步策略
- 离线优先架构
- 性能优化

**解决方向**：
- 设计清晰的 Store 模块划分
- 实现乐观更新和错误回滚
- 设计高效的同步策略
- 使用 IndexedDB 实现离线支持

**推荐资源**：
- [Pinia 最佳实践](https://pinia.vuejs.org/cookbook/)
- [Redux 设计模式](https://redux.js.org/style-guide/style-guide)（可借鉴）
- [离线优先应用](https://web.dev/offline-fallback-with-service-worker/)

**预计攻克时间**：40-80 小时

---

## 学习检查清单

完成本文档学习后，你应该能够：

- [ ] 理解 Vue 的响应式原理和 MVVM 模式
- [ ] 创建 Vue 3 项目并配置开发环境
- [ ] 使用模板语法和响应式 API 构建界面
- [ ] 使用计算属性和侦听器处理派生数据和副作用
- [ ] 创建和使用组件，实现组件通信
- [ ] 使用 Composition API 组织复杂逻辑
- [ ] 理解生命周期钩子的使用时机
- [ ] 使用内置指令和自定义指令
- [ ] 配置和使用 Vue Router
- [ ] 使用 Pinia 管理应用状态
- [ ] 实现过渡和动画效果
- [ ] 编写组合式函数实现代码复用
- [ ] 配置 Vite 和项目工程化

---

## 进一步学习资源

### 官方资源
- [Vue.js 官方文档](https://vuejs.org/)
- [Vue Router 官方文档](https://router.vuejs.org/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)

### 社区资源
- **推荐书籍**：《Vue.js 设计与实现》、《Vue.js 3 技术揭秘》
- **推荐课程**：[Vue Mastery](https://www.vuemastery.com/)、[Vue School](https://vueschool.io/)
- **技术博客**：[Vue.js Developers](https://vuejsdevelopers.com/)

### 实战项目
- **推荐项目1**：构建一个完整的待办事项应用
- **推荐项目2**：开发一个电商网站
- **推荐项目3**：创建一个仪表板系统

### 工具库
- **VueUse**：[https://vueuse.org/](https://vueuse.org/) - 丰富的组合式函数库
- **Element Plus**：[https://element-plus.org/](https://element-plus.org/) - Vue 3 UI 组件库
- **Vitest**：[https://vitest.dev/](https://vitest.dev/) - 单元测试框架

---

**文档版本**：v1.0
**最后更新**：2026-06-29

---

**Sources**:
- [Vue.js Official Documentation](https://vuejs.org/)
- [Vue.js API Reference](https://vuejs.org/api/)
- [Vue Router Documentation](https://router.vuejs.org/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Stack Overflow Vue.js Questions](https://stackoverflow.com/questions/tagged/vue.js)
- [Stack Overflow 2025 Developer Survey](https://survey.stackoverflow.co/2025/technology)
- [Top 3 Composition API Pitfalls - Escuela Vue](https://escuelavue.es/en/devtips/top-3-composition-api-pitfalls)
- [Common Mistakes When Creating Composition Functions - Telerik](https://www.telerik.com/blogs/common-mistakes-creating-composition-functions-vue)
