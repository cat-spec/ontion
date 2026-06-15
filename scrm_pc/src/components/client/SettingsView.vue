<template>
  <main class="min-w-0 flex-1 overflow-hidden bg-white">
    <header class="flex h-12 items-center border-b border-slate-200 px-5">
      <h1 class="text-base font-semibold text-slate-950">全局设置</h1>
    </header>

    <div class="flex h-[calc(100%-3rem)] min-h-0">
      <aside class="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-3">
        <nav class="space-y-1">
          <button
            v-for="item in settingMenus"
            :key="item.id"
            class="flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors"
            :class="item.id === activeMenu
              ? 'bg-blue-50 text-blue-600'
              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'"
            @click="activeMenu = item.id"
          >
            <el-icon :size="17"><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </button>
        </nav>

        <div class="mt-auto px-3 pb-2">
          <div class="flex items-center gap-2 text-xs font-medium text-slate-700">
            <span>版本号: 1.0.3</span>
            <el-icon class="text-blue-500"><Refresh /></el-icon>
          </div>
        </div>
      </aside>

      <section class="min-w-0 flex-1 overflow-y-auto bg-white p-6">
        <div v-if="activeMenu === 'platform'" class="max-w-6xl">
          <SectionHeader
            title="平台设置"
            desc="自定义左侧栏平台展示，拖动卡片可调整显示顺序；关闭的平台会从工作区入口隐藏。"
          />

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            <article
              v-for="(platform, index) in platformSettings"
              :key="platform.id"
              draggable="true"
              class="flex h-14 cursor-grab items-center justify-between rounded-lg border bg-white px-4 transition-colors active:cursor-grabbing"
              :class="draggingIndex === index ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-200 hover:bg-blue-50/30'"
              @dragstart="onPlatformDragStart(index)"
              @dragover.prevent
              @drop="onPlatformDrop(index)"
              @dragend="draggingIndex = -1"
            >
              <div class="flex min-w-0 items-center gap-3">
                <el-icon class="shrink-0 text-slate-300"><Rank /></el-icon>
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  :style="{ backgroundColor: platform.color }"
                >
                  {{ platform.badge }}
                </span>
                <span class="truncate text-sm font-semibold text-slate-950">{{ platform.name }}</span>
              </div>
              <el-switch v-model="platform.enabled" />
            </article>
          </div>
        </div>

        <div v-else-if="activeMenu === 'translate'" class="max-w-5xl space-y-4">
          <SectionHeader
            title="翻译设置"
            desc="配置翻译模型，以及接收、发送、群组消息的自动翻译行为。"
          />

          <section class="rounded-lg border border-slate-200 bg-white p-5">
            <h3 class="mb-4 text-sm font-semibold text-slate-950">翻译模型</h3>
            <div class="space-y-4">
              <label class="space-y-2">
                <span class="text-sm text-slate-500">默认模型</span>
                <el-select v-model="translateSettings.model" class="w-full">
                  <el-option label="OpenAI GPT Translate" value="openai" />
                  <el-option label="DeepL" value="deepl" />
                  <el-option label="Google Translate" value="google" />
                  <el-option label="自定义模型" value="custom" />
                </el-select>
              </label>
            </div>
          </section>
          <section class="space-y-4">
            <div class="rounded-lg border border-slate-200 bg-white p-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-sm font-semibold text-slate-950">接收翻译</h3>
                <el-switch v-model="translateSettings.receiveEnabled" />
              </div>
              <div  class="space-y-4">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label class="space-y-2">
                    <span class="text-sm text-slate-500">源语言</span>
                    <el-select v-model="translateSettings.receiveSourceLanguage" class="w-full">
                      <el-option
                        v-for="language in sourceLanguageOptions"
                        :key="language.value"
                        :label="language.label"
                        :value="language.value"
                      />
                    </el-select>
                  </label>
                  <label class="space-y-2">
                    <span class="text-sm text-slate-500">目标语言</span>
                    <el-select v-model="translateSettings.receiveTargetLanguage" class="w-full">
                      <el-option
                        v-for="language in languageOptions"
                        :key="language.value"
                        :label="language.label"
                        :value="language.value"
                      />
                    </el-select>
                  </label>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-slate-200 bg-white p-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-sm font-semibold text-slate-950">发送翻译</h3>
                <el-switch v-model="translateSettings.sendEnabled" />
              </div>
              <div class="space-y-4">
                
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label class="space-y-2">
                    <span class="text-sm text-slate-500">源语言</span>
                    <el-select v-model="translateSettings.sendSourceLanguage" class="w-full">
                      <el-option
                        v-for="language in languageOptions"
                        :key="language.value"
                        :label="language.label"
                        :value="language.value"
                      />
                    </el-select>
                  </label>
                  <label class="space-y-2">
                    <span class="text-sm text-slate-500">目标语言</span>
                    <el-select v-model="translateSettings.sendTargetLanguage" class="w-full">
                      <el-option
                        v-for="language in languageOptions"
                        :key="language.value"
                        :label="language.label"
                        :value="language.value"
                      />
                    </el-select>
                  </label>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-slate-200 bg-white p-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-sm font-semibold text-slate-950">群组翻译</h3>
                <el-switch v-model="translateSettings.groupEnabled" />
              </div>
              <p class="text-sm leading-6 text-slate-500">开启后，群组消息会按当前模型自动处理。</p>
            </div>
          </section>
        </div>

        <div v-else-if="activeMenu === 'proxy'" class="max-w-5xl space-y-4">
          <SectionHeader
            title="全局代理"
            desc="为所有平台统一配置代理连接。当前为静态配置，后续可接入连接测试接口。"
          />

          <section class="rounded-lg border border-slate-200 bg-white p-5">
            <div class="mb-5 flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-slate-950">启用全局代理</h3>
                <p class="mt-1 text-sm text-slate-500">启用后所有平台默认走同一代理规则。</p>
              </div>
              <el-switch v-model="proxySettings.enabled" />
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label class="space-y-2">
                <span class="text-sm text-slate-500">代理类型</span>
                <el-select v-model="proxySettings.type" class="w-full">
                  <el-option label="HTTP" value="http" />
                  <el-option label="HTTPS" value="https" />
                  <el-option label="SOCKS5" value="socks5" />
                </el-select>
              </label>
              <label class="space-y-2">
                <span class="text-sm text-slate-500">主机地址</span>
                <el-input v-model="proxySettings.host" placeholder="127.0.0.1" />
              </label>
              <label class="space-y-2">
                <span class="text-sm text-slate-500">端口</span>
                <el-input-number v-model="proxySettings.port" :min="1" :max="65535" class="w-full" />
              </label>
              <label class="space-y-2">
                <span class="text-sm text-slate-500">用户名</span>
                <el-input v-model="proxySettings.username" placeholder="可选" />
              </label>
              <label class="space-y-2">
                <span class="text-sm text-slate-500">密码</span>
                <el-input v-model="proxySettings.password" placeholder="可选" show-password />
              </label>
              <div class="flex items-end">
                <button class="h-8 rounded-md border border-slate-200 px-4 text-sm text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-600">
                  测试连接
                </button>
              </div>
            </div>
          </section>
        </div>

        <div v-else-if="activeMenu === 'display'" class="max-w-5xl space-y-4">
          <SectionHeader
            title="显示设置"
            desc="调整主题、翻译文本样式，以及重复粉丝标记的展示方式。"
          />

          <section class="rounded-lg border border-slate-200 bg-white p-5">
            <h3 class="mb-4 text-sm font-semibold text-slate-950">主题</h3>
            <div class="grid grid-cols-2 gap-3 md:w-96">
              <button
                v-for="theme in themes"
                :key="theme.value"
                class="h-20 rounded-lg border text-left transition-colors"
                :class="displaySettings.theme === theme.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'"
                @click="displaySettings.theme = theme.value"
              >
                <span class="block px-4 text-sm font-semibold text-slate-950">{{ theme.label }}</span>
                <span class="mt-1 block px-4 text-xs text-slate-500">{{ theme.desc }}</span>
              </button>
            </div>
          </section>

          <section class="rounded-lg border border-slate-200 bg-white p-5">
            <h3 class="mb-4 text-sm font-semibold text-slate-950">翻译文本</h3>
            <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label class="space-y-3">
                <span class="text-sm text-slate-500">字体大小: {{ displaySettings.fontSize }}px</span>
                <el-slider v-model="displaySettings.fontSize" :min="12" :max="22" />
              </label>
              <label class="space-y-2">
                <span class="text-sm text-slate-500">字体颜色</span>
                <el-color-picker v-model="displaySettings.fontColor" />
              </label>
            </div>
            <div class="mt-4 rounded-lg bg-slate-50 p-4" :style="{ color: displaySettings.fontColor, fontSize: `${displaySettings.fontSize}px` }">
              This is a translation preview. 这是一段翻译预览文本。
            </div>
          </section>

          <section class="rounded-lg border border-slate-200 bg-white p-5">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-slate-950">重粉标记</h3>
                <p class="mt-1 text-sm text-slate-500">在会话和客户列表中高亮重复粉丝。</p>
              </div>
              <div class="flex items-center gap-3">
                <el-color-picker v-model="displaySettings.repeatColor" />
                <el-switch v-model="displaySettings.repeatMark" />
              </div>
            </div>
          </section>
        </div>

        <div v-else-if="activeMenu === 'system'" class="max-w-5xl space-y-4">
          <SectionHeader
            title="系统设置"
            desc="管理通知、启动、缓存和默认配置。"
          />

          <section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              v-for="item in systemSwitches"
              :key="item.key"
              class="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-5"
            >
              <div>
                <h3 class="text-sm font-semibold text-slate-950">{{ item.label }}</h3>
                <p class="mt-1 text-sm text-slate-500">{{ item.desc }}</p>
              </div>
              <el-switch v-model="systemSettings[item.key]" />
            </div>
          </section>

          <section class="rounded-lg border border-slate-200 bg-white p-5">
            <h3 class="mb-4 text-sm font-semibold text-slate-950">维护操作</h3>
            <div class="flex flex-wrap gap-3">
              <button class="h-9 rounded-md border border-slate-200 px-4 text-sm text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-600">
                清理缓存
              </button>
              <button class="h-9 rounded-md border border-red-100 px-4 text-sm text-red-500 transition-colors hover:bg-red-50">
                恢复默认设置
              </button>
            </div>
          </section>
        </div>

        <div v-else-if="activeMenu === 'about'" class="max-w-4xl space-y-4">
          <SectionHeader
            title="关于我们"
            desc="NexBridge SCRM 是面向跨境运营场景的多平台客户会话工作台。"
          />

          <section class="rounded-lg border border-slate-200 bg-white p-6">
            <div class="mb-6 flex items-center gap-4">
              <img src="/favicon.svg" alt="NexBridge SCRM" class="h-12 w-12" />
              <div>
                <h2 class="text-lg font-semibold text-slate-950">NexBridge SCRM</h2>
                <p class="text-sm text-slate-500">版本 1.0.3</p>
              </div>
            </div>
            <div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div class="rounded-lg bg-slate-50 p-4">
                <p class="text-slate-500">官方客服</p>
                <p class="mt-2 font-medium text-blue-600">@nextkj</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-4">
                <p class="text-slate-500">官方频道</p>
                <p class="mt-2 font-medium text-blue-600">@nexscrmkf</p>
              </div>
            </div>
            <div class="mt-5 flex flex-wrap gap-3">
              <button class="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                检查更新
              </button>
              <button class="h-9 rounded-md border border-slate-200 px-4 text-sm text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-600">
                打开帮助文档
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { defineComponent, h, reactive, ref } from 'vue'
import {
  Box,
  Cpu,
  InfoFilled,
  Monitor,
  Rank,
  Refresh,
  Switch,
  Tickets,
} from '@element-plus/icons-vue'
import { useClientStore } from '@/stores/client'

interface PlatformSetting {
  id: string
  name: string
  badge: string
  color: string
  enabled: boolean
}

type SystemSettingKey = 'autoStart' | 'notifications' | 'sound' | 'autoUpdate'

const SectionHeader = defineComponent({
  props: {
    title: { type: String, required: true },
    desc: { type: String, required: true },
  },
  setup(props) {
    return () => h('div', { class: 'mb-6' }, [
      h('div', { class: 'mb-2 flex items-center gap-2' }, [
        h('h2', { class: 'text-base font-semibold text-slate-950' }, props.title),
        h(Refresh, { class: 'h-4 w-4 text-slate-400' }),
      ]),
      h('p', { class: 'text-sm leading-6 text-slate-500' }, props.desc),
    ])
  },
})

const clientStore = useClientStore()
const activeMenu = ref('platform')
const draggingIndex = ref(-1)

const settingMenus = [
  { id: 'platform', label: '平台设置', icon: Box },
  { id: 'translate', label: '翻译设置', icon: Tickets },
  { id: 'proxy', label: '全局代理', icon: Switch },
  { id: 'display', label: '显示设置', icon: Monitor },
  { id: 'system', label: '系统设置', icon: Cpu },
  { id: 'about', label: '关于我们', icon: InfoFilled },
]

const platformSettings = reactive<PlatformSetting[]>([
  ...clientStore.platforms.map((platform) => ({
    id: platform.id,
    name: platform.name,
    badge: platform.badge,
    color: platform.color,
    enabled: true,
  })),
  { id: 'telegramk', name: 'TelegramK', badge: 'TK', color: '#229ed9', enabled: true },
  { id: 'skype', name: 'Skype', badge: 'SK', color: '#00aff0', enabled: true },
  { id: 'snapchat', name: 'Snapchat', badge: 'SC', color: '#facc15', enabled: true },
  { id: 'googlevoice', name: 'GoogleVoice', badge: 'GV', color: '#16a34a', enabled: true },
  { id: 'discord', name: 'Discord', badge: 'DC', color: '#5865f2', enabled: true },
  { id: 'wechat', name: 'WeChat', badge: 'WX', color: '#22c55e', enabled: true },
  { id: 'custompage', name: 'CustomPage', badge: 'CP', color: '#10b981', enabled: true },
])

const translateSettings = reactive({
  model: 'openai',
  targetLanguage: 'zh-CN',
  receiveEnabled: true,
  receiveMode: 'auto',
  receiveSourceLanguage: 'auto',
  receiveTargetLanguage: 'zh-CN',
  sendEnabled: true,
  sendMode: 'before',
  sendSourceLanguage: 'zh-CN',
  sendTargetLanguage: 'en-US',
  groupEnabled: false,
})

const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
  { label: '繁體中文', value: 'zh-TW' },
  { label: '日本語', value: 'ja-JP' },
  { label: '한국어', value: 'ko-KR' },
  { label: 'Español', value: 'es-ES' },
]

const sourceLanguageOptions = [
  { label: '自动识别', value: 'auto' },
  ...languageOptions,
]

const proxySettings = reactive({
  enabled: false,
  type: 'socks5',
  host: '',
  port: 1080,
  username: '',
  password: '',
})

const displaySettings = reactive({
  theme: 'light',
  fontSize: 14,
  fontColor: '#111827',
  repeatMark: true,
  repeatColor: '#f59e0b',
})

const themes = [
  { label: '明亮', value: 'light', desc: '适合白天办公' },
  { label: '暗黑', value: 'dark', desc: '适合低光环境' },
]

const systemSettings = reactive<Record<SystemSettingKey, boolean>>({
  autoStart: false,
  notifications: true,
  sound: true,
  autoUpdate: true,
})

const systemSwitches: Array<{ key: SystemSettingKey; label: string; desc: string }> = [
  { key: 'autoStart', label: '开机自动启动', desc: '启动系统后自动打开工作台。' },
  { key: 'notifications', label: '消息通知', desc: '收到新消息时显示系统通知。' },
  { key: 'sound', label: '声音提醒', desc: '新会话和待回复消息播放提示音。' },
  { key: 'autoUpdate', label: '自动检查更新', desc: '启动时检查客户端版本更新。' },
]

function onPlatformDragStart(index: number) {
  draggingIndex.value = index
}

function onPlatformDrop(targetIndex: number) {
  if (draggingIndex.value < 0 || draggingIndex.value === targetIndex) return
  const [dragged] = platformSettings.splice(draggingIndex.value, 1)
  platformSettings.splice(targetIndex, 0, dragged)
  draggingIndex.value = -1
}

</script>
