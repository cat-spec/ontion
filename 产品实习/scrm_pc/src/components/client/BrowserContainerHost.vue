<template>
  <div ref="hostRef" class="relative h-full min-h-0 overflow-hidden bg-white">
    <div
      v-if="!clientStore.isDesktopRuntime"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white p-8 text-center text-slate-500"
    >
      <div class="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
        <el-icon :size="28"><Monitor /></el-icon>
      </div>
      <p class="text-sm">启动桌面端后可接入平台 Web 容器</p>
    </div>

    <div
      v-else-if="!clientStore.activeSessionId"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white text-center text-slate-500"
    >
      <div class="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
        <el-icon :size="28"><Pointer /></el-icon>
      </div>
      <p class="text-sm">选择一个会话开始接入</p>
    </div>

    <div class="pointer-events-none absolute inset-0 border border-slate-100"></div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Monitor, Pointer } from '@element-plus/icons-vue'
import { useClientStore } from '@/stores/client'
import { buildHiddenContainerBounds } from '@/platform/container-bounds'
import { getPlatformBridge } from '@/platform/runtime'

const clientStore = useClientStore()
const bridge = getPlatformBridge()
const hostRef = ref<HTMLElement | null>(null)

let resizeObserver: ResizeObserver | null = null
let frameId = 0

function cancelFrame() {
  if (frameId) {
    cancelAnimationFrame(frameId)
    frameId = 0
  }
}

function scheduleSync() {
  cancelFrame()
  frameId = requestAnimationFrame(() => {
    void syncBounds()
  })
}

async function syncBounds() {
  if (!clientStore.activeSessionId || !hostRef.value || !clientStore.isDesktopRuntime) {
    return
  }

  const rect = hostRef.value.getBoundingClientRect()
  await bridge.setBounds({
    sessionId: clientStore.activeSessionId,
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    visible: rect.width > 0 && rect.height > 0,
  })
}

async function hideSessionBounds(sessionId: string) {
  if (!clientStore.isDesktopRuntime) {
    return
  }

  await bridge.setBounds(buildHiddenContainerBounds(sessionId))
}

onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    scheduleSync()
  })

  if (hostRef.value) {
    resizeObserver.observe(hostRef.value)
  }

  window.addEventListener('resize', scheduleSync)
  window.addEventListener('scroll', scheduleSync, true)
  void nextTick(syncBounds)
})

watch(() => clientStore.activeSessionId, (nextSessionId, previousSessionId) => {
  if (previousSessionId && previousSessionId !== nextSessionId) {
    void hideSessionBounds(previousSessionId)
  }

  if (!nextSessionId) {
    return
  }

  void nextTick(syncBounds)
})

watch(() => clientStore.hostVersion, () => {
  void nextTick(syncBounds)
})

onBeforeUnmount(() => {
  if (clientStore.activeSessionId) {
    void hideSessionBounds(clientStore.activeSessionId)
  }

  cancelFrame()
  resizeObserver?.disconnect()
  resizeObserver = null
  window.removeEventListener('resize', scheduleSync)
  window.removeEventListener('scroll', scheduleSync, true)
})
</script>
