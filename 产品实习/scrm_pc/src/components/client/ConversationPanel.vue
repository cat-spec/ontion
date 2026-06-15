<template>
  <aside class="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
    <div class="border-b border-slate-200 p-4">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <p class="text-xs text-slate-400">当前平台</p>
          <h2 class="text-lg font-semibold text-slate-950">{{ clientStore.activePlatform.name }}</h2>
        </div>
        <button class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50">
          <el-icon><Search /></el-icon>
        </button>
      </div>
      <button
        class="flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
        @click="createSession"
      >
        + 创建{{ clientStore.activePlatform.name }}会话
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-3">
      <!-- <div class="rounded-xl border border-blue-200 bg-blue-50 p-3">
        <div class="mb-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500">
              <el-icon><User /></el-icon>
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-900">{{ clientStore.activePlatform.name }}</p>
              <p class="text-xs text-slate-500">账号未绑定</p>
            </div>
          </div>
          <span class="h-2 w-2 rounded-full bg-slate-300"></span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-xs text-slate-500">
          <span>今日会话 {{ activeSessions.length }}</span>
          <span>待回复 0</span>
          <span>粉丝新增 0</span>
          <span>翻译次数 0</span>
        </div>
      </div> -->

      <div
        v-if="activeSessions.length === 0"
        class="mt-6 flex h-56 flex-col items-center justify-center gap-3 rounded-xl bg-white text-sm text-slate-400"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
          <el-icon :size="28"><ChatDotRound /></el-icon>
        </div>
        <span>暂无会话，创建后开始接入</span>
      </div>

      <div v-else class="mt-4 space-y-2">
        <article
          v-for="session in activeSessions"
          :key="session.id"
          class="group relative rounded-xl border bg-white p-3 transition-all hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm"
          :class="session.id === clientStore.activeSessionId ? 'border-blue-300 shadow-sm' : 'border-slate-200'"
          @click="openSession(session.id)"
        >
          <div class="flex items-center gap-3 pr-20">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
              {{ session.title.slice(0, 1) }}
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-950">{{ session.title }}</p>
              <p class="mt-1 truncate text-xs text-slate-500">{{ session.partition }}</p>
            </div>
          </div>
          <div class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {{ getRuntimeSummary(session.id) }}
          </div>

          <div class="absolute inset-0 hidden grid-cols-3 items-center rounded-xl bg-black/30 px-2 py-3 group-hover:grid">
            <button
              class="session-action session-action--login flex h-full flex-col items-center justify-center gap-1.5 rounded-lg text-slate-700 transition-all"
              title="登录"
              aria-label="登录"
              @click.stop="openSession(session.id)"
            >
              <span class="session-action__icon flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm transition-colors">
                <el-icon :size="24"><SwitchButton /></el-icon>
              </span>
              <span class="session-action__label text-sm font-medium text-white drop-shadow transition-colors">登录</span>
            </button>
            <button
              class="session-action session-action--proxy flex h-full flex-col items-center justify-center gap-1.5 rounded-lg text-slate-700 transition-all"
              title="代理"
              aria-label="代理"
              @click.stop="markProxyPending(session.id)"
            >
              <span class="session-action__icon flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm transition-colors">
                <el-icon :size="24"><Connection /></el-icon>
              </span>
              <span class="session-action__label text-sm font-medium text-white drop-shadow transition-colors">代理</span>
            </button>
            <button
              class="session-action session-action--delete flex h-full flex-col items-center justify-center gap-1.5 rounded-lg text-slate-700 transition-all"
              title="删除"
              aria-label="删除"
              @click.stop="deleteSession(session.id)"
            >
              <span class="session-action__icon flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm transition-colors">
                <el-icon :size="24"><Delete /></el-icon>
              </span>
              <span class="session-action__label text-sm font-medium text-white drop-shadow transition-colors">删除</span>
            </button>
          </div>
        </article>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChatDotRound, Connection, Delete, Search, SwitchButton } from '@element-plus/icons-vue'
import { useClientStore } from '@/stores/client'

const clientStore = useClientStore()

const activeSessions = computed(() => clientStore.activeSessions)

async function createSession() {
  await clientStore.createSession()
}

async function openSession(sessionId: string) {
  await clientStore.openSession(sessionId)
}

async function deleteSession(sessionId: string) {
  await clientStore.destroySession(sessionId)
}

function getRuntimeSummary(sessionId: string) {
  const state = clientStore.getSessionState(sessionId)
  if (!state) {
    return '等待运行时初始化'
  }

  const loginLabel = {
    idle: '未打开',
    loading: '载入中',
    qr_required: '待扫码',
    logged_in: '已登录',
    error: '异常',
  }[state.loginState]

  const captureLabel = {
    idle: '未监听',
    observing: '监听中',
    selector_missing: '选择器失效',
    error: '监听异常',
  }[state.captureState]

  return `${loginLabel} / ${captureLabel}`
}

function markProxyPending(sessionId: string) {
  clientStore.markSessionProxyPending(sessionId)
}
</script>

<style scoped>
.session-action:hover {
  transform: translateY(-2px);
  background: rgb(255 255 255 / 24%);
}

.session-action:hover .session-action__icon {
  box-shadow: 0 8px 18px rgb(15 23 42 / 18%);
}

.session-action--login:hover .session-action__icon,
.session-action--login:hover .session-action__label {
  color: #2563eb;
}

.session-action--proxy:hover .session-action__icon,
.session-action--proxy:hover .session-action__label {
  color: #059669;
}

.session-action--delete:hover .session-action__icon,
.session-action--delete:hover .session-action__label {
  color: #ef4444;
}
</style>
