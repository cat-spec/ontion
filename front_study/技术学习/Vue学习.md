# Vue 官方文档精读与代码用法

> 资料来源：
> - Vue 官方文档 Guide：https://vuejs.org/guide/introduction.html
> - Vue 官方 API：https://vuejs.org/api/
> - Vue 单文件组件文档：https://vuejs.org/api/sfc-spec.html
> - Vue Router 官方文档：https://router.vuejs.org/
> - Pinia 官方文档：https://pinia.vuejs.org/
>
> 目标版本：Vue 3.5.35
> 适合人群：已掌握 HTML、CSS、JavaScript，准备系统学习 Vue 3 的前端开发者。
> 输出时间：2026-06-10

## 1. 技术定位与核心模型

Vue 是一个用于构建用户界面的渐进式 JavaScript 框架。Vue 3 的主线写法是组合式 API 和单文件组件，也就是在 `.vue` 文件中用 `<template>` 写视图，用 `<script setup>` 写逻辑，用 `<style>` 写样式。

Vue 的核心模型可以理解为：

| 模块 | 作用 | 关键能力 |
| --- | --- | --- |
| 响应式系统 | 追踪状态变化并驱动视图更新 | `ref()`、`reactive()`、`computed()`、`watch()` |
| 模板编译 | 把模板语法编译成渲染函数 | 插值、指令、事件、条件、列表 |
| 组件系统 | 拆分 UI 与业务逻辑 | props、emits、slots、provide/inject |
| 应用实例 | 创建并挂载 Vue 应用 | `createApp()`、`app.use()`、`app.mount()` |
| SFC | 将组件结构、逻辑、样式组织在一个文件中 | `<template>`、`<script setup>`、`<style scoped>` |
| 官方生态 | 处理大型应用能力 | Vue Router、Pinia、Vite、SSR、测试 |

核心心智：数据不是手动同步到 DOM，而是声明「状态是什么、视图如何依赖状态」。状态改变后，Vue 自动重新渲染受影响的部分。

### 1.1 常考题

1. Vue 3 为什么推荐组合式 API？
   答：组合式 API 更适合按业务逻辑组织代码，便于复用、类型推导和拆分大型组件。
2. `ref()` 和普通变量的区别是什么？
   答：`ref()` 返回响应式对象，值变化会触发视图更新；普通变量不会被 Vue 跟踪。
3. Vue 的「渐进式」体现在哪里？
   答：可以只作为页面增强库使用，也可以结合 Router、Pinia、构建工具组成完整 SPA。

### 1.2 小案例

目标：理解「状态驱动视图」。

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button @click="count++">点击次数：{{ count }}</button>
</template>
```

预期行为：点击按钮时 `count.value` 被更新，模板中的 `{{ count }}` 自动刷新。模板中 ref 会自动解包，因此不需要写 `count.value`。

## 2. 环境与最小可运行示例

Vue 官方推荐使用 `create-vue` 创建基于 Vite 的项目。

```bash
npm create vue@latest
cd your-vue-project
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

推荐开发环境：VS Code + Vue Official 扩展。Vue 3 项目通常使用 Vite，入口结构如下：

```text
src/
  main.js
  App.vue
  components/
```

最小入口：

```js
// src/main.js
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

最小组件：

```vue
<!-- src/App.vue -->
<script setup>
import { ref } from 'vue'

const message = ref('Hello Vue')
</script>

<template>
  <main>
    <h1>{{ message }}</h1>
    <input v-model="message" />
  </main>
</template>
```

### 2.1 应用实例 API

| API | 类型 | 作用 | 基本写法 | 参数/选项 | 返回值/结果 | 注意事项 |
| --- | --- | --- | --- | --- | --- | --- |
| `createApp()` | 函数 | 创建 Vue 应用实例 | `createApp(App)` | 根组件、可选 props | app 实例 | 一个页面可创建多个 app，但常规 SPA 只创建一个 |
| `app.mount()` | 方法 | 挂载应用到 DOM | `app.mount('#app')` | CSS 选择器或 DOM 元素 | 根组件实例 | 目标容器会被 Vue 接管 |
| `app.use()` | 方法 | 安装插件 | `app.use(router)` | 插件对象或函数 | app 实例 | Router、Pinia 都通过它安装 |
| `app.component()` | 方法 | 注册全局组件 | `app.component('BaseButton', BaseButton)` | 名称、组件对象 | app 实例 | 全局注册过多会增加依赖不透明度 |
| `app.provide()` | 方法 | 应用级依赖注入 | `app.provide('apiBase', '/api')` | key、value | app 实例 | 适合全局配置，不适合替代状态管理 |

### 2.2 常见错误与排查

| 错误 | 表现 | 原因 | 修复 |
| --- | --- | --- | --- |
| 忘记 `mount` | 页面空白 | app 创建后没有挂载 | 调用 `createApp(App).mount('#app')` |
| 挂载选择器错误 | 页面空白或控制台报错 | HTML 中没有对应节点 | 检查 `index.html` 是否有 `<div id="app"></div>` |
| 插件未安装 | 路由、store 不可用 | 忘记 `app.use()` | 在 `mount` 前安装插件 |

### 2.3 常考题

1. `createApp(App).mount('#app')` 做了什么？
   答：创建 Vue 应用并把根组件渲染到页面的 `#app` 容器。
2. 为什么插件要在 `mount` 前安装？
   答：组件初始化时需要读取插件注入的能力，例如路由实例、全局属性、store。
3. 全局组件和局部组件如何取舍？
   答：高频基础组件可全局注册，业务组件优先局部导入。

## 3. 单文件组件与 `<script setup>`

单文件组件简称 SFC，文件后缀为 `.vue`。典型结构：

```vue
<script setup>
const title = '用户列表'
</script>

<template>
  <h1>{{ title }}</h1>
</template>

<style scoped>
h1 {
  color: #42b883;
}
</style>
```

### 3.1 代码用法逐条说明

| 项目 | 类型 | 作用 | 基本写法 | 参数/选项 | 返回值/结果 | 注意事项 |
| --- | --- | --- | --- | --- | --- | --- |
| `<template>` | SFC 块 | 写组件模板 | `<template>...</template>` | 支持 Vue 模板语法 | 编译为渲染函数 | 顶层可以有多个节点 |
| `<script setup>` | SFC 块 | 写组合式 API 逻辑 | `<script setup>...</script>` | 可加 `lang="ts"` | 顶层变量直接暴露给模板 | 不需要 `return` |
| `<style scoped>` | SFC 块 | 写组件局部样式 | `<style scoped>...</style>` | `scoped`、`lang` | 样式只作用于当前组件 | 深度选择器要用 `:deep()` |
| `defineProps()` | 编译宏 | 声明 props | `const props = defineProps({...})` | 运行时对象或 TS 类型 | props 对象 | 不需要 import |
| `defineEmits()` | 编译宏 | 声明事件 | `const emit = defineEmits(['save'])` | 事件数组或对象 | emit 函数 | 不需要 import |
| `defineModel()` | 编译宏 | 声明组件 `v-model` | `const model = defineModel()` | 名称、默认值、类型 | ref | Vue 3.4+ 推荐 |
| `defineExpose()` | 编译宏 | 暴露组件实例方法 | `defineExpose({ focus })` | 对象 | 父组件 ref 可访问 | 默认 `<script setup>` 内部变量不暴露 |

### 3.2 Props 与 Emits 示例

```vue
<!-- UserCard.vue -->
<script setup>
const props = defineProps({
  user: {
    type: Object,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits({
  select: (id) => typeof id === 'number'
})

function handleClick() {
  emit('select', props.user.id)
}
</script>

<template>
  <article :class="{ active }" @click="handleClick">
    <h3>{{ user.name }}</h3>
    <p>{{ user.email }}</p>
  </article>
</template>
```

父组件使用：

```vue
<script setup>
import UserCard from './UserCard.vue'

const user = { id: 1, name: 'Ada', email: 'ada@example.com' }

function onSelect(id) {
  console.log('selected user id:', id)
}
</script>

<template>
  <UserCard :user="user" active @select="onSelect" />
</template>
```

### 3.3 常见错误与排查

| 错误 | 表现 | 原因 | 修复 |
| --- | --- | --- | --- |
| 在 `<script setup>` 中写 `export default` | 编译或风格混乱 | 混用 Options API | 普通场景不需要 `export default` |
| 忘记声明 emits | 开发警告 | 组件触发了未声明事件 | 用 `defineEmits()` 明确声明 |
| 直接修改 props | 警告或数据流混乱 | props 是父到子的单向数据 | emit 事件让父组件更新 |

### 3.4 常考题

1. `<script setup>` 为什么不需要 `return`？
   答：编译器会把顶层绑定暴露给模板。
2. `defineProps()` 和 `defineEmits()` 是否需要 import？
   答：不需要，它们是 SFC 编译宏。
3. 为什么子组件不能直接修改 props？
   答：props 代表父组件传入的数据，直接修改会破坏单向数据流。

### 3.5 小案例

目标：封装可复用搜索框。

```vue
<!-- SearchBox.vue -->
<script setup>
const keyword = defineModel({ default: '' })

defineProps({
  placeholder: {
    type: String,
    default: '请输入关键词'
  }
})
</script>

<template>
  <label>
    搜索：
    <input v-model="keyword" :placeholder="placeholder" />
  </label>
</template>
```

```vue
<!-- App.vue -->
<script setup>
import { ref } from 'vue'
import SearchBox from './SearchBox.vue'

const keyword = ref('')
</script>

<template>
  <SearchBox v-model="keyword" placeholder="搜索用户" />
  <p>当前关键词：{{ keyword }}</p>
</template>
```

## 4. 响应式基础：`ref`、`reactive`、`computed`

Vue 响应式 API 的核心是把普通数据变成可追踪数据。组件渲染时读取响应式数据，数据变更后 Vue 重新渲染依赖它的视图。

### 4.1 代码用法逐条说明

| 项目 | 类型 | 作用 | 基本写法 | 参数/选项 | 返回值/结果 | 注意事项 |
| --- | --- | --- | --- | --- | --- | --- |
| `ref()` | 函数 | 创建任意类型响应式值 | `const count = ref(0)` | 初始值 | `{ value }` | JS 中读写 `.value`，模板中自动解包 |
| `reactive()` | 函数 | 创建响应式对象 | `const state = reactive({ count: 0 })` | 对象、数组、Map 等 | 代理对象 | 不能整体替换，否则丢失响应式引用 |
| `computed()` | 函数 | 创建缓存派生状态 | `const total = computed(() => price.value * count.value)` | getter 或 `{ get, set }` | 只读或可写 ref | 只在依赖变化时重新计算 |
| `readonly()` | 函数 | 创建只读代理 | `readonly(state)` | 响应式对象 | 只读代理 | 写入会在开发环境警告 |
| `toRef()` | 函数 | 把对象属性转成 ref | `toRef(state, 'count')` | 对象、key | ref | 适合解构时保留响应式 |
| `toRefs()` | 函数 | 把对象每个属性转成 ref | `const { count } = toRefs(state)` | 响应式对象 | refs 对象 | 常用于 composable 返回 reactive 状态 |

### 4.2 `ref()` 示例

```vue
<script setup>
import { ref } from 'vue'

const name = ref('Vue')
const age = ref(10)

function grow() {
  age.value++
}
</script>

<template>
  <input v-model="name" />
  <button @click="grow">{{ name }} 已经 {{ age }} 岁</button>
</template>
```

要点：

- 在 JavaScript 中必须写 `age.value++`。
- 在模板中写 `{{ age }}`，Vue 自动读取 `.value`。
- `ref` 可以包裹字符串、数字、布尔、数组、对象。

### 4.3 `reactive()` 示例

```vue
<script setup>
import { reactive } from 'vue'

const form = reactive({
  username: '',
  role: 'user',
  enabled: true
})

function reset() {
  form.username = ''
  form.role = 'user'
  form.enabled = true
}
</script>

<template>
  <input v-model="form.username" />
  <select v-model="form.role">
    <option value="user">用户</option>
    <option value="admin">管理员</option>
  </select>
  <label>
    <input type="checkbox" v-model="form.enabled" />
    启用
  </label>
  <button @click="reset">重置</button>
</template>
```

常见坑：

```js
let form = reactive({ username: 'a' })

// 错误：整体替换会让原来的响应式引用失效
form = { username: 'b' }

// 正确：修改属性
form.username = 'b'
```

### 4.4 `computed()` 示例

```vue
<script setup>
import { computed, ref } from 'vue'

const price = ref(99)
const quantity = ref(2)

const total = computed(() => price.value * quantity.value)

const formattedTotal = computed(() => `¥${total.value.toFixed(2)}`)
</script>

<template>
  <input type="number" v-model.number="price" />
  <input type="number" v-model.number="quantity" />
  <p>总价：{{ formattedTotal }}</p>
</template>
```

可写 computed：

```vue
<script setup>
import { computed, ref } from 'vue'

const firstName = ref('Ada')
const lastName = ref('Lovelace')

const fullName = computed({
  get() {
    return `${firstName.value} ${lastName.value}`
  },
  set(value) {
    const [first, last] = value.split(' ')
    firstName.value = first || ''
    lastName.value = last || ''
  }
})
</script>

<template>
  <input v-model="fullName" />
  <p>{{ firstName }} / {{ lastName }}</p>
</template>
```

### 4.5 常见错误与排查

| 错误 | 表现 | 原因 | 修复 |
| --- | --- | --- | --- |
| JS 中忘写 `.value` | 数据不变或取到 ref 对象 | `ref` 的值在 `.value` 上 | 在脚本中使用 `count.value` |
| 解构 reactive 后失去响应式 | 视图不更新 | 解构得到普通值 | 使用 `toRefs()` |
| computed 内部有副作用 | 行为难预测 | computed 应表示纯派生值 | 副作用放到 `watch()` |
| 用 method 代替复杂 computed | 每次渲染都执行 | method 不缓存 | 依赖状态的派生值用 computed |

### 4.6 常考题

1. `ref` 和 `reactive` 如何选择？
   答：基本类型或需要整体替换时用 `ref`；结构稳定的对象可用 `reactive`。
2. 为什么 `computed` 有缓存？
   答：只有依赖的响应式数据变化时才重新执行 getter。
3. `reactive` 解构为什么会丢失响应式？
   答：解构后拿到的是普通属性值，不再经过代理对象访问。
4. `computed` 和 `watch` 的区别是什么？
   答：computed 产生派生值，watch 处理副作用。

### 4.7 小案例

目标：实现购物车总价。

```vue
<script setup>
import { computed, reactive } from 'vue'

const cart = reactive([
  { id: 1, name: '键盘', price: 299, quantity: 1 },
  { id: 2, name: '鼠标', price: 99, quantity: 2 }
])

const total = computed(() =>
  cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
)
</script>

<template>
  <ul>
    <li v-for="item in cart" :key="item.id">
      {{ item.name }}：
      <input type="number" min="1" v-model.number="item.quantity" />
      小计 {{ item.price * item.quantity }}
    </li>
  </ul>
  <strong>合计：{{ total }}</strong>
</template>
```

扩展任务：增加删除商品、清空购物车、满减优惠。

## 5. 模板语法与内置指令

Vue 模板是一种声明式 HTML 增强语法。模板中可以使用响应式状态、表达式、事件绑定和指令。

### 5.1 高频指令速查

| 指令 | 类型 | 作用 | 基本写法 | 参数/修饰符 | 结果 | 注意事项 |
| --- | --- | --- | --- | --- | --- | --- |
| `v-text` | 指令 | 设置文本内容 | `<p v-text="msg" />` | 无 | 等价文本插入 | 会覆盖元素内部内容 |
| `v-html` | 指令 | 插入 HTML | `<div v-html="html" />` | 无 | 渲染 HTML | 不要渲染不可信内容，防 XSS |
| `v-bind` / `:` | 指令 | 绑定属性 | `:id="id"` | 参数是属性名 | 属性随状态变化 | 布尔属性按真假处理 |
| `v-on` / `@` | 指令 | 绑定事件 | `@click="save"` | 事件名、修饰符 | 触发方法 | 可传 `$event` |
| `v-if` | 指令 | 条件渲染 | `v-if="ok"` | `v-else-if`、`v-else` | 真正创建/销毁 DOM | 适合切换不频繁 |
| `v-show` | 指令 | 条件显示 | `v-show="ok"` | 无 | 切换 `display` | 适合频繁切换 |
| `v-for` | 指令 | 列表渲染 | `v-for="item in list"` | 支持 index | 渲染多项 | 必须提供稳定 `:key` |
| `v-model` | 指令 | 双向绑定表单或组件 | `v-model="value"` | `.trim`、`.number`、`.lazy` | 输入更新状态 | 组件上等价 prop + event |
| `v-slot` / `#` | 指令 | 声明插槽内容 | `<template #default>` | 插槽名 | 向子组件传模板 | 具名插槽常用简写 `#name` |
| `v-pre` | 指令 | 跳过编译 | `<span v-pre>{{ raw }}</span>` | 无 | 原样输出 | 用于展示模板代码 |
| `v-once` | 指令 | 只渲染一次 | `<h1 v-once>{{ title }}</h1>` | 无 | 后续不更新 | 适合静态内容 |
| `v-memo` | 指令 | 条件性跳过更新 | `v-memo="[id]"` | 依赖数组 | 优化大列表 | 不要滥用 |
| `v-cloak` | 指令 | 隐藏未编译模板 | `[v-cloak]{display:none}` | 无 | 编译后移除 | 常用于 CDN 直接使用 |

### 5.2 属性绑定 `v-bind`

```vue
<script setup>
import { ref } from 'vue'

const imageUrl = ref('/logo.png')
const isActive = ref(true)
const attrs = {
  id: 'main-button',
  type: 'button'
}
</script>

<template>
  <img :src="imageUrl" alt="logo" />
  <button v-bind="attrs" :class="{ active: isActive }">提交</button>
</template>
```

要点：

- `:src` 是 `v-bind:src` 的简写。
- `v-bind="attrs"` 可一次性绑定对象中的所有属性。
- class 和 style 支持字符串、对象、数组。

### 5.3 事件绑定 `v-on`

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)

function add(step, event) {
  count.value += step
  console.log(event.type)
}
</script>

<template>
  <button @click="add(2, $event)">+2</button>
  <p>{{ count }}</p>
</template>
```

常用事件修饰符：

| 修饰符 | 作用 | 示例 |
| --- | --- | --- |
| `.stop` | 阻止冒泡 | `@click.stop="open"` |
| `.prevent` | 阻止默认行为 | `@submit.prevent="save"` |
| `.once` | 只触发一次 | `@click.once="init"` |
| `.self` | 只在事件目标为自身时触发 | `@click.self="close"` |
| `.capture` | 捕获阶段触发 | `@click.capture="handle"` |
| `.passive` | 告诉浏览器不会阻止默认滚动 | `@scroll.passive="onScroll"` |

键盘修饰符：

```vue
<input @keyup.enter="submit" />
<input @keyup.esc="cancel" />
```

### 5.4 条件与列表

```vue
<script setup>
import { ref } from 'vue'

const loading = ref(false)
const users = ref([
  { id: 1, name: 'Ada', role: 'admin' },
  { id: 2, name: 'Linus', role: 'user' }
])
</script>

<template>
  <p v-if="loading">加载中...</p>
  <ul v-else>
    <li v-for="(user, index) in users" :key="user.id">
      {{ index + 1 }}. {{ user.name }} - {{ user.role }}
    </li>
  </ul>
</template>
```

关键规则：

- `v-if` 会创建和销毁节点。
- `v-show` 只控制 CSS 显示。
- `v-for` 必须使用稳定、唯一的 `key`，不要优先用 index。
- 同一个元素上不建议同时写 `v-if` 和 `v-for`，应先用 computed 过滤列表。

### 5.5 表单绑定 `v-model`

```vue
<script setup>
import { reactive } from 'vue'

const form = reactive({
  name: '',
  age: 18,
  gender: 'male',
  skills: [],
  agreed: false
})
</script>

<template>
  <input v-model.trim="form.name" placeholder="姓名" />
  <input type="number" v-model.number="form.age" />

  <label><input type="radio" value="male" v-model="form.gender" /> 男</label>
  <label><input type="radio" value="female" v-model="form.gender" /> 女</label>

  <label><input type="checkbox" value="Vue" v-model="form.skills" /> Vue</label>
  <label><input type="checkbox" value="TypeScript" v-model="form.skills" /> TypeScript</label>

  <label><input type="checkbox" v-model="form.agreed" /> 同意协议</label>

  <pre>{{ form }}</pre>
</template>
```

`v-model` 修饰符：

| 修饰符 | 作用 | 示例 |
| --- | --- | --- |
| `.lazy` | change 事件后同步，而不是 input 后同步 | `v-model.lazy="value"` |
| `.number` | 输入值转数字 | `v-model.number="age"` |
| `.trim` | 去除首尾空格 | `v-model.trim="name"` |

### 5.6 常见错误与排查

| 错误 | 表现 | 原因 | 修复 |
| --- | --- | --- | --- |
| `v-for` 用 index 作为 key | 删除、排序后 DOM 复用错误 | key 不稳定 | 使用业务 id |
| `v-html` 渲染用户输入 | XSS 风险 | HTML 会被直接插入 | 只渲染可信 HTML |
| `v-if` 和 `v-for` 写同一元素 | 逻辑混乱 | 优先级和可读性问题 | 用 computed 先过滤 |
| 表单数字仍是字符串 | 类型错误 | HTML 输入默认字符串 | 使用 `.number` |

### 5.7 常考题

1. `v-if` 和 `v-show` 有什么区别？
   答：`v-if` 控制 DOM 创建销毁，`v-show` 控制 CSS display。
2. 为什么 `v-for` 需要 key？
   答：帮助 Vue 正确追踪节点身份，避免错误复用。
3. `@submit.prevent` 等价于什么？
   答：监听 submit 并调用 `event.preventDefault()`。
4. `v-model` 在输入框上本质是什么？
   答：绑定 value 并监听输入事件更新状态。

### 5.8 小案例

目标：实现可过滤用户列表。

```vue
<script setup>
import { computed, ref } from 'vue'

const keyword = ref('')
const users = ref([
  { id: 1, name: 'Ada', role: 'admin' },
  { id: 2, name: 'Evan', role: 'user' },
  { id: 3, name: 'Sarah', role: 'user' }
])

const filteredUsers = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  if (!key) return users.value
  return users.value.filter((user) =>
    user.name.toLowerCase().includes(key) || user.role.includes(key)
  )
})
</script>

<template>
  <input v-model.trim="keyword" placeholder="搜索姓名或角色" />
  <p v-if="filteredUsers.length === 0">暂无数据</p>
  <ul v-else>
    <li v-for="user in filteredUsers" :key="user.id">
      {{ user.name }}：{{ user.role }}
    </li>
  </ul>
</template>
```

## 6. 侦听器：`watch` 与 `watchEffect`

侦听器用于响应状态变化并执行副作用，例如请求接口、写入本地缓存、操作第三方库。

### 6.1 代码用法逐条说明

| 项目 | 类型 | 作用 | 基本写法 | 参数/选项 | 返回值/结果 | 注意事项 |
| --- | --- | --- | --- | --- | --- | --- |
| `watch()` | 函数 | 精确监听指定数据源 | `watch(source, callback, options)` | `source`、回调、配置 | 停止函数 | 可拿到新旧值 |
| `watchEffect()` | 函数 | 自动收集依赖并立即执行 | `watchEffect(callback)` | 回调 | 停止函数 | 不适合需要旧值的场景 |
| `watchPostEffect()` | 函数 | DOM 更新后执行 effect | `watchPostEffect(callback)` | 回调 | 停止函数 | 适合读取更新后的 DOM |
| `watchSyncEffect()` | 函数 | 同步执行 effect | `watchSyncEffect(callback)` | 回调 | 停止函数 | 谨慎使用，可能影响性能 |

`watch` 常用选项：

| 选项 | 作用 | 示例 |
| --- | --- | --- |
| `immediate` | 创建后立即执行一次 | `{ immediate: true }` |
| `deep` | 深度监听对象内部变化 | `{ deep: true }` |
| `flush` | 控制回调执行时机 | `{ flush: 'post' }` |
| `once` | 只触发一次 | `{ once: true }` |

### 6.2 `watch()` 示例

```vue
<script setup>
import { ref, watch } from 'vue'

const keyword = ref('')
const result = ref([])
const loading = ref(false)

watch(keyword, async (newKeyword, oldKeyword) => {
  if (!newKeyword.trim()) {
    result.value = []
    return
  }

  loading.value = true
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(newKeyword)}`)
    result.value = await response.json()
  } finally {
    loading.value = false
  }
}, { immediate: false })
</script>
```

监听多个来源：

```js
watch([page, pageSize], ([newPage, newSize], [oldPage, oldSize]) => {
  loadList({ page: newPage, pageSize: newSize })
})
```

监听 getter：

```js
watch(
  () => user.value.id,
  (id) => {
    loadUserDetail(id)
  }
)
```

### 6.3 `watchEffect()` 示例

```vue
<script setup>
import { ref, watchEffect } from 'vue'

const userId = ref(1)
const user = ref(null)

watchEffect(async () => {
  const response = await fetch(`/api/users/${userId.value}`)
  user.value = await response.json()
})
</script>
```

要点：

- `watchEffect` 会立即执行。
- 回调中读取了哪些响应式数据，就自动监听哪些数据。
- 不提供旧值。

### 6.4 常见错误与排查

| 错误 | 表现 | 原因 | 修复 |
| --- | --- | --- | --- |
| 用 watch 实现派生值 | 代码冗余 | 派生值应由 computed 表示 | 改用 computed |
| 深度监听大对象 | 性能下降 | 遍历对象成本高 | 监听具体字段或 getter |
| 请求竞态 | 后发请求先返回被旧请求覆盖 | 未取消或校验请求 | 使用 AbortController 或请求序号 |
| watchEffect 依赖不明确 | 触发时机难判断 | 自动收集依赖 | 复杂场景改用 watch |

### 6.5 常考题

1. `watch` 和 `watchEffect` 的区别是什么？
   答：`watch` 显式指定依赖并可拿到新旧值，`watchEffect` 自动收集依赖并立即执行。
2. 什么时候使用 `{ immediate: true }`？
   答：需要初始化时立刻执行一次副作用，例如页面加载时请求数据。
3. 为什么不建议用 watch 计算 total？
   答：total 是派生状态，computed 更准确、更可维护。

### 6.6 小案例

目标：搜索框防抖请求。

```vue
<script setup>
import { ref, watch } from 'vue'

const keyword = ref('')
const list = ref([])
const loading = ref(false)

let timer = null

watch(keyword, (value) => {
  clearTimeout(timer)

  timer = setTimeout(async () => {
    if (!value.trim()) {
      list.value = []
      return
    }

    loading.value = true
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`)
      list.value = await response.json()
    } finally {
      loading.value = false
    }
  }, 300)
})
</script>

<template>
  <input v-model="keyword" placeholder="输入关键词" />
  <p v-if="loading">搜索中...</p>
  <ul>
    <li v-for="item in list" :key="item.id">{{ item.name }}</li>
  </ul>
</template>
```

## 7. 组件通信：Props、Emits、Slots、Provide/Inject

Vue 组件通信的基本原则是：父组件通过 props 向下传数据，子组件通过 emits 向上发事件，插槽传递 UI 结构，provide/inject 跨层传依赖。

### 7.1 代码用法逐条说明

| 项目 | 类型 | 作用 | 基本写法 | 参数/选项 | 返回值/结果 | 注意事项 |
| --- | --- | --- | --- | --- | --- | --- |
| props | 组件输入 | 父传子数据 | `defineProps({ title: String })` | 类型、默认值、校验 | props 对象 | 只读，不能直接修改 |
| emits | 组件输出 | 子通知父 | `defineEmits(['save'])` | 事件名、校验函数 | emit 函数 | 事件名建议语义化 |
| slots | 内容分发 | 父传模板给子 | `<slot />` | 默认、具名、作用域 | 渲染父级模板 | 子组件决定插槽位置 |
| provide | 依赖提供 | 上层提供值 | `provide(key, value)` | key、value | 无 | 通常配合 symbol key |
| inject | 依赖注入 | 下层读取值 | `inject(key, defaultValue)` | key、默认值 | 注入值 | 层级深时比层层 props 更清晰 |

### 7.2 Props 类型和默认值

```vue
<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    default: 0
  },
  tags: {
    type: Array,
    default: () => []
  },
  user: {
    type: Object,
    default: () => ({ name: '匿名' })
  }
})
</script>

<template>
  <h2>{{ title }}：{{ count }}</h2>
  <span v-for="tag in tags" :key="tag">{{ tag }}</span>
</template>
```

注意：对象和数组默认值必须使用函数返回，避免多个组件实例共享同一个引用。

### 7.3 Emits

```vue
<script setup>
const emit = defineEmits({
  submit: (payload) => {
    return typeof payload.name === 'string' && payload.name.length > 0
  },
  cancel: null
})

function submit() {
  emit('submit', { name: 'Ada' })
}
</script>

<template>
  <button @click="submit">提交</button>
  <button @click="emit('cancel')">取消</button>
</template>
```

父组件：

```vue
<UserForm @submit="saveUser" @cancel="closeDialog" />
```

### 7.4 Slots

子组件：

```vue
<!-- Panel.vue -->
<template>
  <section class="panel">
    <header>
      <slot name="title">默认标题</slot>
    </header>
    <main>
      <slot />
    </main>
    <footer>
      <slot name="actions" />
    </footer>
  </section>
</template>
```

父组件：

```vue
<Panel>
  <template #title>
    <h2>用户详情</h2>
  </template>

  <p>这里是详情内容。</p>

  <template #actions>
    <button>保存</button>
  </template>
</Panel>
```

作用域插槽：

```vue
<!-- DataList.vue -->
<script setup>
defineProps({
  items: {
    type: Array,
    default: () => []
  }
})
</script>

<template>
  <ul>
    <li v-for="item in items" :key="item.id">
      <slot :item="item">{{ item.name }}</slot>
    </li>
  </ul>
</template>
```

```vue
<DataList :items="users">
  <template #default="{ item }">
    {{ item.name }} - {{ item.role }}
  </template>
</DataList>
```

### 7.5 Provide / Inject

```js
// keys.js
export const themeKey = Symbol('theme')
```

上层组件：

```vue
<script setup>
import { provide, ref } from 'vue'
import { themeKey } from './keys'

const theme = ref('light')
provide(themeKey, theme)
</script>

<template>
  <slot />
</template>
```

下层组件：

```vue
<script setup>
import { inject } from 'vue'
import { themeKey } from './keys'

const theme = inject(themeKey, 'light')
</script>

<template>
  <p>当前主题：{{ theme }}</p>
</template>
```

### 7.6 常见错误与排查

| 错误 | 表现 | 原因 | 修复 |
| --- | --- | --- | --- |
| 子组件修改 props | 警告、状态不同步 | 单向数据流被破坏 | emit 事件让父组件更新 |
| 插槽名写错 | 内容不显示 | 父子插槽名不一致 | 检查 `#name` 和 `<slot name>` |
| inject 得到 undefined | 运行时报错 | 上层没有 provide 或 key 不一致 | 使用共享 symbol key 并设置默认值 |
| 用 provide/inject 管理所有业务状态 | 数据流难追踪 | 滥用依赖注入 | 跨页面状态使用 Pinia |

### 7.7 常考题

1. props 和 emits 的数据方向分别是什么？
   答：props 父到子，emits 子到父。
2. 作用域插槽解决什么问题？
   答：子组件提供数据，父组件决定如何渲染。
3. provide/inject 适合什么场景？
   答：跨层传递配置、主题、表单上下文等依赖。

### 7.8 小案例

目标：封装可复用确认弹窗。

```vue
<!-- ConfirmDialog.vue -->
<script setup>
defineProps({
  visible: Boolean,
  title: {
    type: String,
    default: '确认操作'
  }
})

const emit = defineEmits(['confirm', 'cancel', 'update:visible'])

function close() {
  emit('update:visible', false)
  emit('cancel')
}

function confirm() {
  emit('confirm')
  emit('update:visible', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="mask">
      <section class="dialog">
        <h3>{{ title }}</h3>
        <slot>确定要继续吗？</slot>
        <footer>
          <button @click="close">取消</button>
          <button @click="confirm">确定</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
```

```vue
<script setup>
import { ref } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'

const visible = ref(false)

function deleteItem() {
  console.log('删除成功')
}
</script>

<template>
  <button @click="visible = true">删除</button>
  <ConfirmDialog v-model:visible="visible" title="删除用户" @confirm="deleteItem">
    删除后不可恢复，是否继续？
  </ConfirmDialog>
</template>
```

## 8. 生命周期与模板引用

生命周期钩子用于在组件不同阶段执行代码。组合式 API 中，常用钩子以 `on` 开头。

### 8.1 生命周期 API

| API | 触发时机 | 常见用途 | 注意事项 |
| --- | --- | --- | --- |
| `onBeforeMount()` | 挂载前 | 极少使用 | DOM 尚不可用 |
| `onMounted()` | 挂载后 | 请求数据、操作 DOM、初始化第三方库 | 只在客户端执行 |
| `onBeforeUpdate()` | 响应式更新导致 DOM 更新前 | 读取更新前 DOM | 不要在此大量改状态 |
| `onUpdated()` | DOM 更新后 | 读取更新后 DOM | 避免在此触发无限更新 |
| `onBeforeUnmount()` | 卸载前 | 清理定时器、监听器、连接 | 防内存泄漏 |
| `onUnmounted()` | 卸载后 | 释放资源 | 组件已不可见 |
| `onErrorCaptured()` | 捕获后代错误 | 错误上报、降级 UI | 返回 false 可阻止继续冒泡 |

### 8.2 生命周期示例

```vue
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const width = ref(window.innerWidth)

function updateWidth() {
  width.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', updateWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth)
})
</script>

<template>
  <p>窗口宽度：{{ width }}</p>
</template>
```

### 8.3 模板引用 `ref`

模板 ref 用来访问 DOM 元素或子组件实例。

```vue
<script setup>
import { onMounted, ref } from 'vue'

const inputRef = ref(null)

onMounted(() => {
  inputRef.value.focus()
})
</script>

<template>
  <input ref="inputRef" />
</template>
```

访问子组件暴露的方法：

```vue
<!-- BaseInput.vue -->
<script setup>
import { ref } from 'vue'

const inputRef = ref(null)

function focus() {
  inputRef.value.focus()
}

defineExpose({ focus })
</script>

<template>
  <input ref="inputRef" />
</template>
```

```vue
<script setup>
import { ref } from 'vue'
import BaseInput from './BaseInput.vue'

const baseInputRef = ref(null)

function focusInput() {
  baseInputRef.value.focus()
}
</script>

<template>
  <BaseInput ref="baseInputRef" />
  <button @click="focusInput">聚焦</button>
</template>
```

### 8.4 常见错误与排查

| 错误 | 表现 | 原因 | 修复 |
| --- | --- | --- | --- |
| setup 顶层直接访问 DOM ref | `null` 报错 | DOM 未挂载 | 放到 `onMounted()` |
| 定时器不清理 | 页面切换后仍执行 | 组件卸载未释放资源 | `onUnmounted()` 中清理 |
| 子组件方法访问不到 | ref 上没有方法 | `<script setup>` 默认不暴露 | 子组件用 `defineExpose()` |

### 8.5 常考题

1. 为什么 DOM 操作要放在 `onMounted()`？
   答：组件挂载前 DOM 节点还不存在。
2. `onUpdated()` 中修改响应式状态有什么风险？
   答：可能触发更新循环。
3. `<script setup>` 子组件为什么需要 `defineExpose()`？
   答：默认内部绑定不会暴露给父组件实例。

## 9. Composables、自定义指令与插件

可复用逻辑在 Vue 3 中通常用 composable，也就是以 `use` 开头的组合函数。自定义指令适合封装底层 DOM 行为。插件适合安装全局能力。

### 9.1 Composable 示例

```js
// src/composables/useFetch.js
import { ref } from 'vue'

export function useFetch(url) {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)

  async function execute() {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      data.value = await response.json()
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    error,
    loading,
    execute
  }
}
```

使用：

```vue
<script setup>
import { onMounted } from 'vue'
import { useFetch } from './composables/useFetch'

const { data, error, loading, execute } = useFetch('/api/users')

onMounted(execute)
</script>

<template>
  <p v-if="loading">加载中...</p>
  <p v-else-if="error">{{ error.message }}</p>
  <pre v-else>{{ data }}</pre>
</template>
```

Composable 规则：

- 可以调用 Vue 响应式 API 和生命周期钩子。
- 返回 ref、reactive、函数，让组件自行决定渲染方式。
- 不直接耦合具体 DOM，除非 composable 本身就是 DOM 行为。

### 9.2 自定义指令

局部指令在 `<script setup>` 中以 `v` 开头命名：

```vue
<script setup>
const vFocus = {
  mounted(el) {
    el.focus()
  }
}
</script>

<template>
  <input v-focus />
</template>
```

带参数和 binding：

```vue
<script setup>
const vColor = {
  mounted(el, binding) {
    el.style.color = binding.value
  },
  updated(el, binding) {
    el.style.color = binding.value
  }
}
</script>

<template>
  <p v-color="'red'">红色文字</p>
</template>
```

指令钩子常见参数：

| 参数 | 作用 |
| --- | --- |
| `el` | 指令绑定的真实 DOM 元素 |
| `binding.value` | 指令绑定值 |
| `binding.oldValue` | 更新前的值 |
| `binding.arg` | 指令参数，例如 `v-demo:foo` 的 `foo` |
| `binding.modifiers` | 修饰符对象，例如 `v-demo.stop` |

### 9.3 插件

```js
// src/plugins/toast.js
export default {
  install(app, options = {}) {
    app.config.globalProperties.$toast = (message) => {
      window.alert(`${options.prefix || ''}${message}`)
    }

    app.provide('toast', app.config.globalProperties.$toast)
  }
}
```

安装：

```js
import { createApp } from 'vue'
import App from './App.vue'
import toast from './plugins/toast'

createApp(App)
  .use(toast, { prefix: '[提示] ' })
  .mount('#app')
```

组件中使用 inject：

```vue
<script setup>
import { inject } from 'vue'

const toast = inject('toast')
</script>

<template>
  <button @click="toast('保存成功')">提示</button>
</template>
```

### 9.4 常见错误与排查

| 错误 | 表现 | 原因 | 修复 |
| --- | --- | --- | --- |
| composable 返回普通解构值 | 状态不更新 | 丢失响应式 | 返回 ref 或使用 `toRefs()` |
| 指令里操作组件状态 | 逻辑分散 | 指令应偏 DOM 行为 | 组件状态放组件或 composable |
| 插件依赖安装顺序错误 | 全局能力不可用 | `app.use()` 顺序不对 | 在 mount 前完成安装 |

### 9.5 常考题

1. composable 和普通工具函数有什么区别？
   答：composable 可以组合 Vue 响应式 API 和生命周期，返回响应式状态。
2. 自定义指令适合解决什么问题？
   答：封装可复用的底层 DOM 行为，例如自动聚焦、权限显示、拖拽。
3. 插件通常做什么？
   答：全局注册组件、指令、provide、全局属性或安装第三方能力。

## 10. 内置组件：Transition、KeepAlive、Teleport、Suspense

Vue 提供若干内置组件，用来处理动画、缓存、传送 DOM 和异步依赖。

### 10.1 内置组件速查

| 组件 | 作用 | 基本写法 | 典型场景 | 注意事项 |
| --- | --- | --- | --- | --- |
| `<Transition>` | 单元素/组件进入离开动画 | `<Transition><div v-if="ok" /></Transition>` | 弹窗、提示、折叠 | 需要配合 CSS class |
| `<TransitionGroup>` | 列表动画 | `<TransitionGroup tag="ul">...</TransitionGroup>` | 列表增删排序 | 子项必须有 key |
| `<KeepAlive>` | 缓存动态组件 | `<KeepAlive><component :is="view" /></KeepAlive>` | Tab、路由缓存 | 可用 include/exclude/max 控制 |
| `<Teleport>` | 把 DOM 渲染到别处 | `<Teleport to="body">...</Teleport>` | Modal、Popover | 逻辑仍属于原组件 |
| `<Suspense>` | 等待异步组件依赖 | `<Suspense>...</Suspense>` | 异步 setup、懒加载 | 复杂异步 UI 使用 |

### 10.2 Transition 示例

```vue
<script setup>
import { ref } from 'vue'

const visible = ref(false)
</script>

<template>
  <button @click="visible = !visible">切换</button>
  <Transition name="fade">
    <p v-if="visible">淡入淡出内容</p>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

### 10.3 KeepAlive 示例

```vue
<script setup>
import { computed, ref } from 'vue'
import UserList from './UserList.vue'
import Settings from './Settings.vue'

const tab = ref('users')

const currentComponent = computed(() => {
  return tab.value === 'users' ? UserList : Settings
})
</script>

<template>
  <button @click="tab = 'users'">用户</button>
  <button @click="tab = 'settings'">设置</button>

  <KeepAlive>
    <component :is="currentComponent" />
  </KeepAlive>
</template>
```

被 KeepAlive 缓存的组件可使用：

```js
import { onActivated, onDeactivated } from 'vue'

onActivated(() => {
  console.log('组件被激活')
})

onDeactivated(() => {
  console.log('组件被缓存停用')
})
```

### 10.4 Teleport 示例

```vue
<script setup>
import { ref } from 'vue'

const open = ref(false)
</script>

<template>
  <button @click="open = true">打开弹窗</button>

  <Teleport to="body">
    <div v-if="open" class="modal-mask">
      <section class="modal">
        <h3>弹窗</h3>
        <button @click="open = false">关闭</button>
      </section>
    </div>
  </Teleport>
</template>
```

### 10.5 常考题

1. Teleport 改变的是组件层级还是 DOM 位置？
   答：只改变 DOM 挂载位置，组件逻辑关系不变。
2. KeepAlive 缓存组件后，组件会触发 mounted 吗？
   答：首次会触发 mounted，之后切换回来触发 activated。
3. Transition 的动画类名如何生成？
   答：根据 `name` 生成 `name-enter-active`、`name-enter-from` 等类名。

## 11. Vue Router 与 Pinia 官方生态

大型 Vue 应用通常需要路由和状态管理。官方推荐 Vue Router 处理页面导航，Pinia 处理跨组件共享状态。

### 11.1 Vue Router 最小用法

安装：

```bash
npm install vue-router
```

路由配置：

```js
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import UserView from '../views/UserView.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/users/:id', name: 'user', component: UserView, props: true }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
```

安装：

```js
// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'

createApp(App).use(router).mount('#app')
```

页面出口和导航：

```vue
<template>
  <nav>
    <RouterLink to="/">首页</RouterLink>
    <RouterLink :to="{ name: 'user', params: { id: 1 } }">用户 1</RouterLink>
  </nav>

  <RouterView />
</template>
```

组合式 API 中读取路由：

```vue
<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

function goHome() {
  router.push('/')
}
</script>

<template>
  <p>当前用户 ID：{{ route.params.id }}</p>
  <button @click="goHome">返回首页</button>
</template>
```

### 11.2 Pinia 最小用法

安装：

```bash
npm install pinia
```

安装到应用：

```js
// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

createApp(App)
  .use(createPinia())
  .mount('#app')
```

定义 store：

```js
// src/stores/counter.js
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  return {
    count,
    doubleCount,
    increment
  }
})
```

组件使用：

```vue
<script setup>
import { useCounterStore } from './stores/counter'

const counter = useCounterStore()
</script>

<template>
  <button @click="counter.increment">
    {{ counter.count }} / {{ counter.doubleCount }}
  </button>
</template>
```

### 11.3 常见错误与排查

| 错误 | 表现 | 原因 | 修复 |
| --- | --- | --- | --- |
| 使用 RouterLink 但没有安装 router | 控制台报组件或注入错误 | 忘记 `app.use(router)` | 在 main.js 安装 |
| 动态路由参数变化但页面不刷新 | 同组件复用 | 组件实例未销毁 | watch `route.params.id` |
| Pinia store 解构后不更新 | 状态丢失响应式 | 直接解构 store 属性 | 使用 `storeToRefs()` |

Pinia 解构正确写法：

```js
import { storeToRefs } from 'pinia'
import { useCounterStore } from './stores/counter'

const counter = useCounterStore()
const { count, doubleCount } = storeToRefs(counter)
const { increment } = counter
```

### 11.4 常考题

1. Vue Router 的 `RouterView` 是什么？
   答：当前路由匹配组件的渲染出口。
2. `router.push()` 和 `RouterLink` 的区别是什么？
   答：前者是编程式导航，后者是声明式链接。
3. Pinia 中 state、getter、action 在 setup store 中分别对应什么？
   答：`ref/reactive` 是 state，`computed` 是 getter，函数是 action。

## 12. 高频 API / 配置速查表

### 12.1 响应式 API

| API | 用法 | 约束 |
| --- | --- | --- |
| `ref(value)` | `const count = ref(0)` | JS 中访问 `.value` |
| `reactive(object)` | `const state = reactive({})` | 不要整体替换对象 |
| `computed(getter)` | `const total = computed(() => a.value + b.value)` | getter 应保持纯净 |
| `watch(source, cb, options)` | `watch(id, loadDetail, { immediate: true })` | 用于副作用 |
| `watchEffect(cb)` | `watchEffect(() => console.log(id.value))` | 自动依赖收集 |
| `toRef(obj, key)` | `const name = toRef(user, 'name')` | 解构属性保持响应式 |
| `toRefs(obj)` | `const { name } = toRefs(user)` | 常用于返回 reactive |

### 12.2 组件 API

| API | 用法 | 约束 |
| --- | --- | --- |
| `defineProps()` | `defineProps({ title: String })` | 编译宏，不导入 |
| `defineEmits()` | `const emit = defineEmits(['save'])` | 编译宏，不导入 |
| `defineModel()` | `const value = defineModel()` | 用于组件 v-model |
| `defineExpose()` | `defineExpose({ focus })` | 暴露给父组件 ref |
| `provide()` | `provide(key, value)` | key 建议用 Symbol |
| `inject()` | `inject(key, defaultValue)` | 提供默认值更安全 |

### 12.3 生命周期 API

| API | 用法 | 场景 |
| --- | --- | --- |
| `onMounted(fn)` | `onMounted(load)` | DOM 可用后 |
| `onUnmounted(fn)` | `onUnmounted(cleanup)` | 清理资源 |
| `onUpdated(fn)` | `onUpdated(readDom)` | DOM 更新后 |
| `onActivated(fn)` | `onActivated(refresh)` | KeepAlive 激活 |
| `onDeactivated(fn)` | `onDeactivated(pause)` | KeepAlive 停用 |

### 12.4 指令速查

| 指令 | 用法 | 场景 |
| --- | --- | --- |
| `v-bind` | `:src="url"` | 属性绑定 |
| `v-on` | `@click="save"` | 事件绑定 |
| `v-if` | `v-if="visible"` | 条件创建销毁 |
| `v-show` | `v-show="visible"` | 高频显示隐藏 |
| `v-for` | `v-for="item in list" :key="item.id"` | 列表 |
| `v-model` | `v-model.trim="name"` | 表单双向绑定 |
| `v-slot` | `<template #title>` | 插槽 |
| `v-html` | `v-html="html"` | 可信 HTML 渲染 |

## 13. 综合小项目：用户管理页

目标：综合使用响应式、computed、watch、组件通信、表单、列表和小型业务拆分。

### 13.1 项目结构

```text
src/
  App.vue
  components/
    UserForm.vue
    UserTable.vue
```

### 13.2 `UserForm.vue`

```vue
<script setup>
import { reactive } from 'vue'

const emit = defineEmits(['submit'])

const form = reactive({
  name: '',
  role: 'user',
  enabled: true
})

function submit() {
  if (!form.name.trim()) return

  emit('submit', {
    name: form.name.trim(),
    role: form.role,
    enabled: form.enabled
  })

  form.name = ''
  form.role = 'user'
  form.enabled = true
}
</script>

<template>
  <form @submit.prevent="submit">
    <input v-model.trim="form.name" placeholder="用户名" />
    <select v-model="form.role">
      <option value="user">普通用户</option>
      <option value="admin">管理员</option>
    </select>
    <label>
      <input type="checkbox" v-model="form.enabled" />
      启用
    </label>
    <button>新增</button>
  </form>
</template>
```

### 13.3 `UserTable.vue`

```vue
<script setup>
defineProps({
  users: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['remove', 'toggle'])
</script>

<template>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>姓名</th>
        <th>角色</th>
        <th>状态</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="user in users" :key="user.id">
        <td>{{ user.id }}</td>
        <td>{{ user.name }}</td>
        <td>{{ user.role }}</td>
        <td>{{ user.enabled ? '启用' : '禁用' }}</td>
        <td>
          <button @click="emit('toggle', user.id)">切换状态</button>
          <button @click="emit('remove', user.id)">删除</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>
```

### 13.4 `App.vue`

```vue
<script setup>
import { computed, ref, watch } from 'vue'
import UserForm from './components/UserForm.vue'
import UserTable from './components/UserTable.vue'

const keyword = ref('')
const users = ref([
  { id: 1, name: 'Ada', role: 'admin', enabled: true },
  { id: 2, name: 'Evan', role: 'user', enabled: true }
])

const nextId = computed(() => {
  return users.value.length > 0
    ? Math.max(...users.value.map((user) => user.id)) + 1
    : 1
})

const filteredUsers = computed(() => {
  const key = keyword.value.trim().toLowerCase()
  if (!key) return users.value
  return users.value.filter((user) =>
    user.name.toLowerCase().includes(key) || user.role.includes(key)
  )
})

watch(users, (value) => {
  localStorage.setItem('users', JSON.stringify(value))
}, { deep: true })

function addUser(payload) {
  users.value.push({
    id: nextId.value,
    ...payload
  })
}

function removeUser(id) {
  users.value = users.value.filter((user) => user.id !== id)
}

function toggleUser(id) {
  const user = users.value.find((item) => item.id === id)
  if (user) {
    user.enabled = !user.enabled
  }
}
</script>

<template>
  <main>
    <h1>用户管理</h1>
    <UserForm @submit="addUser" />
    <input v-model.trim="keyword" placeholder="搜索用户" />
    <UserTable
      :users="filteredUsers"
      @remove="removeUser"
      @toggle="toggleUser"
    />
  </main>
</template>
```

### 13.5 可扩展任务

1. 增加编辑用户功能。
2. 增加角色筛选。
3. 增加分页。
4. 把用户列表抽成 Pinia store。
5. 增加 Vue Router，拆分「列表页」和「详情页」。

## 14. 复习题总表

### 14.1 基础题

1. Vue 3 中 `createApp()` 的作用是什么？
2. `<script setup>` 中的顶层变量为什么能在模板里使用？
3. `ref()` 在模板和脚本中的访问方式有什么不同？
4. `v-bind` 和 `v-on` 的简写分别是什么？
5. `v-if` 和 `v-show` 的核心区别是什么？
6. `v-for` 为什么要写 `key`？
7. `v-model.trim`、`v-model.number` 分别解决什么问题？
8. props 为什么不能在子组件中直接修改？

### 14.2 中级题

1. `computed` 和 method 都能返回计算结果，为什么还需要 computed？
2. `watch` 和 `watchEffect` 分别适合什么场景？
3. 如何封装一个返回响应式数据和方法的 composable？
4. 作用域插槽如何让父组件决定列表项渲染？
5. `defineModel()` 和传统 `modelValue` + `update:modelValue` 有什么关系？
6. 为什么 reactive 解构后可能失去响应式？
7. KeepAlive 缓存组件后生命周期有什么变化？
8. Vue Router 动态参数变化但组件不重新 mounted，该如何处理？

### 14.3 高级题

1. 如何避免 watch 请求竞态导致旧响应覆盖新响应？
2. 什么时候不应该使用 deep watch？
3. 为什么 `v-html` 有安全风险？
4. provide/inject 和 Pinia 的边界是什么？
5. 如何设计一个既支持默认插槽又支持具名插槽的业务组件？
6. 如何把表单校验逻辑抽成 composable？
7. 在大型项目中如何决定组件是全局注册还是局部注册？
8. 如何定位由于 key 不稳定导致的列表渲染异常？

## 15. 学习检查清单

完成本文学习后，应具备以下能力：

- 能用 `npm create vue@latest` 创建 Vue 3 项目并运行、构建。
- 能解释 `createApp()`、`mount()`、`app.use()` 的作用。
- 能编写标准 `.vue` 单文件组件。
- 能熟练使用 `<script setup>`、`defineProps()`、`defineEmits()`、`defineModel()`。
- 能正确使用 `ref()`、`reactive()`、`computed()` 管理状态。
- 能区分 `computed`、`watch`、`watchEffect` 的使用边界。
- 能使用 `v-bind`、`v-on`、`v-if`、`v-show`、`v-for`、`v-model` 编写常见页面逻辑。
- 能封装 props、emits、slots 清晰的可复用组件。
- 能使用生命周期钩子处理 DOM、事件监听和资源清理。
- 能编写 composable 抽离可复用业务逻辑。
- 能理解自定义指令和插件的适用场景。
- 能使用 Teleport、KeepAlive、Transition 解决常见 UI 需求。
- 能写出 Vue Router 和 Pinia 的最小可用代码。
- 能完成一个包含列表、表单、搜索、增删改的 Vue 小项目。
