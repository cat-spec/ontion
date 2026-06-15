<template>
  <main class="min-w-0 flex-1 overflow-hidden bg-white">
    <header class="flex h-11 items-center gap-5 border-b border-slate-100 px-4">
      <h1 class="text-base font-semibold text-slate-950">快捷回复</h1>
      <p class="text-sm text-slate-400">预先设置一些常见问题的回复用语，帮助您提高回复效率</p>
    </header>

    <section class="flex h-[calc(100%-2.75rem)] min-h-0">
      <aside class="flex w-[242px] shrink-0 flex-col border-r border-slate-100 bg-white">
        <div class="px-3 py-4">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-950">分组</h2>
            <div class="flex items-center gap-3 text-emerald-500">
              <button class="transition-colors hover:text-emerald-600" title="新增分组" @click="addGroup">
                <el-icon :size="16"><Plus /></el-icon>
              </button>
            </div>
          </div>

          <el-input v-model="keyword" clearable placeholder="搜索分组/模板标题/回复内容" />
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <div v-if="groups.length === 0" class="pt-12 text-center text-sm text-slate-400">
            暂无数据
          </div>

          <div v-else-if="filteredGroups.length === 0" class="pt-12 text-center text-sm text-slate-400">
            暂无匹配结果
          </div>

          <div v-else class="space-y-3">
            <article
              v-for="group in filteredGroups"
              :key="group.id"
              class="rounded-lg border transition-colors"
              :class="group.id === activeGroupId ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-100 bg-white hover:border-slate-200'"
            >
              <div class="flex h-10 items-center justify-between gap-2 px-3">
                <button
                  class="min-w-0 flex-1 text-left"
                  @click="activeGroupId = group.id"
                  @dblclick="startEditGroupName(group.id)"
                >
                  <el-input
                    v-if="editingGroupId === group.id"
                    v-model="group.name"
                    autofocus
                    size="small"
                    @blur="finishEditGroupName(group)"
                    @click.stop
                    @keyup.enter="finishEditGroupName(group)"
                  />
                  <span v-else class="block truncate text-sm font-medium text-slate-800">{{ group.name }}</span>
                </button>
                <button
                  v-if="group.id === activeGroupId"
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-emerald-500 transition-colors hover:bg-white hover:text-emerald-600"
                  title="新增模板"
                  @click="addTemplate(group.id)"
                >
                  <el-icon :size="15"><DocumentAdd /></el-icon>
                </button>
                <span v-else class="text-xs text-slate-400">{{ group.templates.length }}</span>
              </div>

              <div v-if="group.id === activeGroupId" class="border-t border-slate-100 py-1">
                <button
                  v-for="template in group.templates"
                  :key="template.id"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                  :class="template.id === activeTemplateId
                    ? 'bg-white text-emerald-600'
                    : 'text-slate-500 hover:bg-white hover:text-slate-900'"
                  @click="selectTemplate(template.id)"
                >
                  <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-current"></span>
                  <span class="truncate">{{ template.title }}</span>
                </button>
                <p v-if="group.templates.length === 0" class="px-3 py-4 text-center text-sm text-slate-400">
                  暂无模板
                </p>
              </div>
            </article>
          </div>
        </div>

        <div class="flex gap-2 border-t border-slate-100 p-3">
          <button
            class="h-9 flex-1 rounded-md border border-slate-200 text-sm font-medium text-slate-500 transition-colors hover:border-emerald-200 hover:text-emerald-600"
            @click="triggerImport"
          >
            我要导入
          </button>
          <button
            class="h-9 flex-1 rounded-md bg-emerald-400 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            @click="exportReplies"
          >
            我要导出
          </button>
          <input ref="importInputRef" class="hidden" type="file" accept="application/json" @change="handleImport" />
        </div>
      </aside>

      <section class="min-w-0 flex-1 overflow-y-auto bg-white p-8">
        <div v-if="!activeTemplate" class="flex h-full min-h-[420px] flex-col items-center justify-center text-slate-400">
          <el-icon :size="46" class="mb-3 text-slate-300"><ChatLineRound /></el-icon>
          <p class="text-sm">请选择或新增一个快捷回复模板</p>
        </div>

        <div v-else class="mx-auto max-w-4xl">
          <div class="mb-6 flex items-start justify-between">
            <div>
              <p class="text-sm text-slate-400">当前分组 / {{ activeGroup?.name }}</p>
              <h2 class="mt-2 text-xl font-semibold text-slate-950">编辑回复模板</h2>
            </div>
            <div class="flex items-center gap-3">
              <button
                class="h-9 rounded-md bg-emerald-500 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
                @click="saveTemplate"
              >
                保存模板
              </button>
              <button
                class="h-9 rounded-md border border-red-100 px-4 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
                @click="requestDeleteTemplate"
              >
                删除模板
              </button>
            </div>
          </div>

          <div class="space-y-5 rounded-xl border border-slate-100 bg-slate-50/50 p-6">
            <label class="block space-y-2">
              <span class="text-sm font-medium text-slate-700">模板标题</span>
              <el-input v-model="activeTemplate.title" placeholder="请输入模板标题" />
            </label>

            <label class="block space-y-2">
              <span class="text-sm font-medium text-slate-700">文本内容</span>
              <el-input
                v-model="activeTemplate.content"
                :rows="8"
                type="textarea"
                placeholder="请输入快捷回复文本，例如售前说明、物流回复、售后处理话术等"
              />
            </label>

            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-sm font-medium text-slate-700">图片内容</span>
                  <p class="mt-1 text-xs text-slate-400">{{ activeImageSummary.label }}</p>
                </div>
                <label class="inline-flex h-9 cursor-pointer items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:border-emerald-200 hover:text-emerald-600">
                  {{ activeImageSummary.actionLabel }}
                  <input class="hidden" type="file" accept="image/*" @change="handleImageChange" />
                </label>
              </div>

              <div class="grid gap-4 rounded-lg border border-slate-100 bg-white p-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div class="min-w-0">
                  <p class="mb-3 text-xs font-medium text-slate-400">发送效果预览</p>
                  <div class="max-w-lg rounded-lg bg-emerald-50 p-4">
                    <p class="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {{ activeTemplate.content || '请输入快捷回复文本，预览会同步展示在这里。' }}
                    </p>
                    <div
                      v-if="activeTemplate.imageUrl"
                      class="mt-3 overflow-hidden rounded-lg border border-emerald-100 bg-white"
                    >
                      <img :src="activeTemplate.imageUrl" alt="快捷回复图片" class="h-36 w-full object-contain" />
                    </div>
                  </div>
                </div>

                <div class="relative flex h-40 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
                  <img
                    v-if="activeTemplate.imageUrl"
                    :src="activeTemplate.imageUrl"
                    alt="快捷回复图片缩略图"
                    class="h-full w-full object-contain"
                  />
                  <span v-else>暂未添加图片</span>
                  <button
                    v-if="activeTemplate.imageUrl"
                    class="absolute right-3 top-3 rounded-md bg-white/90 px-3 py-1 text-xs font-medium text-red-500 shadow-sm transition-colors hover:bg-red-50"
                    @click="removeTemplateImage"
                  >
                    移除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </section>

    <el-dialog v-model="noticeDialogVisible" :title="noticeTitle" width="360px">
      <p class="text-sm leading-6 text-slate-600">{{ noticeContent }}</p>
      <template #footer>
        <button
          class="h-9 rounded-md bg-emerald-500 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
          @click="noticeDialogVisible = false"
        >
          知道了
        </button>
      </template>
    </el-dialog>

    <el-dialog v-model="deleteDialogVisible" title="删除模板" width="380px">
      <p class="text-sm leading-6 text-slate-600">
        确认删除「{{ pendingDeleteTemplateTitle }}」吗？删除后当前页面数据将移除。
      </p>
      <template #footer>
        <button
          class="mr-3 h-9 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300"
          @click="deleteDialogVisible = false"
        >
          取消
        </button>
        <button
          class="h-9 rounded-md bg-red-500 px-4 text-sm font-medium text-white transition-colors hover:bg-red-600"
          @click="confirmDeleteTemplate"
        >
          确认删除
        </button>
      </template>
    </el-dialog>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ChatLineRound,
  DocumentAdd,
  Plus,
} from '@element-plus/icons-vue'
import {
  buildQuickReplyImageSummary,
  filterQuickReplyGroups,
  type ReplyGroup,
  type ReplyTemplate,
} from './quick-reply-logic'

const keyword = ref('')
const activeGroupId = ref('')
const activeTemplateId = ref('')
const editingGroupId = ref('')
const importInputRef = ref<HTMLInputElement | null>(null)
const noticeDialogVisible = ref(false)
const noticeTitle = ref('')
const noticeContent = ref('')
const deleteDialogVisible = ref(false)
const pendingDeleteTemplateId = ref('')
const pendingDeleteTemplateTitle = ref('')
const groupSequence = ref(0)
const templateSequence = ref(0)
const groups = reactive<ReplyGroup[]>([])
const storageKey = 'nexbridge.quickReply.groups'

const filteredGroups = computed(() => filterQuickReplyGroups(groups, keyword.value))

const activeGroup = computed(() => groups.find((group) => group.id === activeGroupId.value) || null)
const activeTemplate = computed(() =>
  activeGroup.value?.templates.find((template) => template.id === activeTemplateId.value) || null,
)
const activeImageSummary = computed(() =>
  activeTemplate.value
    ? buildQuickReplyImageSummary(activeTemplate.value)
    : { hasImage: false, label: '暂未添加图片', actionLabel: '上传图片' },
)

onMounted(() => {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return

  try {
    const data = JSON.parse(raw)
    if (!isReplyGroupList(data)) return

    groups.splice(0, groups.length, ...data)
    activeGroupId.value = groups[0]?.id || ''
    activeTemplateId.value = groups[0]?.templates[0]?.id || ''
    groupSequence.value = groups.length
    templateSequence.value = groups.reduce((total, group) => total + group.templates.length, 0)
  } catch {
    localStorage.removeItem(storageKey)
  }
})

function addGroup() {
  keyword.value = ''
  groupSequence.value += 1
  const group: ReplyGroup = {
    id: `group-${Date.now()}-${groupSequence.value}`,
    name: `分组 ${groupSequence.value}`,
    templates: [],
  }

  groups.unshift(group)
  activeGroupId.value = group.id
  activeTemplateId.value = ''
  editingGroupId.value = group.id
  persistReplies()
  ElMessage.success('已新增分组，可直接修改分组名称')
}

function startEditGroupName(groupId: string) {
  editingGroupId.value = groupId
}

function finishEditGroupName(group: ReplyGroup) {
  const name = group.name.trim()
  group.name = name || `分组 ${groupSequence.value}`
  editingGroupId.value = ''
  persistReplies()
}

function ensureActiveGroup(groupId?: string) {
  const targetGroup = groupId ? groups.find((group) => group.id === groupId) || null : activeGroup.value
  if (targetGroup) {
    activeGroupId.value = targetGroup.id
    return targetGroup
  }

  addGroup()
  return activeGroup.value
}

function addTemplate(groupId?: string) {
  const group = ensureActiveGroup(groupId)
  if (!group) return

  templateSequence.value += 1
  const template: ReplyTemplate = {
    id: `template-${Date.now()}-${templateSequence.value}`,
    title: `回复模板 ${templateSequence.value}`,
    content: '',
    imageUrl: '',
  }

  group.templates.unshift(template)
  activeTemplateId.value = template.id
  persistReplies()
  ElMessage.success('已新增回复模板')
}

function selectTemplate(templateId: string) {
  activeTemplateId.value = templateId
}

function saveTemplate() {
  if (!activeTemplate.value) return

  const title = activeTemplate.value.title.trim()
  if (!title) {
    showNotice('保存失败', '请先填写模板标题。')
    return
  }

  activeTemplate.value.title = title
  persistReplies()
  showNotice('保存成功', '快捷回复模板已保存。')
}

function requestDeleteTemplate() {
  if (!activeTemplate.value) return

  pendingDeleteTemplateId.value = activeTemplate.value.id
  pendingDeleteTemplateTitle.value = activeTemplate.value.title || '未命名模板'
  deleteDialogVisible.value = true
}

function confirmDeleteTemplate() {
  const targetGroup = groups.find((group) =>
    group.templates.some((template) => template.id === pendingDeleteTemplateId.value),
  )
  if (!targetGroup) {
    deleteDialogVisible.value = false
    showNotice('删除失败', '未找到要删除的模板。')
    return
  }

  const index = targetGroup.templates.findIndex((template) => template.id === pendingDeleteTemplateId.value)
  if (index >= 0) {
    targetGroup.templates.splice(index, 1)
  }

  deleteDialogVisible.value = false
  pendingDeleteTemplateId.value = ''
  pendingDeleteTemplateTitle.value = ''
  activeGroupId.value = targetGroup.id
  activeTemplateId.value = targetGroup.templates[0]?.id || ''
  persistReplies()
}

function handleImageChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !activeTemplate.value) return

  activeTemplate.value.imageUrl = URL.createObjectURL(file)
  ElMessage.success('图片已添加，请点击保存模板')
}

function removeTemplateImage() {
  if (!activeTemplate.value) return

  activeTemplate.value.imageUrl = ''
  ElMessage.success('图片已移除，请点击保存模板')
}

function persistReplies() {
  localStorage.setItem(storageKey, JSON.stringify(groups))
}

function showNotice(title: string, content: string) {
  noticeTitle.value = title
  noticeContent.value = content
  noticeDialogVisible.value = true
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  importInputRef.value?.click()
}

function exportReplies() {
  if (groups.length === 0) {
    ElMessage.warning('暂无快捷回复数据可导出')
    return
  }

  downloadFile('quick-replies.json', JSON.stringify(groups, null, 2))
  ElMessage.success('快捷回复数据已导出')
}

function isReplyGroupList(value: unknown): value is ReplyGroup[] {
  return Array.isArray(value)
    && value.every((group) => {
      if (!group || typeof group !== 'object') return false
      const item = group as ReplyGroup
      return typeof item.id === 'string'
        && typeof item.name === 'string'
        && Array.isArray(item.templates)
        && item.templates.every((template) =>
          template
            && typeof template.id === 'string'
            && typeof template.title === 'string'
            && typeof template.content === 'string'
            && typeof template.imageUrl === 'string',
        )
    })
}

function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result))
      if (!isReplyGroupList(data)) {
        ElMessage.error('导入失败，请使用正确的快捷回复 JSON 文件')
        return
      }

      groups.splice(0, groups.length, ...data)
      activeGroupId.value = groups[0]?.id || ''
      activeTemplateId.value = groups[0]?.templates[0]?.id || ''
      persistReplies()
      ElMessage.success('快捷回复数据已导入')
    } catch {
      ElMessage.error('导入失败，文件内容不是有效 JSON')
    } finally {
      input.value = ''
    }
  }
  reader.readAsText(file)
}
</script>
