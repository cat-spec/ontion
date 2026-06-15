<template>
  <aside class="space-y-4">
    <section class="rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="mb-4 border-l-4 border-emerald-500 pl-3 text-base font-semibold text-slate-950">联系我们</h2>
      <div class="space-y-2 text-sm text-slate-600">
        <p>官方客服 <span class="font-medium text-emerald-600">@NexBridge_Help</span></p>
        <p>官方频道 <span class="font-medium text-emerald-600">@NexBridgeChannel</span></p>
      </div>
    </section>

    <section class="rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="mb-4 border-l-4 border-emerald-500 pl-3 text-base font-semibold text-slate-950">快捷入口</h2>
      <div class="grid grid-cols-3 gap-3">
        <button
          v-for="action in actions"
          :key="action.label"
          class="flex h-20 flex-col items-center justify-center gap-2 rounded-lg bg-slate-50 text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
        >
          <el-icon :size="24"><component :is="action.icon" /></el-icon>
          <span class="text-xs">{{ action.label }}</span>
        </button>
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import {
  ChatLineRound,
  Collection,
  Files,
  Guide,
  Picture,
  Setting,
  Switch,
  Tickets,
  Wallet,
} from '@element-plus/icons-vue'

const actions = [
  { label: '支持平台', icon: Collection },
  { label: '翻译设置', icon: Switch },
  { label: '代理设置', icon: Setting },
  { label: '快捷回复', icon: ChatLineRound },
  { label: '聚合翻译', icon: Tickets },
  { label: '使用教程', icon: Files },
  { label: '截图翻译', icon: Picture },
  { label: '客服备注', icon: Wallet },
  { label: '意见反馈', icon: Guide },
]
</script>
