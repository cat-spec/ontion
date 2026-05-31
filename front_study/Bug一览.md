# VUE3
## v-for问题
## 路由
### 子路由
==***子路路径无需增加 /== 
``` javascript
{
      path: "/",
      component: () => import("@/view/Layout/index.vue"),
      children: [
        // 首页
        {
          path: "",
          component: () => import("@/view/Home/index.vue"),
        },
        // 分类页
        {
          path: "category/:id",
          component: () => import("@/view/Category/index.vue"),
        },
      ],
    },
```

