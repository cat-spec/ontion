<template>
  <aside class="flex w-16 shrink-0 flex-col items-center border-r border-slate-200 bg-white">
    <div class="flex flex-col items-center gap-3 border-b border-slate-200 px-2 py-3">
      <div
        class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white"
        title="NexBridge SCRM"
      >
        <img src="/favicon.svg" alt="NexBridge SCRM" class="h-7 w-7 object-contain" />
      </div>

      <button
        class="group relative flex h-11 w-11 items-center justify-center rounded-2xl border transition-all"
        :class="!clientStore.activeUtilityId && clientStore.homeItem.id === clientStore.activePlatformId
          ? 'border-blue-200 bg-blue-600 text-white shadow-sm shadow-blue-200'
          : 'border-slate-200 bg-slate-50 text-blue-600 hover:border-blue-200 hover:bg-blue-50'"
        :title="clientStore.homeItem.name"
        @click="clientStore.setActivePlatform(clientStore.homeItem.id)"
      >
        <span
          v-if="!clientStore.activeUtilityId && clientStore.homeItem.id === clientStore.activePlatformId"
          class="absolute -left-2 h-7 w-1 rounded-r-full bg-blue-600"
        ></span>
        <el-icon :size="20">
          <component :is="clientStore.homeItem.icon" />
        </el-icon>
      </button>
    </div>
    <div class="scrollbar-thin flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto px-2 py-3">
      <button
        v-for="platform in clientStore.platforms"
        :key="platform.id"
        class="group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all"
        :class="!clientStore.activeUtilityId && platform.id === clientStore.activePlatformId ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'"
        :title="platform.name"
        @click="clientStore.setActivePlatform(platform.id)"
      >
        <span
          v-if="!clientStore.activeUtilityId && platform.id === clientStore.activePlatformId"
          class="absolute -left-1 h-7 w-1 rounded-r-full bg-blue-600"
        ></span>
        <span
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[10px] font-bold shadow-sm ring-1 ring-slate-200"
          :style="{ backgroundColor: `${platform.color}14`, color: platform.color }"
        >
          <img
            :src="platform.iconUrl"
            :alt="platform.name"
            class="h-5 w-5 object-contain"
          />
        </span>
        <span
          class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-white"
          :class="platform.online ? 'bg-emerald-500' : 'bg-slate-300'"
        ></span>
      </button>
    </div>

    <div class="flex flex-col items-center gap-2 border-t border-slate-200 px-2 py-3">
      <div class="group/apps relative">
        <button
          class="relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
          :class="clientStore.activeUtilityId === 'apps' || clientStore.activeUtilityId === 'quick-reply'
            ? 'bg-blue-50 text-blue-600'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'"
          title="功能应用"
        >
          <span
            v-if="clientStore.activeUtilityId === 'apps' || clientStore.activeUtilityId === 'quick-reply'"
            class="absolute -left-2 h-6 w-1 rounded-r-full bg-blue-600"
          ></span>
          <el-icon :size="18"><component :is="clientStore.utilityItems[0].icon" /></el-icon>
        </button>

        <div class="invisible absolute bottom-0 left-full z-50 ml-3 w-64 translate-x-2 opacity-0 transition-all duration-150 group-hover/apps:visible group-hover/apps:translate-x-0 group-hover/apps:opacity-100">
          <div class="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-950/10">
            <p class="px-3 py-2 text-xs font-semibold text-slate-400">功能应用</p>
            <button
              v-for="app in featureApps"
              :key="app.id"
              class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-blue-50"
              @click="openFeatureApp(app.id)"
            >
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                <el-icon :size="18"><component :is="app.icon" /></el-icon>
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold text-slate-900">{{ app.name }}</span>
                <span class="mt-0.5 block text-xs leading-5 text-slate-500">{{ app.desc }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <button
        v-for="item in clientStore.utilityItems.slice(1)"
        :key="item.id"
        class="relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
        :class="item.id === clientStore.activeUtilityId ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'"
        :title="item.name"
        @click="clientStore.setActiveUtility(item.id)"
      >
        <span
          v-if="item.id === clientStore.activeUtilityId"
          class="absolute -left-2 h-6 w-1 rounded-r-full bg-blue-600"
        ></span>
        <el-icon :size="18"><component :is="item.icon" /></el-icon>
      </button>
      <button
        class="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-red-50 hover:text-red-500"
        title="退出"
        aria-label="退出"
        @click="handleExit"
      >
        <el-icon :size="18"><SwitchButton /></el-icon>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ChatLineRound, Key, SwitchButton, Tickets } from '@element-plus/icons-vue'
import { useClientStore } from '@/stores/client'

const clientStore = useClientStore()

const featureApps = [
  { id: 'quick-reply', name: '快捷回复', desc: '管理常用话术模板', icon: ChatLineRound },
  { id: 'keyword-reply', name: '关键词回复', desc: '按客户消息关键词自动回复', icon: Key },
  { id: 'welcome-reply', name: '欢迎语回复', desc: '首次会话自动发送欢迎语', icon: Tickets },
] as const

function openFeatureApp(appId: typeof featureApps[number]['id']) {
  if (appId === 'quick-reply') {
    clientStore.openQuickReply()
    return
  }

  clientStore.openFeatureApp(appId)
}

function handleExit() {
  window.confirm('确认退出当前账号？')
}
</script>

<style scoped>
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  border-radius: 9999px;
  background: #cbd5e1;
}
</style>
