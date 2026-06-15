<!-- 标注详情面板：可拖动、可调整大小 -->
<template>
  <Transition name="panel-fade">
    <div
      v-if="annotation"
      ref="panelRef"
      class="annotation-panel"
      :style="panelStyle"
    >
      <!-- 拖动把手：标题栏 -->
      <div class="panel-header" @mousedown="startDrag">
        <div class="panel-title">
          <span class="panel-number">{{ index + 1 }}</span>
          {{ annotation.title }}
        </div>
        <button class="panel-close" @mousedown.stop @click="$emit('close')">&times;</button>
      </div>

      <div class="panel-body">
        <div class="panel-meta">
          <span class="meta-tag" :class="`meta-tag-${annotation.category}`">{{ categoryLabel }}</span>
          <span v-if="annotation.source" class="meta-source">{{ annotation.source }}</span>
        </div>
        <div class="panel-content" v-html="renderedContent"></div>
      </div>

      <div v-if="editMode" class="panel-footer">
        <button class="panel-btn" @mousedown.stop @click="$emit('edit', annotation.id)">编辑</button>
        <button class="panel-btn panel-btn-danger" @mousedown.stop @click="$emit('delete', annotation.id)">删除</button>
      </div>

      <!-- 8个方向的 resize 把手 -->
      <div class="resize-handle resize-n"  @mousedown.stop="startResize('n', $event)"></div>
      <div class="resize-handle resize-s"  @mousedown.stop="startResize('s', $event)"></div>
      <div class="resize-handle resize-e"  @mousedown.stop="startResize('e', $event)"></div>
      <div class="resize-handle resize-w"  @mousedown.stop="startResize('w', $event)"></div>
      <div class="resize-handle resize-ne" @mousedown.stop="startResize('ne', $event)"></div>
      <div class="resize-handle resize-nw" @mousedown.stop="startResize('nw', $event)"></div>
      <div class="resize-handle resize-se" @mousedown.stop="startResize('se', $event)"></div>
      <div class="resize-handle resize-sw" @mousedown.stop="startResize('sw', $event)"></div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'
import type { AnnotationItem } from './types'

const props = defineProps<{
  annotation: AnnotationItem | null
  index: number
  editMode: boolean
}>()

const emit = defineEmits<{
  close: []
  edit: [id: string]
  delete: [id: string]
}>()

// 面板位置和尺寸
const pos = ref({ x: window.innerWidth - 340, y: 60 })
const size = ref({ w: 320, h: Math.min(500, window.innerHeight - 80) })
const MIN_W = 240
const MIN_H = 160

const panelStyle = computed(() => ({
  left: `${pos.value.x}px`,
  top: `${pos.value.y}px`,
  width: `${size.value.w}px`,
  height: `${size.value.h}px`
}))

// 切换标注时重置到右侧默认位置
watch(() => props.annotation?.id, () => {
  pos.value = { x: window.innerWidth - 340, y: 60 }
  size.value = { w: 320, h: Math.min(500, window.innerHeight - 80) }
})

// 拖动
const startDrag = (e: MouseEvent) => {
  if ((e.target as Element).closest('button')) return
  const startX = e.clientX - pos.value.x
  const startY = e.clientY - pos.value.y

  const onMove = (ev: MouseEvent) => {
    pos.value = {
      x: Math.max(0, Math.min(window.innerWidth - size.value.w, ev.clientX - startX)),
      y: Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - startY))
    }
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// Resize
const startResize = (dir: string, e: MouseEvent) => {
  const startX = e.clientX
  const startY = e.clientY
  const startW = size.value.w
  const startH = size.value.h
  const startPX = pos.value.x
  const startPY = pos.value.y

  const onMove = (ev: MouseEvent) => {
    const dx = ev.clientX - startX
    const dy = ev.clientY - startY

    let newW = startW, newH = startH, newX = startPX, newY = startPY

    if (dir.includes('e')) newW = Math.max(MIN_W, startW + dx)
    if (dir.includes('w')) { newW = Math.max(MIN_W, startW - dx); newX = startPX + startW - newW }
    if (dir.includes('s')) newH = Math.max(MIN_H, startH + dy)
    if (dir.includes('n')) { newH = Math.max(MIN_H, startH - dy); newY = startPY + startH - newH }

    size.value = { w: newW, h: newH }
    pos.value = { x: newX, y: newY }
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// Esc 关闭
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.annotation) emit('close')
}
onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))

const categoryMap: Record<string, string> = {
  filter: '筛选条件', field: '字段说明', action: '操作说明', rule: '业务规则', custom: '自定义标注'
}
const categoryLabel = computed(() => categoryMap[props.annotation?.category || ''] || '标注')

// 兼容新格式（HTML）和旧格式（Markdown）
const renderedContent = computed(() => {
  if (!props.annotation?.content) return ''
  const c = props.annotation.content
  // 新格式：HTML（编辑器直接存 HTML）
  if (c.trimStart().startsWith('<') || /<[a-z][\s\S]*>/i.test(c)) return c
  // 旧格式：Markdown（含表格、加粗等）
  return marked.parse(c) as string
})
</script>

<style scoped lang="scss">
.annotation-panel {
  position: fixed;
  background: #fff;
  border: 1px solid #e8e8e8;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  z-index: 9995;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  user-select: none;
}

/* 标题栏：拖动把手 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #f0f0f0;
  cursor: move;
  flex-shrink: 0;
  background: #fafafa;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.panel-number {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #1677ff;
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.panel-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #8c8c8c;
  cursor: pointer;
  line-height: 1;
  padding: 0 2px;
  flex-shrink: 0;
}
.panel-close:hover { color: #262626; }

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  min-height: 0;
}

.panel-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  color: #fff;
  flex-shrink: 0;
}

.meta-tag-filter,
.meta-tag-field,
.meta-tag-action,
.meta-tag-rule,
.meta-tag-custom { background: #1677ff; }
.meta-tag-custom { background: #8c8c8c; }

.meta-source {
  font-size: 11px;
  color: #8c8c8c;
}

.panel-content {
  font-size: 13px;
  line-height: 1.8;
  color: #434343;
  word-break: break-word;

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 12px;
  }
  :deep(th), :deep(td) {
    border: 1px solid #e8e8e8;
    padding: 4px 8px;
    text-align: left;
  }
  :deep(th) { background: #fafafa; font-weight: 500; }
  :deep(ul) { list-style: disc; padding-left: 18px; margin: 4px 0; }
  :deep(ol) { list-style: decimal; padding-left: 18px; margin: 4px 0; }
  :deep(li) { margin: 2px 0; }
  :deep(code) {
    background: #f5f5f5;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 12px;
  }
  :deep(img) { max-width: 100%; border-radius: 4px; }
}

.panel-footer {
  padding: 8px 14px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.panel-btn {
  padding: 4px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  color: #595959;
}
.panel-btn:hover { border-color: #1677ff; color: #1677ff; }
.panel-btn-danger:hover { border-color: #ff4d4f; color: #ff4d4f; }

/* Resize 把手 */
.resize-handle {
  position: absolute;
  z-index: 1;
}

.resize-n  { top: -3px;    left: 8px;    right: 8px;   height: 6px;  cursor: n-resize; }
.resize-s  { bottom: -3px; left: 8px;    right: 8px;   height: 6px;  cursor: s-resize; }
.resize-e  { right: -3px;  top: 8px;     bottom: 8px;  width: 6px;   cursor: e-resize; }
.resize-w  { left: -3px;   top: 8px;     bottom: 8px;  width: 6px;   cursor: w-resize; }
.resize-ne { top: -3px;    right: -3px;  width: 12px;  height: 12px; cursor: ne-resize; }
.resize-nw { top: -3px;    left: -3px;   width: 12px;  height: 12px; cursor: nw-resize; }
.resize-se { bottom: -3px; right: -3px;  width: 12px;  height: 12px; cursor: se-resize; }
.resize-sw { bottom: -3px; left: -3px;   width: 12px;  height: 12px; cursor: sw-resize; }

/* 弹出动画：从右下角缩放弹出，有弹性感 */
.panel-fade-enter-active {
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.panel-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.panel-fade-enter-from {
  opacity: 0;
  transform: scale(0.88) translateY(8px);
  transform-origin: right bottom;
}
.panel-fade-leave-to {
  opacity: 0;
  transform: scale(0.92);
  transform-origin: right bottom;
}
</style>
