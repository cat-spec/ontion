<template>
  <main class="min-w-0 flex-1 overflow-hidden bg-white">
    <header class="flex h-11 items-center gap-5 border-b border-slate-100 px-4">
      <h1 class="text-base font-semibold text-slate-950">{{ pageTitle }}</h1>
      <p class="text-sm text-slate-400">{{ pageDescription }}</p>
    </header>

    <section class="flex h-[calc(100%-2.75rem)] min-h-0">
      <aside class="flex w-[242px] shrink-0 flex-col border-r border-slate-100 bg-white">
        <div class="space-y-3 px-3 py-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-950">分组</h2>
            <span class="text-xs text-slate-400">{{ visibleGroups.length }} 组</span>
          </div>
          <el-input
            v-model="searchKeyword"
            clearable
            :placeholder="isKeywordPage ? '搜索分组/关键词/回复内容' : '搜索分组/欢迎语内容'"
          />
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <div v-if="visibleGroups.length === 0" class="pt-12 text-center text-sm text-slate-400">
            暂无匹配结果
          </div>
          <div v-else class="space-y-2">
            <article
              v-for="group in visibleGroups"
              :key="group.name"
              class="rounded-lg transition-colors"
              :class="group.name === activeGroupName ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'"
            >
              <button
                class="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left"
                @click="selectGroup(group.name)"
              >
                <span class="min-w-0">
                  <span class="block truncate text-sm font-medium">{{ group.name }}</span>
                  <span class="mt-0.5 block truncate text-xs text-slate-400">{{ group.desc }}</span>
                </span>
                <span class="text-xs text-slate-400">{{ getGroupCount(group) }}</span>
              </button>
            </article>
          </div>
        </div>
      </aside>

      <section class="min-w-0 flex-1 overflow-y-auto bg-white p-8">
        <div class="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div class="min-w-0">
            <div class="mb-6 flex items-start justify-between gap-5">
              <div>
                <p class="text-sm text-slate-400">当前分组 / {{ activeGroup?.name }}</p>
                <h2 class="mt-2 text-xl font-semibold text-slate-950">{{ detailTitle }}</h2>
              </div>
              <div class="flex shrink-0 items-center gap-3">
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                  只读展示
                </span>
                <button
                  class="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  @click="openTestDialog"
                >
                  {{ isKeywordPage ? '测试规则' : '模拟首次进入' }}
                </button>
              </div>
            </div>

            <template v-if="isKeywordPage">
              <div v-if="activeKeywordRules.length === 0" class="rounded-lg border border-dashed border-slate-200 p-12 text-center text-sm text-slate-400">
                当前条件下暂无关键词规则
              </div>
              <div v-else class="space-y-4">
                <article
                  v-for="(rule, index) in activeKeywordRules"
                  :key="rule.id"
                  class="group overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm transition-all hover:border-blue-100 hover:shadow-md"
                >
                  <div class="flex">
                    <div
                      class="flex w-14 shrink-0 flex-col items-center justify-between px-3 py-5 text-xs font-semibold"
                      :class="rule.enabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'"
                    >
                      <span>{{ String(index + 1).padStart(2, '0') }}</span>
                      <span class="h-8 w-px bg-current opacity-20" />
                    </div>

                    <div class="min-w-0 flex-1 p-5">
                      <div class="flex flex-wrap items-start justify-between gap-4">
                        <div class="min-w-0 flex-1">
                          <p class="mb-2 text-xs font-medium text-slate-400">关键词</p>
                          <div class="flex flex-wrap gap-2">
                            <span
                              v-for="word in rule.keywords"
                              :key="word"
                              class="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
                            >
                              {{ word }}
                            </span>
                          </div>
                        </div>

                        <div class="flex flex-wrap justify-end gap-2">
                          <span
                            class="rounded-full px-2.5 py-1 text-xs font-medium"
                            :class="rule.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'"
                          >
                            {{ rule.enabled ? '启用' : '停用' }}
                          </span>
                          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {{ rule.matchRule }}
                          </span>
                          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {{ rule.replyMode }}
                          </span>
                        </div>
                      </div>

                      <div class="mt-5 rounded-lg bg-slate-50 p-4">
                        <p class="mb-2 text-xs font-medium text-slate-400">回复内容</p>
                        <p class="text-sm leading-7 text-slate-700">{{ rule.replyContent }}</p>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </template>

            <template v-else>
              <div v-if="activeWelcome" class="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
                <section class="bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6">
                  <div class="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <p class="text-xs font-medium text-slate-400">欢迎语内容</p>
                      <p class="mt-1 text-sm font-semibold text-slate-950">{{ activeWelcome.name }}</p>
                    </div>
                    <span
                      class="rounded-full px-3 py-1 text-xs font-medium"
                      :class="activeWelcome.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'"
                    >
                      {{ activeWelcome.enabled ? '启用' : '停用' }}
                    </span>
                  </div>

                  <div class="relative rounded-lg bg-white p-5 shadow-sm">
                    <span class="absolute -left-2 top-6 h-4 w-4 rotate-45 bg-white" />
                    <p class="text-sm leading-7 text-slate-700">{{ activeWelcome.content }}</p>
                  </div>
                </section>

                <section class="grid grid-cols-1 gap-px bg-slate-100 md:grid-cols-3">
                  <div class="bg-white p-5">
                    <p class="text-xs text-slate-400">发送延迟</p>
                    <p class="mt-2 text-sm font-semibold text-slate-900">{{ activeWelcome.delay }}</p>
                  </div>
                  <div class="bg-white p-5">
                    <p class="text-xs text-slate-400">重复发送</p>
                    <p class="mt-2 text-sm font-semibold text-slate-900">{{ activeWelcome.repeat }}</p>
                  </div>
                  <div class="bg-white p-5">
                    <p class="text-xs text-slate-400">人工接管</p>
                    <p class="mt-2 text-sm font-semibold text-slate-900">{{ activeWelcome.takeover }}</p>
                  </div>
                </section>

                <section class="m-5 rounded-lg border border-dashed border-blue-100 bg-blue-50/30 p-5">
                  <div class="grid gap-4 lg:grid-cols-[1fr_220px]">
                    <div>
                      <p class="text-xs font-medium text-slate-400">图片内容</p>
                      <p class="mt-1 text-sm font-semibold text-slate-700">{{ activeWelcome.imageLabel }}</p>
                      <p class="mt-2 text-xs leading-5 text-slate-500">这里展示最终消息中的图片素材状态，便于配置前判断发送效果。</p>
                    </div>
                    <div class="overflow-hidden rounded-lg border border-white bg-white shadow-sm">
                      <div
                        v-if="activeWelcome.imageUrl"
                        class="flex h-28 items-center justify-center bg-blue-600 text-sm font-semibold text-white"
                      >
                        欢迎海报预览
                      </div>
                      <div v-else class="flex h-28 items-center justify-center text-xs text-slate-400">
                        暂未添加图片
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </template>
          </div>

          <aside class="sticky top-0 h-fit rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-sm font-semibold text-slate-950">命中记录</h3>
              <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                {{ activeHitRecords.length }}
              </span>
            </div>
            <div class="space-y-3">
              <button
                v-for="record in activeHitRecords"
                :key="record.time + record.customer"
                class="relative w-full rounded-lg border p-4 pl-5 text-left transition-colors"
                :class="selectedHitRecord === record ? 'border-blue-200 bg-blue-50/60' : 'border-slate-100 bg-slate-50/70 hover:border-blue-100 hover:bg-blue-50/40'"
                @click="selectedHitRecord = record"
              >
                <span class="absolute left-2 top-5 h-2 w-2 rounded-full bg-blue-500" />
                <div class="mb-2 flex items-center justify-between gap-3">
                  <span class="text-xs font-medium text-slate-400">{{ record.time }}</span>
                  <span class="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">{{ record.platform }}</span>
                </div>
                <p class="text-sm font-semibold text-slate-900">{{ record.customer }}</p>
                <p class="mt-1 text-xs leading-5 text-slate-500">{{ record.trigger }}</p>
              </button>
            </div>

            
          </aside>
        </div>
      </section>
    </section>

    <el-dialog v-model="testDialogVisible" :title="testDialogTitle" width="560px">
      <div class="space-y-4">
        <div class="h-72 overflow-y-auto rounded-lg bg-slate-50 p-4">
          <div class="space-y-3">
            <div
              v-for="message in testMessages"
              :key="message.id"
              class="flex"
              :class="message.role === 'user' ? 'justify-start' : 'justify-end'"
            >
              <div
                class="max-w-[78%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm"
                :class="message.role === 'user' ? 'bg-white text-slate-700' : 'bg-blue-600 text-white'"
              >
                {{ message.text }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="lastSimulationDetail" class="rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-xs leading-5 text-slate-600">
          <p class="font-semibold text-slate-900">命中说明</p>
          <p class="mt-1">{{ lastSimulationDetail }}</p>
        </div>

        <div v-if="isKeywordPage" class="flex gap-2">
          <el-input
            v-model="testInput"
            placeholder="输入客户消息，例如：请问多少钱？"
            @keyup.enter="sendTestMessage"
          />
          <button
            class="h-10 shrink-0 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            @click="sendTestMessage"
          >
            发送
          </button>
        </div>
        <button
          v-else
          class="h-10 w-full rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          @click="runWelcomeSimulation"
        >
          模拟新客户进入会话
        </button>
      </div>
    </el-dialog>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useClientStore } from '@/stores/client'
import {
  filterAutomationGroups,
  filterWelcomeGroups,
  simulateKeywordReply,
  simulateWelcomeReply,
  type AutomationGroup,
  type KeywordRule,
  type WelcomeAutomationGroup,
} from './feature-apps-logic'

interface HitRecord {
  time: string
  platform: string
  customer: string
  trigger: string
  message: string
  ruleName: string
  matchDetail: string
  status: '已发送' | '已拦截'
}

interface TestMessage {
  id: number
  role: 'user' | 'system'
  text: string
}

const clientStore = useClientStore()
const activeGroupName = ref('售前咨询')
const searchKeyword = ref('')
const selectedHitRecord = ref<HitRecord | null>(null)
const testDialogVisible = ref(false)
const testInput = ref('')
const testMessages = ref<TestMessage[]>([])
const lastSimulationDetail = ref('')
const testMessageSequence = ref(0)

const keywordGroups: AutomationGroup[] = [
  {
    name: '售前咨询',
    desc: '价格、库存、规格类问题',
    items: [
      {
        id: '价格咨询回复',
        enabled: true,
        keywords: ['价格', '多少钱', '报价'],
        matchRule: '半匹配',
        replyContent: '您好，请问您预计采购多少件？我可以为您确认对应报价。',
        replyMode: '文本回复',
      },
      {
        id: '库存咨询回复',
        enabled: true,
        keywords: ['库存', '现货', '有没有货'],
        matchRule: '半匹配',
        replyContent: '您好，当前款式可以先为您确认库存，请发送需要的型号和数量。',
        replyMode: '文本回复',
      },
    ],
  },
  {
    name: '物流售后',
    desc: '发货、物流、售后类问题',
    items: [
      {
        id: '物流进度回复',
        enabled: true,
        keywords: ['物流', '发货', '单号'],
        matchRule: '半匹配',
        replyContent: '您好，付款确认后我们会尽快安排发货，并同步物流单号。',
        replyMode: '文本回复',
      },
      {
        id: '售后登记回复',
        enabled: false,
        keywords: ['售后'],
        matchRule: '全匹配',
        replyContent: '您好，请提供订单号和问题图片，我们会为您登记售后处理。',
        replyMode: '文本 + 图片',
      },
    ],
  },
]

const welcomeGroups: WelcomeAutomationGroup[] = [
  {
    id: 'new-customer',
    name: '新客户欢迎',
    desc: '首次进入会话时发送',
    enabled: true,
    content: '您好，欢迎咨询 NexBridge 客服，请问有什么可以帮您？',
    delay: '延迟 3 秒',
    repeat: '仅首次会话',
    takeover: '人工接管后暂停',
    imageLabel: '暂未配置图片',
    imageUrl: '',
  },
  {
    id: 'return-customer',
    name: '老客户回访',
    desc: '长时间未联系后再次进入',
    enabled: true,
    content: '您好，欢迎回来。之前咨询的问题还需要继续为您跟进吗？',
    delay: '立即发送',
    repeat: '超过 30 天未联系后再次发送',
    takeover: '人工接管后暂停',
    imageLabel: '已配置欢迎海报',
    imageUrl: 'welcome-poster',
  },
]

const keywordHitRecords: Record<string, HitRecord[]> = {
  售前咨询: [
    {
      time: '10:42',
      platform: 'WhatsApp',
      customer: 'Alice',
      trigger: '客户消息包含“多少钱”，触发价格咨询回复。',
      message: '你好，这个产品多少钱？',
      ruleName: '价格咨询回复',
      matchDetail: '半匹配关键词“多少钱”',
      status: '已发送',
    },
    {
      time: '09:18',
      platform: 'Telegram',
      customer: '@mark_store',
      trigger: '客户消息包含“现货”，触发库存咨询回复。',
      message: '这个型号现在有现货吗？',
      ruleName: '库存咨询回复',
      matchDetail: '半匹配关键词“现货”',
      status: '已发送',
    },
  ],
  物流售后: [
    {
      time: '昨天',
      platform: 'Line',
      customer: 'Ken',
      trigger: '客户消息包含“单号”，触发物流进度回复。',
      message: '我的物流单号在哪里？',
      ruleName: '物流进度回复',
      matchDetail: '半匹配关键词“单号”',
      status: '已发送',
    },
    {
      time: '周一',
      platform: 'Facebook',
      customer: 'David',
      trigger: '客户消息全匹配“售后”，但规则当前停用。',
      message: '售后',
      ruleName: '售后登记回复',
      matchDetail: '全匹配关键词“售后”，规则停用',
      status: '已拦截',
    },
  ],
}

const welcomeHitRecords: Record<string, HitRecord[]> = {
  新客户欢迎: [
    {
      time: '11:05',
      platform: 'Instagram',
      customer: 'Lily',
      trigger: '客户首次进入会话，延迟 3 秒发送欢迎语。',
      message: '新客户首次进入会话',
      ruleName: '新客户欢迎',
      matchDetail: '触发条件：首次进入会话',
      status: '已发送',
    },
    {
      time: '10:20',
      platform: '抖音',
      customer: '小鹿',
      trigger: '新客户创建会话后触发首次欢迎。',
      message: '新会话创建',
      ruleName: '新客户欢迎',
      matchDetail: '触发条件：新会话创建',
      status: '已发送',
    },
  ],
  老客户回访: [
    {
      time: '昨天',
      platform: 'Line',
      customer: 'Ken',
      trigger: '客户超过 30 天未联系后再次进入会话。',
      message: '老客户再次进入会话',
      ruleName: '老客户回访',
      matchDetail: '触发条件：超过 30 天未联系',
      status: '已发送',
    },
  ],
}

const isKeywordPage = computed(() => clientStore.activeAppId === 'keyword-reply')
const pageTitle = computed(() => isKeywordPage.value ? '关键词回复' : '欢迎语回复')
const pageDescription = computed(() =>
  isKeywordPage.value
    ? '展示中后台已配置的关键词自动回复规则，当前页面仅用于查看。'
    : '新客户首次进入会话时，系统自动发送欢迎语。',
)
const visibleGroups = computed(() =>
  isKeywordPage.value
    ? filterAutomationGroups(keywordGroups, searchKeyword.value)
    : filterWelcomeGroups(welcomeGroups, searchKeyword.value),
)
const sourceGroups = computed(() => isKeywordPage.value ? keywordGroups : welcomeGroups)
const activeGroup = computed(() =>
  sourceGroups.value.find((group) => group.name === activeGroupName.value) || visibleGroups.value[0] || sourceGroups.value[0],
)
const activeKeywordRules = computed<KeywordRule[]>(() => {
  if (!isKeywordPage.value) return []
  const filteredGroup = visibleGroups.value.find((group) => group.name === activeGroup.value?.name) as AutomationGroup | undefined
  return filteredGroup?.items ?? (activeGroup.value as AutomationGroup | undefined)?.items ?? []
})
const activeWelcome = computed(() =>
  !isKeywordPage.value ? activeGroup.value as WelcomeAutomationGroup | undefined : undefined,
)
const detailTitle = computed(() =>
  isKeywordPage.value ? '后台关键词规则' : '欢迎语配置详情',
)
const activeHitRecords = computed(() => {
  const name = activeGroup.value?.name || ''
  return isKeywordPage.value ? keywordHitRecords[name] || [] : welcomeHitRecords[name] || []
})
const testDialogTitle = computed(() => isKeywordPage.value ? '测试关键词命中' : '测试欢迎语触发')

watch(() => clientStore.activeAppId, () => {
  activeGroupName.value = isKeywordPage.value ? '售前咨询' : '新客户欢迎'
  searchKeyword.value = ''
  selectedHitRecord.value = null
})

watch(activeHitRecords, (records) => {
  selectedHitRecord.value = records[0] || null
}, { immediate: true })

function getGroupCount(group: AutomationGroup | WelcomeAutomationGroup) {
  return isKeywordPage.value ? (group as AutomationGroup).items.length : 1
}

function selectGroup(name: string) {
  activeGroupName.value = name
}

function pushTestMessage(role: TestMessage['role'], text: string) {
  testMessageSequence.value += 1
  testMessages.value.push({
    id: testMessageSequence.value,
    role,
    text,
  })
}

function openTestDialog() {
  testDialogVisible.value = true
  testInput.value = ''
  testMessages.value = []
  lastSimulationDetail.value = ''
  if (!isKeywordPage.value) {
    runWelcomeSimulation()
  }
}

function sendTestMessage() {
  const text = testInput.value.trim()
  if (!text) return

  pushTestMessage('user', text)
  const result = simulateKeywordReply(activeKeywordRules.value, text)
  if (result.matched) {
    pushTestMessage('system', result.reply)
    lastSimulationDetail.value = `命中「${result.rule?.id}」，关键词「${result.rule?.matchedKeyword}」，匹配方式「${result.rule?.matchRule}」。`
  } else {
    pushTestMessage('system', '未命中自动回复规则，建议由人工继续处理。')
    lastSimulationDetail.value = result.reason
  }
  testInput.value = ''
}

function runWelcomeSimulation() {
  if (!activeWelcome.value) return

  testMessages.value = []
  lastSimulationDetail.value = ''
  pushTestMessage('user', '新客户进入会话')
  const result = simulateWelcomeReply(activeWelcome.value)
  pushTestMessage('system', result.reply)
  lastSimulationDetail.value = `触发「${activeWelcome.value.name}」，${result.meta.delay}，${result.meta.repeat}，${result.meta.takeover}。`
}
</script>
