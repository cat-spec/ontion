# UniApp 万字学习指南：从入门到实战

## 一、UniApp 是什么？为什么选择它？

在移动开发领域，iOS、Android、鸿蒙、微信/支付宝小程序、H5 等平台需求并存，企业开发成本持续高企。UniApp 是 DCloud 推出的跨平台框架，核心口号是“**一套代码，发布到 15+ 平台**”。截至 2025 年，全球已有 900 万开发者选择 UniApp，手机端月活用户超 14 亿[](https://blog.csdn.net/qq_34041185/article/details/152309491)。

与传统开发模式相比，UniApp 的核心优势在于：

- **开发效率提升 300%**：一次编码适配全平台，多端开发周期缩短至原来的 1/3[](https://blog.csdn.net/qq_34041185/article/details/152309491)
    
- **原生级性能体验**：通过 nvue 原生渲染引擎，App 端性能较传统 WebView 提升 50%，地图交互等场景流畅度媲美原生应用[](https://blog.csdn.net/qq_34041185/article/details/152309491)
    
- **2025 年新特性爆发**：全面支持鸿蒙 Next 元服务开发、Vue3+TypeScript、Pinia 状态管理，已成为跨端开发的首选框架[](https://blog.csdn.net/qq_34041185/article/details/152309491)
    

UniApp 不仅支持发布到 iOS、Android、Web，还支持微信小程序、支付宝小程序、百度小程序、抖音小程序、QQ 小程序、快手小程序，以及鸿蒙元服务等。
### 1.1 跨端原理简述

UniApp 通过**编译器**和**运行时**两部分协同，实现一套代码多端运行[](https://en.uniapp.dcloud.io/tutorial/#absolute-path)：

- **编译器**将开发者编写的 .vue 文件编译成各平台支持的代码。在 Web 平台编译为 JS 代码，在微信小程序平台拆分为 wxml、wxss、js，在 App 平台则编译为 JS 代码[](https://en.uniapp.dcloud.io/tutorial/#absolute-path)
    
- 如果涉及 uts（统一类型系统）代码，Android 平台编译为 Kotlin 代码，iOS 平台编译为 Swift 代码[](https://en.uniapp.dcloud.io/tutorial/#absolute-path)
    

编译器分 Vue2 版（基于 webpack）和 Vue3 版（基于 Vite，性能更快），2025 年推荐直接使用 Vue3 版[](https://en.uniapp.dcloud.io/tutorial/#absolute-path)。

### 1.2 开发规范

为了实现多端兼容，UniApp 规定以下开发规范[](https://en.uniapp.dcloud.io/tutorial/#absolute-path)：

- 页面文件遵循 Vue 单文件组件（SFC）规范，每个页面是一个 .vue 文件
    
- 组件标签贴近小程序规范，详见 uni-app 组件规范
    
- 接口能力（JS API）靠近小程序规范，但需将前缀 wx、my 等替换为 **uni**
    
- 数据绑定及事件处理同 Vue.js 规范，同时补充了应用生命周期及页面的生命周期
## 三、核心基础概念

### 3.1 应用生命周期（App.vue）

应用生命周期**仅在 App.vue 中监听**，在其他页面监听无效[](https://uniapp.dcloud.net.cn/collocation/App.html#%E5%85%A8%E5%B1%80%E6%A0%B7%E5%BC%8F)。

|函数名|说明|
|---|---|
|onLaunch|uni-app 初始化完成时触发（全局只触发一次）|
|onShow|uni-app 启动，或从后台进入前台时触发|
|onHide|uni-app 从前台进入后台时触发|
|onError|uni-app 报错时触发|

示例代码[](https://uniapp.dcloud.net.cn/collocation/App.html#%E5%85%A8%E5%B1%80%E6%A0%B7%E5%BC%8F)：

javascript

// 只能在 App.vue 里监听应用的生命周期
export default {
  onLaunch: function(options) {
    console.log('App Launch')
    console.log('应用启动路径：', options.path)
  },
  onShow: function(options) {
    console.log('App Show')
  },
  onHide: function() {
    console.log('App Hide')
  }
}

**注意**：App.vue 不能编写 `<template>` 视图元素，因为它不是页面，而是所有页面切换的主组件[](https://uniapp.dcloud.net.cn/collocation/App.html#%E5%85%A8%E5%B1%80%E6%A0%B7%E5%BC%8F)。

### 3.2 页面生命周期

每个页面都有一系列生命周期钩子，最常用的是：

|生命周期|说明|
|---|---|
|onLoad|页面加载时触发，**获取路由参数的唯一地方**[](https://developer.aliyun.com/article/1621707)|
|onShow|页面显示时触发|
|onReady|页面初次渲染完成时触发|
|onHide|页面隐藏时触发|
|onUnload|页面卸载时触发|

**Vue3 组合式 API 中使用页面生命周期**（需从 @dcloudio/uni-app 导入）[](https://app.epoint.com.cn/m8mpdoc/?file=001-%e9%a1%b5%e9%9d%a2%e5%bc%80%e5%8f%91/009-%e7%94%9f%e5%91%bd%e5%91%a8%e6%9c%9fvue3)：

html

<script setup>
import { ref, onMounted } from 'vue'
import { onReady, onLoad } from '@dcloudio/uni-app'
const title = ref('Hello')
// uni-app 页面生命周期
onLoad((option) => {
  console.log('页面 onLoad:', option)
})
onReady(() => {
  console.log('onReady')
})
// Vue3 组件生命周期
onMounted(() => {
  console.log('component mounted')
})
</script>

### 3.3 数据绑定

UniApp 的数据绑定与 Vue.js 完全一致。使用选项式 API 时，用 `data` 选项声明组件的响应式状态：

html

<script>
export default {
  data() {
    return {
      message: 'Hello UniApp!',
      user: { name: '张三', age: 18 }
    }
  },
  methods: {
    handleClick() {
      this.message = '被点击了'
    }
  }
}
</script>
<template>
  <view>
    <text>{{ message }}</text>
    <button @click="handleClick">点击</button>
  </view>
</template>

### 3.4 全局文件配置

#### pages.json（页面路由配置）

pages.json 是页面的路由配置文件，核心配置项包括[](https://blog.csdn.net/2301_80232843/article/details/148832494)：

**pages**：定义所有页面路径和窗口样式

json

{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "首页"
      }
    },
    {
      "path": "pages/user/user",
      "style": {
        "navigationBarTitleText": "个人中心"
      }
    }
  ]
}

**globalStyle**：全局窗口样式，应用于所有页面

json

{
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "我的应用",
    "navigationBarBackgroundColor": "#FFFFFF",
    "backgroundColor": "#F8F8F8"
  }
}

**tabBar**：底部选项卡配置

json

{
  "tabBar": {
    "color": "#7A7E83",
    "selectedColor": "#3cc51f",
    "borderStyle": "black",
    "backgroundColor": "#ffffff",
    "list": [
      {
        "pagePath": "pages/index/index",
        "iconPath": "static/home.png",
        "selectedIconPath": "static/home_active.png",
        "text": "首页"
      },
      {
        "pagePath": "pages/user/user",
        "iconPath": "static/user.png",
        "selectedIconPath": "static/user_active.png",
        "text": "我的"
      }
    ]
  }
}

**easycom（超级组件）** ：组件自动按需引入，无需手动 import 和注册[](https://blog.csdn.net/2301_80232843/article/details/148832494)。只要组件安装在 `components` 目录下，并符合 `components/组件名称/组件名称.vue` 的目录结构，就可以直接在页面中使用[](https://blog.csdn.net/XiugongHao/article/details/136285063#comments_31395434)。

### 4.1 路由跳转 API

UniApp 提供了丰富的路由跳转 API[](https://blog.csdn.net/2301_80232843/article/details/148832494)：

**1. 普通跳转（保留当前页，可返回）**

javascript

uni.navigateTo({
  url: '/pages/home/home?id=123',
  success: () => console.log('跳转成功'),
  fail: (err) => console.log('跳转失败', err)
})

**2. 重定向（关闭当前页，不可返回）**

javascript

uni.redirectTo({
  url: '/pages/login/login'
})

**3. TabBar 页面跳转（跳转到 tabBar 配置的页面）**

javascript

uni.switchTab({
  url: '/pages/tabbar/index'
})

**注意事项**：跳转到 tabBar 页面只能使用 `switchTab`；页面跳转路径有层级限制，不能无限制跳转新页面。

**4. 返回上一页**

javascript

uni.navigateBack({
  delta: 1  // 返回层数
})

### 4.2 页面传参

#### 方式一：URL 拼接传参（最基础、最常用）

**发送参数**[](https://blog.csdn.net/2301_80232843/article/details/148832494)[](https://blog.csdn.net/2301_76428778/article/details/150587343)：

javascript

// 简单参数
uni.navigateTo({
  url: '/pages/detail/detail?id=123&name=张三'
})
// 传递对象（需序列化并编码）
const userInfo = { id: 1, name: '赵六', hobbies: ['读书', '游泳'] }
uni.navigateTo({
  url: `/pages/detail/detail?data=${encodeURIComponent(JSON.stringify(userInfo))}`
})

**接收参数**（在目标页面的 `onLoad` 中）[](https://blog.csdn.net/2301_80232843/article/details/148832494)[](https://blog.csdn.net/2301_76428778/article/details/150587343)：

javascript

export default {
  onLoad(options) {
    console.log(options.id)   // 输出 123
    console.log(options.name) // 输出 张三
    
    // 解析复杂对象
    if (options.data) {
      const userInfo = JSON.parse(decodeURIComponent(options.data))
      console.log(userInfo)
    }
  }
}

**URL 传参注意事项**[](https://blog.csdn.net/2301_76428778/article/details/150587343)：

- URL 有长度限制（小程序通常较严格），切勿传递大文本或大型对象
    
- URL 参数可见，不要传递密码、token 等敏感信息
    
- 含特殊字符的字符串必须使用 `encodeURIComponent` 编码
### 4.3 路由拦截（全局权限控制）

在 App.vue 的 `onLaunch` 中监听路由，实现登录拦截[](https://blog.csdn.net/2301_80232843/article/details/148832494)：

javascript

// App.vue
export default {
  onLaunch() {
    uni.addInterceptor('navigateTo', {
      invoke(args) {
        const token = uni.getStorageSync('token')
        if (!token && args.url !== '/pages/login/login') {
          uni.redirectTo({ url: '/pages/login/login' })
          return false // 拦截跳转
        }
        return true
      }
    })
  }
}

## 六、组件开发与通信

### 6.1 自定义组件

UniApp 只支持 Vue 单文件组件（.vue 组件），组件放在项目的 `components` 目录下[](https://blog.csdn.net/XiugongHao/article/details/136285063#comments_31395434)。

组件的全局注册有两种方式[](https://blog.csdn.net/XiugongHao/article/details/136285063#comments_31395434)：

**方式一：main.js 全局引入**

javascript

// main.js
import App from './App'
import { createSSRApp } from 'vue'
import myComponent from './components/my-component/my-component.vue'
export function createApp() {
  const app = createSSRApp(App)
  app.component('my-component', myComponent)
  return { app }
}

**方式二：easycom 自动引入（推荐）**

只要组件安装在 `components` 目录下，并符合 `components/组件名称/组件名称.vue` 的目录结构，就可以不用引用、注册，直接在页面中使用[](https://blog.csdn.net/XiugongHao/article/details/136285063#comments_31395434)。

### 6.2 父子组件通信

**父传子：通过 props**：子组件通过 props 接收父组件传递的数据[](https://blog.csdn.net/XiugongHao/article/details/136285063#comments_31395434)[](https://www.php.cn/faq/2252679.html)：

html

<!-- 父组件 -->
<template>
  <child-component :msg="parentMsg" @childEvent="handleChildEvent" />
</template>
<script>
import ChildComponent from '@/components/ChildComponent.vue'
export default {
  components: { ChildComponent },
  data() {
    return { parentMsg: '来自父组件的消息' }
  },
  methods: {
    handleChildEvent(data) {
      console.log('收到子组件事件：', data)
    }
  }
}
</script>

html

<!-- 子组件 ChildComponent.vue -->
<template>
  <view>
    <text>{{ msg }}</text>
    <button @click="sendToParent">传给父组件</button>
  </view>
</template>
<script>
export default {
  props: ['msg'],
  methods: {
    sendToParent() {
      this.$emit('childEvent', { data: '来自子组件的消息' })
    }
  }
}
</script>

**v-model 使用注意事项**：子组件必须声明 `props: ['value']`，并触发 `this.$emit('input', newValue)`。如需换 key（如用 msg 代替 value），需显式写 `v-model:msg="text"`。App 端 nvue 不支持 v-model，需用 `@input` + `:value` 手动绑定[](https://www.php.cn/faq/2252679.html)。

**子传父：通过自定义事件**

子组件通过触发父组件定义的事件来修改父组件数据[](https://blog.csdn.net/XiugongHao/article/details/136285063#comments_31395434)。

**props 传递对象/数组的注意事项**：JS 引用类型传递时，子组件修改 props 中的对象属性会意外同步到父组件。建议子组件内部用 `JSON.parse(JSON.stringify(props.obj))` 深拷贝，或通过 `$emit` 抛出修改，由父组件决定是否更新[](https://www.php.cn/faq/2252679.html)。
### 6.3 插槽（Slot）

插槽是一种向子组件传递内容的机制。父组件通过 slot 向子组件内部指定位置传递内容：

html

<!-- 子组件 ChildSlot.vue -->
<template>
  <view class="container">
    <view class="header">
      <slot name="header">默认头部内容</slot>
    </view>
    <view class="content">
      <slot>默认内容</slot>
    </view>
    <view class="footer">
      <slot name="footer">默认底部内容</slot>
    </view>
  </view>
</template>

html

<!-- 父组件 -->
<template>
  <child-slot>
    <template #header>
      <text>自定义头部</text>
    </template>
    <template #default>
      <text>主要内容区域</text>
    </template>
    <template #footer>
      <text>自定义底部</text>
    </template>
  </child-slot>
</template>

### 6.4 全局事件通信

在整个应用的任何地方都可以使用 `uni.$on` 创建全局事件，用 `uni.$emit` 触发全局事件，实现多组件间的数据通信[](https://blog.csdn.net/XiugongHao/article/details/136285063#comments_31395434)[](https://www.php.cn/faq/2252679.html)。

javascript

// 页面A - 发送事件
uni.$emit('login-success', { userId: 123, name: '张三' })
// 页面B - 监听事件（需在 beforeDestroy 或 onUnload 中销毁）
export default {
  onLoad() {
    uni.$on('login-success', this.handleLoginSuccess)
  },
  onUnload() {
    uni.$off('login-success', this.handleLoginSuccess)
  },
  methods: {
    handleLoginSuccess(data) {
      console.log('登录成功：', data)
    }
  }
}

## 八、性能优化实战

### 8.1 分包加载

分包加载是 UniApp 性能优化的核心手段。对于小程序，主包必须 ≤ 2MB 是硬性要求，分包后总包上限可达 20MB[](https://juejin.cn/post/7572087162231160874)。

**配置分包**[](https://juejin.cn/post/7572087162231160874)：

json

{
  "pages": [
    { "path": "pages/index/index" }  // 主包：仅保留核心页面
  ],
  "subPackages": [
    {
      "root": "subpkg/user",
      "name": "user",
      "pages": [
        { "path": "user-info/user-info" },
        { "path": "order-list/order-list" }
      ]
    },
    {
      "root": "subpkg/login",
      "independent": true,  // 独立分包，不依赖主包
      "pages": [{ "path": "login/login" }]
    }
  ],
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["user"]  // 进入首页时预加载用户分包
    }
  }
}

**分包类型区别**[](https://juejin.cn/post/7572087162231160874)：

- **普通分包**：依赖主包，可引用主包资源，单个分包 ≤ 2MB
    
- **独立分包**：不依赖主包，可单独启动，但不能引用主包/其他分包资源
    
- **分包预加载**：提前下载指定分包，适用于高频跳转模块
    

**效果数据**：合理分包后，首屏加载时间可从 3.2 秒降至 1.5 秒[](https://juejin.cn/post/7572087162231160874)。

### 8.2 图片优化与懒加载

**图片压缩**[](https://blog.csdn.net/i520_1314/article/details/149927088)：

- 使用 WebP 格式，比 PNG 小 30% 以上
    
- 工具推荐：Squoosh、TinyPNG
    

**图片懒加载**[](https://blog.csdn.net/i520_1314/article/details/149927088)：

html

<image 
  src="/static/banner.jpg" 
  mode="widthFix" 
  lazy-load 
  @load="onImageLoad" 
/>

**背景图使用 CSS 替代**[](https://blog.csdn.net/i520_1314/article/details/149927088)：

css

/* 推荐：CSS 背景图 */
.home-banner {
  background-image: url(@/static/banner.webp);
  background-size: cover;
}
/* 不推荐：image 标签会阻塞解析 */

### 8.3 组件异步加载

避免首页一次性加载所有组件[](https://blog.csdn.net/i520_1314/article/details/149927088)：

javascript

export default {
  components: {
    // 异步加载（推荐）
    HeavyComponent: () => import('@/components/HeavyComponent.vue')
  },
  data() {
    return { showHeavy: false }
  }
}

html

<scroll-view @scroll="onScroll">
  <heavy-component v-if="showHeavy" />
</scroll-view>

### 8.4 网络请求优化

使用并行请求代替串行请求，减少总耗时[](https://blog.csdn.net/i520_1314/article/details/149927088)：

javascript

// ❌ 错误：串行请求，总耗时 = t1 + t2
await this.fetchBanner()
await this.fetchNews()
// ✅ 正确：并行请求，总耗时 ≈ max(t1, t2)
await Promise.all([
  this.fetchBanner(),
  this.fetchNews()
])

### 8.5 启动速度优化

**精简启动资源**：删除 pages.json 中未使用的页面配置，清理 static 目录下无用的图片、字体（超过 200KB 的非首屏图片改为网络加载）[](https://developer.aliyun.com/article/1684995)。

**升级 uni-app x 引擎**：新一代 uni-app x 引擎采用 AOT 预编译，冷启动速度提升 40% 以上，JS 编译耗时减少 60%[](https://developer.aliyun.com/article/1684995)。

**避免在 onLaunch 中写大量同步逻辑**：复杂数据初始化可延迟到首屏渲染后执行[](https://developer.aliyun.com/article/1684995)。

**使用骨架屏**：在首屏数据加载完成前显示骨架屏，掩盖渲染延迟，改善用户感知[](https://developer.aliyun.com/article/1684995)。