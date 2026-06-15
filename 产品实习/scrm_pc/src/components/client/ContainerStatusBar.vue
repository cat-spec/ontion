<template>
  <header class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4">
    <div class="min-w-0">
      <div class="flex items-center gap-3">
        <span class="inline-flex h-2.5 w-2.5 rounded-full" :class="indicatorClass"></span>
        <h2 class="truncate text-base font-semibold text-slate-950">
          {{ clientStore.activeSession?.title || '容器工作区' }}
        </h2>
      </div>
      <p class="mt-2 truncate text-sm text-slate-500">
        {{ clientStore.activeStatusLabel }}
        <span v-if="clientStore.activeSessionState?.activeUrl" class="ml-2 text-slate-400">
          {{ clientStore.activeSessionState.activeUrl }}
        </span>
      </p>
      <p v-if="clientStore.activeStatusDetail" class="mt-2 max-w-3xl text-sm leading-6 text-amber-600">
        {{ clientStore.activeStatusDetail }}
      </p>
    </div>

    <div class="flex items-center gap-2">
      <button
        class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-600"
        :disabled="!clientStore.activeSessionId"
        @click="handleRefresh"
      >
        刷新状态
      </button>
      <button
        class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-600"
        :disabled="!clientStore.activeSessionId"
        @click="handleDetach"
      >
        暂停附着
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useClientStore } from '@/stores/client'

const clientStore = useClientStore()

const indicatorClass = computed(() => {
  const state = clientStore.activeSessionState
  if (!state) return 'bg-slate-300'
  if (state.captureState === 'selector_missing' || state.loginState === 'error') return 'bg-amber-500'
  if (state.loginState === 'logged_in' && state.captureState === 'observing') return 'bg-emerald-500'
  if (state.loginState === 'loading') return 'bg-blue-500'
  return 'bg-slate-300'
})

async function handleRefresh() {
  if (!clientStore.activeSessionId) return
  await clientStore.syncSessionState(clientStore.activeSessionId)
}

async function handleDetach() {
  if (!clientStore.activeSessionId) return
  await clientStore.closeSession(clientStore.activeSessionId)
}
</script>
