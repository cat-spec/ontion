<template>
  <aside class="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white">
    <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <div>
        <h2 class="text-base font-semibold text-slate-950">消息捕获时间线</h2>
        <p class="mt-1 text-sm text-slate-500">展示当前会话回传到工作台的消息事件。</p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          {{ clientStore.activeCaptureEvents.length }} 条
        </span>
        <button
          class="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 transition-colors hover:border-blue-200 hover:text-blue-600"
          type="button"
          @click="emit('collapse')"
        >
          收起
        </button>
      </div>
    </div>

    <div v-if="clientStore.activeCaptureEvents.length === 0" class="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-400">
      当前还没有捕获到消息。登录抖音聊天页后，接收或发送消息会在这里显示。
    </div>

    <div v-else class="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
      <article
        v-for="event in clientStore.activeCaptureEvents"
        :key="event.messageKey"
        class="rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <span
            class="rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="event.direction === 'incoming' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'"
          >
            {{ event.direction === 'incoming' ? '接收' : '发送' }}
          </span>
          <time class="text-xs text-slate-400">{{ formatTimestamp(event.timestamp) }}</time>
        </div>
        <p class="mt-3 break-words text-sm leading-6 text-slate-700">{{ event.text }}</p>
        <div class="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
          <span>会话: {{ event.conversationKey }}</span>
          <span>键值: {{ event.messageKey }}</span>
        </div>
      </article>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useClientStore } from '@/stores/client'

const clientStore = useClientStore()
const emit = defineEmits<{
  collapse: []
}>()

function formatTimestamp(value: number) {
  const date = new Date(value)
  return date.toLocaleString('zh-CN', {
    hour12: false,
  })
}
</script>
