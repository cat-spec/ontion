<template>
  <header class="h-9 shrink-0 border-b border-slate-200 bg-white">
    <div class="grid h-full grid-cols-[auto_1fr_auto] items-center">
      <div class="flex h-full items-center divide-x divide-slate-200">
        <div class="flex h-full items-center gap-2 px-3">
          <span class="h-3 w-3 rounded-full bg-red-500"></span>
          <span class="h-3 w-3 rounded-full bg-amber-400"></span>
          <span class="h-3 w-3 rounded-full bg-emerald-500"></span>
        </div>
        <div class="flex h-full items-center gap-2 px-4">
          <span class="text-sm font-semibold text-slate-900">NexBridge SCRM</span>
          <span class="text-xs text-slate-500">0.1.0</span>
        </div>
        <div class="hidden h-full items-center gap-4 px-4 text-xs text-slate-600 md:flex">
          <span>在线：<b class="font-semibold text-emerald-600">{{ clientStore.onlineCount }}</b></span>
          <span>离线：<b class="font-semibold text-slate-500">{{ clientStore.offlineCount }}</b></span>
        </div>
        <el-dropdown trigger="click" @command="activeLineId = String($event)">
          <button class="hidden h-full items-center gap-2 px-4 text-xs text-slate-700 transition-colors hover:bg-slate-50 md:flex">
            <span>{{ activeLine?.name }}</span>
            <span class="text-amber-600">({{ activeLine?.latency }})</span>
            <el-icon><ArrowDown /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="line in lineOptions"
                :key="line.id"
                :command="line.id"
              >
                <div class="flex min-w-36 items-center justify-between gap-6">
                  <span>{{ line.name }}</span>
                  <span class="text-xs text-slate-400">{{ line.latency }}</span>
                </div>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <div class="flex h-full items-center justify-center text-xs text-slate-600">
        <span class="mr-2 h-2 w-2 rounded-full bg-emerald-500"></span>
        已连接安全加密链路
      </div>

      <div class="flex h-full items-center divide-x divide-slate-200">
        <button class="flex h-full items-center px-3 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50">
          24小时客服
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { useClientStore } from '@/stores/client'

const clientStore = useClientStore()

const activeLineId = ref('global')

const lineOptions = [
  { id: 'global', name: '全球专线', latency: '128ms' },
  { id: 'asia', name: '亚洲专线', latency: '86ms' },
  { id: 'europe', name: '欧洲专线', latency: '142ms' },
  { id: 'america', name: '美洲专线', latency: '176ms' },
  { id: 'backup', name: '备用专线', latency: '210ms' },
]

const activeLine = computed(
  () => lineOptions.find((line) => line.id === activeLineId.value) || lineOptions[0],
)
</script>
