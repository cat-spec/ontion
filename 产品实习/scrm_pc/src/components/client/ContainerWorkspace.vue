<template>
  <main class="flex min-w-0 flex-1 overflow-hidden bg-white">
    <section class="relative min-w-0 flex-1 overflow-hidden">
      <BrowserContainerHost class="h-full" />
    </section>

    <Transition name="tool-panel">
      <aside
        v-if="shouldShowToolRail && activeTool"
        class="flex w-[400px] shrink-0 flex-col border-l border-slate-200 bg-white shadow-[-8px_0_24px_rgba(15,23,42,0.04)]"
      >
        <header class="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4">
          <div class="flex min-w-0 items-center gap-2">
            <h2 class="truncate text-base font-semibold text-slate-950">{{ activeToolMeta?.label }}</h2>
            <el-icon v-if="activeTool === 'translate'" :size="15" class="text-slate-400"><Refresh /></el-icon>
          </div>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
            title="收起"
            @click="activeTool = ''"
          >
            <el-icon :size="18"><Fold /></el-icon>
          </button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <section v-if="activeTool === 'translate'" class="space-y-4 text-sm">
            <article class="rounded-lg border border-slate-200 bg-white p-4">
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <h3 class="font-semibold text-slate-950">独立翻译</h3>
                  <p class="mt-1 text-xs leading-5 text-slate-500">关闭时，当前设置将应用于所有聊天对象。</p>
                </div>
                <el-switch v-model="translatePanel.independent" />
              </div>

              <label class="block space-y-2">
                <span class="text-slate-500">翻译线路</span>
                <el-select v-model="translatePanel.model" class="w-full">
                  <el-option label="GPT4o-mini" value="gpt4o-mini" />
                  <el-option label="DeepL" value="deepl" />
                  <el-option label="Google Translate" value="google" />
                </el-select>
              </label>
            </article>

            <article class="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-slate-950">接收翻译设置</h3>
                <el-switch v-model="translatePanel.receiveEnabled" />
              </div>
              <label class="block space-y-2">
                <span class="text-slate-500">源语言</span>
                <el-select v-model="translatePanel.receiveSource" class="w-full">
                  <el-option label="自动检测" value="auto" />
                  <el-option label="中文（简体）" value="zh-CN" />
                  <el-option label="英语" value="en-US" />
                </el-select>
              </label>
              <label class="block space-y-2">
                <span class="text-slate-500">目标语言</span>
                <el-select v-model="translatePanel.receiveTarget" class="w-full">
                  <el-option label="中文（简体）" value="zh-CN" />
                  <el-option label="英语" value="en-US" />
                  <el-option label="日本语" value="ja-JP" />
                </el-select>
              </label>
            </article>

            <article class="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-slate-950">发送翻译设置</h3>
                <el-switch v-model="translatePanel.sendEnabled" />
              </div>
              <label class="block space-y-2">
                <span class="text-slate-500">源语言</span>
                <el-select v-model="translatePanel.sendSource" class="w-full">
                  <el-option label="自动检测" value="auto" />
                  <el-option label="中文（简体）" value="zh-CN" />
                  <el-option label="英语" value="en-US" />
                </el-select>
              </label>
              <label class="block space-y-2">
                <span class="text-slate-500">目标语言</span>
                <el-select v-model="translatePanel.sendTarget" class="w-full">
                  <el-option label="英语" value="en-US" />
                  <el-option label="中文（简体）" value="zh-CN" />
                  <el-option label="Español" value="es-ES" />
                </el-select>
              </label>
            </article>

            <article class="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-slate-900">群组自动翻译</span>
                <el-switch v-model="translatePanel.groupEnabled" />
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 font-semibold text-slate-900">
                  禁发中文
                  <el-icon :size="14" class="text-slate-400"><QuestionFilled /></el-icon>
                </div>
                <el-switch v-model="translatePanel.blockChinese" />
              </div>

              <label class="block space-y-2">
                <span class="font-semibold text-slate-900">AI提示语</span>
                <el-input
                  v-model="translatePanel.prompt"
                  :rows="3"
                  type="textarea"
                  placeholder="请输入翻译说明"
                />
              </label>
            </article>
          </section>

          <section v-else-if="activeTool === 'proxy'" class="space-y-4 text-sm">
            <article class="rounded-lg border border-slate-200 bg-white p-4">
              <div class="mb-4 flex items-center justify-between">
                <div>
                  <h3 class="font-semibold text-slate-950">代理环境</h3>
                  <p class="mt-1 text-xs leading-5 text-slate-500">为当前容器单独配置访问线路。</p>
                </div>
                <el-switch v-model="proxyPanel.enabled" />
              </div>
              <div class="space-y-4" :class="proxyPanel.enabled ? '' : 'opacity-45'">
                <label class="block space-y-2">
                  <span class="text-slate-500">代理模式</span>
                  <el-select v-model="proxyPanel.mode" class="w-full" :disabled="!proxyPanel.enabled">
                    <el-option label="跟随全局代理" value="global" />
                    <el-option label="当前平台独立代理" value="platform" />
                    <el-option label="当前会话独立代理" value="session" />
                  </el-select>
                </label>
                <label class="block space-y-2">
                  <span class="text-slate-500">代理类型</span>
                  <el-select v-model="proxyPanel.type" class="w-full" :disabled="!proxyPanel.enabled">
                    <el-option label="SOCKS5" value="socks5" />
                    <el-option label="HTTP" value="http" />
                    <el-option label="HTTPS" value="https" />
                  </el-select>
                </label>
                <label class="block space-y-2">
                  <span class="text-slate-500">主机地址</span>
                  <el-input v-model="proxyPanel.host" placeholder="127.0.0.1" :disabled="!proxyPanel.enabled" />
                </label>
                <label class="block space-y-2">
                  <span class="text-slate-500">端口</span>
                  <el-input v-model="proxyPanel.port" placeholder="1080" :disabled="!proxyPanel.enabled" />
                </label>
                <label class="block space-y-2">
                  <span class="text-slate-500">用户名</span>
                  <el-input v-model="proxyPanel.username" placeholder="可选" :disabled="!proxyPanel.enabled" />
                </label>
                <label class="block space-y-2">
                  <span class="text-slate-500">密码</span>
                  <el-input v-model="proxyPanel.password" placeholder="可选" show-password :disabled="!proxyPanel.enabled" />
                </label>
              </div>
            </article>
            <!-- <article class="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-slate-950">连接检测</span>
                <span class="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600">待检测</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="rounded-md bg-slate-50 p-2">
                  <p class="text-slate-400">出口 IP</p>
                  <p class="mt-1 font-semibold text-slate-700">{{ proxyPanel.detectIp }}</p>
                </div>
                <div class="rounded-md bg-slate-50 p-2">
                  <p class="text-slate-400">地区</p>
                  <p class="mt-1 font-semibold text-slate-700">{{ proxyPanel.detectRegion }}</p>
                </div>
                <div class="rounded-md bg-slate-50 p-2">
                  <p class="text-slate-400">延迟</p>
                  <p class="mt-1 font-semibold text-slate-700">{{ proxyPanel.detectLatency }}</p>
                </div>
                <div class="rounded-md bg-slate-50 p-2">
                  <p class="text-slate-400">状态</p>
                  <p class="mt-1 font-semibold text-amber-600">{{ proxyPanel.detectStatus }}</p>
                </div>
              </div>
              <button
                class="h-9 w-full rounded-md bg-slate-950 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                :disabled="!proxyPanel.enabled"
              >
                测试代理连接
              </button>
            </article> -->
            <article class="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-semibold text-slate-950">环境设计</h3>
                  <p class="mt-1 text-xs leading-5 text-slate-500">调整浏览器环境参数，保持容器特征稳定一致。</p>
                </div>
              </div>
              <div class="space-y-4">
                <label class="block space-y-2">
                  <span class="text-slate-500">浏览器版本</span>
                  <el-select v-model="proxyPanel.browserVersion" class="w-full">
                    <el-option label="随机版本" value="random" />
                    <el-option label="Chrome 132" value="chrome132" />
                    <el-option label="Chrome 131" value="chrome131" />
                    <el-option label="Chrome 130" value="chrome130" />
                  </el-select>
                </label>

                <div class="grid grid-cols-[72px_1fr] gap-3">
                  <span class="pt-2 text-slate-500">操作系统</span>
                  <div class="grid w-full grid-cols-2 overflow-hidden rounded-md border border-slate-200">
                    <button
                      class="h-8 text-sm transition-colors"
                      :class="proxyPanel.osType === 'Windows' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'"
                      @click="proxyPanel.osType = 'Windows'"
                    >
                      Windows
                    </button>
                    <button
                      class="h-8 border-l border-slate-200 text-sm transition-colors"
                      :class="proxyPanel.osType === 'MacOS' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'"
                      @click="proxyPanel.osType = 'MacOS'"
                    >
                      MacOS
                    </button>
                  </div>
                </div>

                <label class="block space-y-2">
                  <span class="text-slate-500">User Agent</span>
                  <el-input
                    v-model="proxyPanel.userAgent"
                    :rows="4"
                    type="textarea"
                    placeholder="请输入 User Agent"
                  />
                  <p class="text-xs leading-5 text-slate-500">建议您使用与本地操作相匹配的User Agent</p>
                  <button
                    class="h-8 w-24 rounded-md border border-slate-200 text-sm text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-600"
                    type="button"
                    @click="randomizeUserAgent"
                  >
                    换一换
                  </button>
                </label>

                <div class="space-y-2">
                  

                  

                 
                </div>
                <div class="grid grid-cols-[72px_1fr] gap-3">
                  <span class="pt-2 text-slate-500">语言</span>
                  <div class="space-y-1">
                    <el-switch v-model="proxyPanel.languageEnabled" />
                    <p class="text-xs leading-5 text-slate-500">基于IP生成对应国家的浏览器语言</p>
                  </div>
                </div>

                <div class="grid grid-cols-[72px_1fr] gap-3">
                  <span class="pt-2 text-slate-500">时区</span>
                  <div class="space-y-1">
                    <el-switch v-model="proxyPanel.timezoneByIp" />
                    <p class="text-xs leading-5 text-slate-500">基于IP生成对应的时区</p>
                  </div>
                </div>

                <div class="grid grid-cols-[72px_1fr] gap-3">
                  <span class="pt-2 text-slate-500">地理位置</span>
                  <div class="space-y-2">
                    <div class="grid w-full grid-cols-3 overflow-hidden rounded-md border border-slate-200">
                      <button
                        v-for="option in locationOptions"
                        :key="option.value"
                        class="h-8 border-l border-slate-200 text-sm transition-colors first:border-l-0"
                        :class="proxyPanel.locationMode === option.value ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'"
                        @click="proxyPanel.locationMode = option.value"
                      >
                        {{ option.label }}
                      </button>
                    </div>
                    <p class="text-xs leading-5 text-slate-500">网站会显示获取您当前位置的询问提示，您可以允许或禁止，与普通浏览器的提示一样</p>
                  </div>
                </div>

                <div class="grid grid-cols-[72px_1fr] gap-3">
                  <span class="pt-2 text-slate-500">分辨率</span>
                  <div class="space-y-2">
                    <div class="grid w-full grid-cols-3 overflow-hidden rounded-md border border-slate-200">
                      <button
                        v-for="option in resolutionOptions"
                        :key="option.value"
                        class="h-8 border-l border-slate-200 text-sm transition-colors first:border-l-0"
                        :class="proxyPanel.resolutionMode === option.value ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'"
                        @click="proxyPanel.resolutionMode = option.value"
                      >
                        {{ option.label }}
                      </button>
                    </div>
                    <p class="text-xs leading-5 text-slate-500" v-if="proxyPanel.resolutionMode === 'custom'">自定义分辨率将在后续支持输入具体尺寸</p>
                  </div>
                </div>

                <div class="grid grid-cols-[72px_1fr] gap-3">
                  <span class="pt-2 text-slate-500">WebRTC</span>
                  <div class="space-y-2">
                    <div class="grid w-full grid-cols-3 overflow-hidden rounded-md border border-slate-200">
                      <button
                        v-for="option in webrtcOptions"
                        :key="option.value"
                        class="h-8 border-l border-slate-200 text-sm transition-colors first:border-l-0"
                        :class="proxyPanel.webrtcMode === option.value ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'"
                        @click="proxyPanel.webrtcMode = option.value"
                      >
                        {{ option.label }}
                      </button>
                    </div>
                    <p class="text-xs leading-5 text-slate-500">开启WebRTC，将公网IP替换为代理IP</p>
                  </div>
                </div>
              </div>
            </article>
            <article class="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
              <div>
                <h3 class="font-semibold text-slate-950">Cookie</h3>
                <p class="mt-1 text-xs leading-5 text-slate-500">管理当前会话容器 Cookie，后续可接入真实导入导出。</p>
              </div>
              <label class="block space-y-2">
                <span class="text-slate-500">Cookie 内容</span>
                <el-input
                  v-model="proxyPanel.cookieText"
                  :rows="4"
                  type="textarea"
                  placeholder="粘贴 Cookie JSON 或 header 字符串"
                />
              </label>
              <div class="grid grid-cols-2 gap-2">
              </div>
            </article>

            <article class="rounded-lg border border-amber-100 bg-amber-50 p-4 text-xs leading-5 text-amber-700">
              <h3 class="mb-2 text-sm font-semibold text-amber-800">安全提示</h3>
              <p>建议一个账号固定使用一个代理环境；不建议频繁切换国家或地区；代理、时区、语言应尽量保持一致；清空 Cookie 会导致平台重新登录。</p>
            </article>
          </section>

          <section v-else-if="activeTool === 'quick-reply'" class="space-y-4 text-sm">
            <div class="rounded-lg bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-600">
              以下为系统内置快捷回复分组，点击模板后后续可写入当前聊天输入框。
            </div>

            <div class="flex items-center gap-5">
              <label class="flex items-center gap-2 text-blue-600">
                <input v-model="quickReplyPanel.sendMode" type="radio" value="original" />
                原文发送
              </label>
              <label class="flex items-center gap-2 text-slate-600">
                <input v-model="quickReplyPanel.sendMode" type="radio" value="translated" />
                翻译后发送
              </label>
            </div>

            <el-input v-model="quickReplyPanel.keyword" placeholder="请输入关键词">
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>

            <div class="space-y-3">
              <div
                v-for="group in filteredQuickReplyGroups"
                :key="group.name"
                class="rounded-lg border border-slate-200 bg-white p-3"
              >
                <div class="mb-3 flex items-center justify-between">
                  <div class="flex items-center gap-2 font-semibold text-slate-800">
                    <el-icon class="text-slate-400"><Folder /></el-icon>
                    <span>{{ group.name }}</span>
                  </div>
                  <span class="rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-400">
                    {{ group.templates.length }} 个模板
                  </span>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="template in group.templates"
                    :key="template.title"
                    class="cursor-pointer rounded-md border border-slate-100 bg-slate-50 p-3 transition-colors hover:border-blue-100 hover:bg-blue-50/60"
                  >
                    <div class="mb-2 flex items-center gap-2">
                      <span class="font-semibold text-blue-600">{{ template.order }}</span>
                      <span class="rounded bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">{{ template.action }}</span>
                      <span class="rounded bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">{{ template.tip }}</span>
                    </div>
                    <p class="text-sm leading-6 text-slate-700">{{ template.content }}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section v-else class="flex h-full min-h-[360px] flex-col items-center justify-center text-center text-slate-400">
            <el-icon :size="34" class="mb-3"><component :is="activeToolMeta?.icon" /></el-icon>
            <p class="text-sm font-medium text-slate-600">{{ activeToolMeta?.label }}</p>
            <p class="mt-2 max-w-[190px] text-xs leading-5">该功能面板已预留，后续可在这里接入对应设置与操作。</p>
          </section>
        </div>
      </aside>
    </Transition>

    <aside
      v-if="shouldShowToolRail"
      class="flex w-[72px] shrink-0 flex-col items-center border-l border-slate-200 bg-white py-4"
    >
      <div class="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-2">
        <button
          v-for="item in toolItems"
          :key="item.label"
          class="group flex w-full flex-col items-center gap-1 rounded-xl px-1 py-3 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
          :class="activeTool === item.id ? 'bg-blue-50 text-blue-600' : ''"
          :title="item.label"
          @click="handleToolClick(item.id)"
        >
          <el-icon :size="24" class="transition-transform group-hover:-translate-y-0.5">
            <component :is="item.icon" />
          </el-icon>
          <span class="text-center text-xs font-semibold leading-4">{{ item.label }}</span>
        </button>
      </div>
    </aside>
  </main>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  ChatLineRound,
  Connection,
  Fold,
  Folder,
  QuestionFilled,
  Reading,
  Refresh,
  Search,
} from '@element-plus/icons-vue'
import BrowserContainerHost from './BrowserContainerHost.vue'
import { useClientStore } from '@/stores/client'

const clientStore = useClientStore()
const shouldShowToolRail = computed(() => clientStore.isDesktopRuntime && Boolean(clientStore.activeSessionId))
const activeTool = ref('')

const translatePanel = reactive({
  independent: false,
  model: 'gpt4o-mini',
  receiveEnabled: true,
  receiveSource: 'auto',
  receiveTarget: 'zh-CN',
  sendEnabled: true,
  sendSource: 'auto',
  sendTarget: 'en-US',
  groupEnabled: false,
  blockChinese: true,
  prompt: '',
})

const proxyPanel = reactive({
  enabled: false,
  mode: 'global',
  type: 'socks5',
  host: '',
  port: '',
  username: '',
  password: '',
  detectIp: '--',
  detectRegion: '--',
  detectLatency: '--',
  detectStatus: '未检测',
  browserVersion: 'random',
  osType: 'Windows',
  timezoneByIp: true,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6896.55 Safari/537.36',
  webglDataMode: 'custom',
  webglVendor: 'Google Inc. (AMD)',
  webglRenderer: 'ANGLE (AMD, Radeon R9 390X Direct3D11 vs_5_0 ps_5_0, D3D11)',
  webglImageEnabled: true,
  languageEnabled: true,
  locationMode: 'prompt',
  resolutionMode: 'system',
  webrtcMode: 'replace',
  cookieStatus: '未应用',
  cookieText: '',
})

const locationOptions = [
  { label: '询问', value: 'prompt' },
  { label: '允许', value: 'allow' },
  { label: '禁用', value: 'disabled' },
]

const resolutionOptions = [
  { label: '跟随系统', value: 'system' },
  { label: '自定义', value: 'custom' },
  { label: '随机', value: 'random' },
]

const webrtcOptions = [
  { label: '替换', value: 'replace' },
  { label: '允许', value: 'allow' },
  { label: '禁用', value: 'disabled' },
]

const userAgentSamples = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6896.55 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.86 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6896.55 Safari/537.36',
]

const quickReplyPanel = reactive({
  sendMode: 'original',
  keyword: '',
})

const quickReplyGroups = [
  {
    name: '测试分组',
    templates: [
      { order: 1, action: '发送', tip: '输入框提示', title: '新模板', content: '测试模板用例' },
    ],
  },
  {
    name: '售前咨询',
    templates: [
      { order: 2, action: '发送', tip: '产品介绍', title: '价格说明', content: '您好，产品价格会根据数量和规格计算，我可以先为您确认需求。' },
      { order: 3, action: '发送', tip: '库存确认', title: '库存回复', content: '您好，当前款式有库存，请问您预计采购多少件？' },
    ],
  },
  {
    name: '售后服务',
    templates: [
      { order: 4, action: '发送', tip: '物流说明', title: '发货时间', content: '您好，付款确认后我们会尽快安排发货，并同步物流单号。' },
    ],
  },
]

const filteredQuickReplyGroups = computed(() => {
  const keyword = quickReplyPanel.keyword.trim().toLowerCase()
  if (!keyword) return quickReplyGroups

  return quickReplyGroups
    .map((group) => ({
      ...group,
      templates: group.templates.filter((template) =>
        template.title.toLowerCase().includes(keyword)
          || template.content.toLowerCase().includes(keyword),
      ),
    }))
    .filter((group) => group.templates.length > 0 || group.name.toLowerCase().includes(keyword))
})

const toolItems = [
  { id: 'translate', label: '翻译设置', icon: Reading },
  { id: 'proxy', label: '代理环境', icon: Connection },
  { id: 'quick-reply', label: '快捷回复', icon: ChatLineRound },
]

const activeToolMeta = computed(() => toolItems.find((item) => item.id === activeTool.value) || null)

function handleToolClick(id: string) {
  activeTool.value = activeTool.value === id ? '' : id
}

function randomizeUserAgent() {
  const next = userAgentSamples.find((item) => item !== proxyPanel.userAgent) || userAgentSamples[0]
  proxyPanel.userAgent = next
}

</script>

<style scoped>
.tool-panel-enter-active,
.tool-panel-leave-active {
  transition: width 180ms ease, opacity 180ms ease, transform 180ms ease;
}

.tool-panel-enter-from,
.tool-panel-leave-to {
  width: 0;
  opacity: 0;
  transform: translateX(12px);
}
</style>
