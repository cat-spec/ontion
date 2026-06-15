<template>
  <main class="min-w-0 flex-1 overflow-y-auto bg-slate-100 p-4">
    <div class="space-y-4">
      <section class="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <el-carousel height="100%" indicator-position="none" arrow="never" class="h-full min-h-[184px]">
            <el-carousel-item v-for="slide in adSlides" :key="slide.title">
              <div
                class="flex h-full flex-col justify-between p-5 text-white"
                :class="slide.bg"
              >
                <div>
                  <p class="text-xs font-medium opacity-80">{{ slide.tag }}</p>
                  <h2 class="mt-3 text-xl font-semibold leading-7">{{ slide.title }}</h2>
                </div>
                <p class="text-sm opacity-80">{{ slide.desc }}</p>
              </div>
            </el-carousel-item>
          </el-carousel>
        </div>

        <div class="rounded-lg border border-slate-200 bg-white p-5">
          <div class="mb-5 flex items-start justify-between">
            <h2 class="text-lg font-semibold text-slate-950">c50f787294</h2>
            <span class="rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white">免费版</span>
          </div>
          <dl class="space-y-4 text-sm">
            <div class="flex items-center justify-between">
              <dt class="text-slate-500">今日剩余字符数</dt>
              <dd class="font-medium text-slate-950">5000</dd>
            </div>
            <div class="flex items-center justify-between">
              <dt class="text-slate-500">今日剩余翻译次数</dt>
              <dd class="font-medium text-slate-950">无限</dd>
            </div>
          </dl>
          <button class="mt-5 h-11 w-44 rounded-md bg-slate-900 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
            升级专业版
          </button>
        </div>

        <div class="flex min-h-[184px] flex-col gap-4">
          <div class="flex items-center gap-3">
            <div class="language-control flex h-11 w-40 items-center justify-between rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-950 shadow-sm">
              <div class="flex items-center gap-2">
                <el-icon :size="19" class="text-slate-700"><Position /></el-icon>
                <span>{{ activeLanguageLabel }}</span>
              </div>
              <el-dropdown trigger="click" @command="language = String($event)">
                <button class="flex items-center text-slate-700" aria-label="切换系统语言">
                  <el-icon><ArrowDown /></el-icon>
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="option in languageOptions"
                      :key="option.value"
                      :command="option.value"
                    >
                      {{ option.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <button class="flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100" aria-label="主题设置">
              <el-icon :size="22"><Moon /></el-icon>
            </button>
          </div>

          <section class="relative flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white p-5">
            <span class="absolute left-0 top-6 h-5 w-1 rounded-r-full bg-blue-600"></span>
            <div class="relative z-10 max-w-[58%]">
              <h2 class="mb-4 pl-4 text-base font-semibold text-slate-950">联系我们</h2>
              <div class="mb-3 grid grid-cols-2 gap-4 text-xs font-medium text-blue-600">
                <span>@nextkj</span>
                <span>@nexscrmkf</span>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <button class="h-9 rounded border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:text-blue-600">
                  官方频道
                </button>
                <button class="h-9 rounded border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:text-blue-600">
                  联系我们
                </button>
              </div>
            </div>
            <img
              src="@/assets/hero.png"
              alt=""
              class="absolute bottom-0 right-3 h-[118px] w-[112px] object-contain"
            />
          </section>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        <section class="min-h-[420px] rounded-lg border border-slate-200 bg-white p-5">
          <div class="mb-4 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <h2 class="text-base font-semibold text-slate-950">待处理消息</h2>
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                共 {{ filteredMessages.length }} 条
              </span>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-50 hover:text-blue-600"
              title="刷新"
              @click="refreshMessages"
            >
              <el-icon :size="17"><Refresh /></el-icon>
            </button>
          </div>

          <div class="mb-4 flex flex-wrap gap-2">
            <button
              v-for="filter in messageFilters"
              :key="filter.value"
              class="h-8 rounded-full px-3 text-sm font-medium transition-colors"
              :class="activeMessageStatus === filter.value
                ? 'bg-slate-950 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600'"
              @click="setMessageStatus(filter.value)"
            >
              {{ filter.label }}
            </button>
          </div>

          <div v-if="pagedMessages.length > 0" class="space-y-3">
            <article
              v-for="message in pagedMessages"
              :key="message.id"
              class="group relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-lg border border-slate-100 bg-white px-4 py-3 transition-all duration-200 hover:translate-x-1 hover:border-blue-100 hover:bg-blue-50/40 hover:shadow-sm"
              @click="openMessagePlatform(message)"
            >
              <span
                class="absolute left-0 top-3 h-12 w-1 rounded-r-full opacity-0 transition-opacity group-hover:opacity-100"
                :class="message.status === 'timeout' ? 'bg-red-500' : message.status === 'intent' ? 'bg-emerald-500' : 'bg-blue-500'"
              ></span>
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                :style="{ backgroundColor: message.avatarColor }"
              >
                {{ message.avatar }}
              </div>

              <div class="min-w-0 flex-1">
                <div class="mb-1 flex min-w-0 items-center gap-2">
                  <h3 class="truncate text-sm font-semibold text-slate-950">{{ message.name }}</h3>
                  <span
                    class="shrink-0 rounded px-2 py-0.5 text-xs font-semibold"
                    :style="{ backgroundColor: `${platformMeta(message.platformId).color}14`, color: platformMeta(message.platformId).color }"
                  >
                    {{ platformMeta(message.platformId).name }}
                  </span>
                  <span class="shrink-0 text-xs text-slate-400">{{ message.time }}</span>
                </div>
                <p class="truncate text-sm text-slate-500">{{ message.content }}</p>
              </div>

              <span
                class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="statusClass(message.status)"
              >
                {{ statusLabel(message.status) }}
              </span>

              <el-icon
                :size="18"
                class="shrink-0 translate-x-2 text-slate-300 opacity-0 transition-all group-hover:translate-x-0 group-hover:text-blue-600 group-hover:opacity-100"
              >
                <ArrowRight />
              </el-icon>
            </article>
          </div>

          <div v-else class="flex min-h-[270px] flex-col items-center justify-center text-slate-400">
            <el-icon :size="42" class="mb-3 text-slate-300"><ChatLineRound /></el-icon>
            <p class="text-sm">暂无待处理消息</p>
          </div>

          <div class="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <span class="text-sm text-slate-400">每页 {{ messagePageSize }} 条</span>
            <el-pagination
              v-model:current-page="messagePage"
              :page-size="messagePageSize"
              :total="filteredMessages.length"
              layout="prev, pager, next"
              small
            />
          </div>
        </section>

        <aside class="rounded-lg border border-slate-200 bg-white p-5">
          <h2 class="mb-4 text-base font-semibold text-slate-950">快捷入口</h2>
          <div class="grid grid-cols-3 gap-3">
            <button
              v-for="action in actions"
              :key="action.label"
              class="flex h-20 flex-col items-center justify-center gap-2 rounded-lg bg-slate-50 text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
              @click="handleQuickAction(action)"
            >
              <el-icon :size="24"><component :is="action.icon" /></el-icon>
              <span class="text-xs">{{ action.label }}</span>
            </button>
          </div>
        </aside>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ArrowDown,
  ArrowRight,
  ChatLineRound,
  Collection,
  Guide,
  Moon,
  Position,
  Refresh,
  Setting,
  Switch,
} from '@element-plus/icons-vue'
import { useClientStore } from '@/stores/client'
import type { PlatformId } from '@/platform/contracts'

const clientStore = useClientStore()

const language = ref('zh-CN')
const activeMessageStatus = ref<MessageStatusFilter>('all')
const messagePage = ref(1)
const messagePageSize = 5

type MessageStatus = 'unreplied' | 'timeout' | 'intent'
type MessageStatusFilter = 'all' | MessageStatus

interface PendingMessage {
  id: number
  platformId: PlatformId
  name: string
  avatar: string
  avatarColor: string
  content: string
  time: string
  status: MessageStatus
}

const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
  { label: '繁體中文', value: 'zh-TW' },
]

const activeLanguageLabel = computed(
  () => languageOptions.find((option) => option.value === language.value)?.label || languageOptions[0].label,
)

const adSlides = [
  {
    tag: '运营公告',
    title: '多平台消息聚合能力升级',
    desc: '新增账号绑定、翻译、快捷回复等能力预留入口。',
    bg: 'bg-gradient-to-br from-slate-900 to-blue-700',
  },
  {
    tag: '新手引导',
    title: '完成平台绑定后开始接待客户',
    desc: 'WhatsApp、Telegram、Line 等渠道可逐步接入。',
    bg: 'bg-gradient-to-br from-emerald-700 to-cyan-700',
  },
  {
    tag: '套餐权益',
    title: '升级专业版解锁更多端口',
    desc: '提升会话端口、翻译额度和团队协作能力。',
    bg: 'bg-gradient-to-br from-zinc-800 to-slate-600',
  },
]

const actions = [
  { label: '支持平台', icon: Collection, settingsMenu: 'platform' },
  { label: '翻译设置', icon: Switch, settingsMenu: 'translate' },
  { label: '代理设置', icon: Setting, settingsMenu: 'proxy' },
  { label: '快捷回复', icon: ChatLineRound },
  { label: '意见反馈', icon: Guide, settingsMenu: 'about' },
]

const messageFilters: Array<{ label: string; value: MessageStatusFilter }> = [
  { label: '全部', value: 'all' },
  { label: '未回复', value: 'unreplied' },
  { label: '超时', value: 'timeout' },
  { label: '高意向', value: 'intent' },
]

const pendingMessages: PendingMessage[] = [
  {
    id: 1,
    platformId: 'whatsapp',
    name: 'Alice Johnson',
    avatar: 'A',
    avatarColor: '#22c55e',
    content: '请问这个产品今天还有库存吗？我想确认后直接下单。',
    time: '09:42',
    status: 'unreplied',
  },
  {
    id: 2,
    platformId: 'telegram',
    name: '@mark_store',
    avatar: 'M',
    avatarColor: '#0ea5e9',
    content: '昨天报价可以再优惠一点吗？如果可以我今天确认数量。',
    time: '09:18',
    status: 'intent',
  },
  {
    id: 3,
    platformId: 'instagram',
    name: 'Lily',
    avatar: 'L',
    avatarColor: '#ec4899',
    content: '我想了解代理政策，最低起订量是多少？',
    time: '08:55',
    status: 'unreplied',
  },
  {
    id: 4,
    platformId: 'line',
    name: 'Ken Tanaka',
    avatar: 'K',
    avatarColor: '#06c755',
    content: '付款后多久可以发货？需要提供物流单号。',
    time: '昨天',
    status: 'timeout',
  },
  {
    id: 5,
    platformId: 'facebook',
    name: 'David Miller',
    avatar: 'D',
    avatarColor: '#1877f2',
    content: '这个链接打不开，可以重新发我官网吗？',
    time: '昨天',
    status: 'timeout',
  },
  {
    id: 6,
    platformId: 'douyin',
    name: '小鹿',
    avatar: '鹿',
    avatarColor: '#0f172a',
    content: '刚才直播间看到的套装价格是多少？',
    time: '10:05',
    status: 'unreplied',
  },
  {
    id: 7,
    platformId: 'messenger',
    name: 'Emma',
    avatar: 'E',
    avatarColor: '#2563eb',
    content: '如果我一次购买 200 件，可以安排定制包装吗？',
    time: '周一',
    status: 'intent',
  },
  {
    id: 8,
    platformId: 'x',
    name: 'Noah',
    avatar: 'N',
    avatarColor: '#111827',
    content: 'Can you send the catalog and wholesale price list?',
    time: '周一',
    status: 'unreplied',
  },
  {
    id: 9,
    platformId: 'zalo',
    name: 'Minh',
    avatar: 'M',
    avatarColor: '#0b82ff',
    content: 'Tôi muốn biết chi phí vận chuyển đến Việt Nam.',
    time: '周日',
    status: 'timeout',
  },
]

const filteredMessages = computed(() => {
  if (activeMessageStatus.value === 'all') return pendingMessages

  return pendingMessages.filter((message) => message.status === activeMessageStatus.value)
})

const pagedMessages = computed(() => {
  const start = (messagePage.value - 1) * messagePageSize
  return filteredMessages.value.slice(start, start + messagePageSize)
})

function setMessageStatus(status: MessageStatusFilter) {
  activeMessageStatus.value = status
  messagePage.value = 1
}

function platformMeta(platformId: PlatformId) {
  return clientStore.platforms.find((platform) => platform.id === platformId) || {
    name: platformId,
    color: '#64748b',
  }
}

function statusLabel(status: MessageStatus) {
  const labels: Record<MessageStatus, string> = {
    unreplied: '未回复',
    timeout: '超时',
    intent: '高意向',
  }

  return labels[status]
}

function statusClass(status: MessageStatus) {
  const classes: Record<MessageStatus, string> = {
    unreplied: 'bg-blue-50 text-blue-600',
    timeout: 'bg-red-50 text-red-600',
    intent: 'bg-emerald-50 text-emerald-600',
  }

  return classes[status]
}

function openMessagePlatform(message: PendingMessage) {
  clientStore.setActivePlatform(message.platformId)
}

function refreshMessages() {
  messagePage.value = 1
}

function handleQuickAction(action: typeof actions[number]) {
  if (action.settingsMenu) {
    clientStore.openSettings(action.settingsMenu)
    return
  }

  if (action.label === '快捷回复') {
    clientStore.openQuickReply()
  }
}
</script>
