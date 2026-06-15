<!-- 标注圆点：显示在页面上的编号标记，支持 page/modal/drawer 三种宿主容器 -->
<template>
  <!-- 根据 container 决定渲染到哪个容器 -->
  <Teleport :to="teleportTarget" :disabled="!teleportTarget">
    <!-- position 类型且坐标为 (0,0) 时隐藏，等用户在编辑模式下拖放定位 -->
    <div
      v-if="shouldShow"
      class="annotation-dot"
      :class="{
        'annotation-dot-active': isActive,
        'annotation-dot-edit': editMode,
        'annotation-dot-dragging': isDragging,
        'annotation-dot-unplaced': isUnplaced
      }"
      :style="{ ...dotStyle, '--dot-color': dotColor }"
      @click.stop="handleClick"
      @mousedown.stop="handleDragStart"
      @mouseenter="showTooltip = true"
      @mouseleave="showTooltip = false"
    >
      <span class="dot-number">{{ index + 1 }}</span>

      <!-- hover 摘要气泡 -->
      <div v-if="showTooltip && !isActive" class="dot-tooltip">
        <div class="tooltip-title">{{ annotation.title }}</div>
        <div class="tooltip-category">{{ categoryLabel }}</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import type { AnnotationItem } from './types'

const props = defineProps<{
  annotation: AnnotationItem
  index: number
  isActive: boolean
  editMode: boolean
  /** 当前是否有弹窗/抽屉打开（由父组件传入） */
  modalOpen: boolean
  drawerOpen: boolean
}>()

const emit = defineEmits<{
  click: [id: string]
  move: [id: string, pos: { x: number; y: number }]
}>()

// 宿主容器，默认 page
const container = computed(() => props.annotation.container || 'page')

// 是否为未定位的 position 标注
const isUnplaced = computed(() =>
  props.annotation.type === 'position' &&
  props.annotation.position.x === 0 &&
  props.annotation.position.y === 0
)

/**
 * 决定是否显示：
 * - page 容器：弹窗或抽屉打开时隐藏（避免遮挡）
 * - modal 容器：只有弹窗打开时才显示
 * - drawer 容器：只有抽屉打开时才显示
 * - 编辑模式下始终显示（方便调整位置）
 */
const shouldShow = computed(() => {
  if (props.editMode) return true
  if (isUnplaced.value) return false

  if (container.value === 'page') {
    // 页面标注：弹窗或抽屉打开时隐藏
    return !props.modalOpen && !props.drawerOpen
  }
  if (container.value === 'modal') {
    // 弹窗标注：只有弹窗打开时显示
    return props.modalOpen
  }
  if (container.value === 'drawer') {
    // 抽屉标注：只有抽屉打开时显示
    return props.drawerOpen
  }
  return true
})

/**
 * Teleport 目标：
 * - page → 不 teleport（disabled），渲染在 overlay 内
 * - modal → teleport 到 .ant-modal-wrap（弹窗容器）
 * - drawer → teleport 到 .ant-drawer-body（抽屉内容区）
 *
 * 目标容器不存在时返回 null，Teleport disabled，标注点不渲染
 */
const teleportTarget = computed<string | null>(() => {
  if (container.value === 'modal') {
    return document.querySelector('.ant-modal-wrap') ? '.ant-modal-wrap' : null
  }
  if (container.value === 'drawer') {
    return document.querySelector('.ant-drawer-body') ? '.ant-drawer-body' : null
  }
  return null  // page 容器不需要 teleport
})

const isDragging = ref(false)
let hasMoved = false
const dragPos = ref<{ x: number; y: number } | null>(null)

// 编辑模式下拖拽移动
const handleDragStart = (e: MouseEvent) => {
  if (!props.editMode) return
  const startX = e.clientX
  const startY = e.clientY
  hasMoved = false

  const onMove = (ev: MouseEvent) => {
    if (!hasMoved && (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3)) {
      isDragging.value = true
      hasMoved = true
    }
    if (hasMoved) {
      dragPos.value = { x: ev.clientX, y: ev.clientY }
    }
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    if (hasMoved && dragPos.value) {
      emit('move', props.annotation.id, { x: dragPos.value.x, y: dragPos.value.y })
    }
    isDragging.value = false
    dragPos.value = null
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const handleClick = () => {
  if (!hasMoved) emit('click', props.annotation.id)
}

const showTooltip = ref(false)

const dotColor = computed(() => props.annotation.color || '#1677ff')

const categoryMap: Record<string, string> = {
  filter: '筛选', field: '字段', action: '操作', rule: '规则', custom: '自定义'
}
const categoryLabel = computed(() => categoryMap[props.annotation.category] || props.annotation.category)

// 选择器定位：找到元素后取其屏幕坐标
const selectorPos = ref<{ x: number; y: number } | null>(null)

/**
 * 根据 category 和 title 动态推断候选选择器列表
 * 当 selector 字段找不到元素时作为降级方案
 */
const getFallbackSelectors = (): string[] => {
  const { category, title } = props.annotation
  const t = title.toLowerCase()

  if (category === 'filter') {
    return [
      '[class*="filter-card"]', '[class*="filter_card"]',
      '[class*="search-card"]', '[class*="search_card"]',
      '[class*="filter-form"]', '[class*="search-form"]',
      '.el-form:first-of-type', 'form:first-of-type'
    ]
  }

  if (category === 'action') {
    return [
      '[class*="action-bar"]', '[class*="action_bar"]',
      '[class*="toolbar"]', '[class*="tool-bar"]',
      '[class*="btn-bar"]', '[class*="operate"]',
      '[class*="header-btn"]'
    ]
  }

  if (category === 'field') {
    if (t.includes('列表') || t.includes('表格') || t.includes('list')) {
      return [
        '.ant-table', '.el-table', 'table',
        '[class*="table-card"]', '[class*="table_card"]'
      ]
    }
    if (t.includes('表单') || t.includes('form')) {
      return [
        '.ant-form', '.el-form', 'form',
        '[class*="form-card"]', '[class*="form_card"]'
      ]
    }
    if (t.includes('详情') || t.includes('detail') || t.includes('描述')) {
      return [
        '.ant-descriptions', '.el-descriptions',
        '[class*="detail"]', '[class*="info-card"]'
      ]
    }
    if (t.includes('步骤') || t.includes('step')) {
      return [
        '.ant-steps', '.el-steps',
        '[class*="form-steps"]', '[class*="step"]'
      ]
    }
    if (t.includes('折叠') || t.includes('collapse') || t.includes('记录')) {
      return ['.ant-collapse', '.el-collapse', '[class*="collapse"]']
    }
    if (t.includes('时间轴') || t.includes('timeline') || t.includes('流转')) {
      return ['.ant-timeline', '.el-timeline', '[class*="timeline"]']
    }
    // 通用字段：找表格或描述列表
    return ['.ant-table', '.el-table', '.ant-descriptions', '.el-descriptions']
  }

  if (category === 'rule') {
    // 规则标注：就近挂在操作栏或表格上
    return [
      '[class*="action-bar"]', '[class*="toolbar"]',
      '.ant-table', '.el-table',
      '[class*="filter-card"]'
    ]
  }

  return []
}

/**
 * 查找元素：先用 selector，找不到再用 category+title 动态推断
 * 找不到时保持上次位置（不消失，不报错）
 */
const updateSelectorPos = () => {
  if (props.annotation.type !== 'selector') return

  // 第一步：直接用 selector 查
  if (props.annotation.selector) {
    const el = document.querySelector(props.annotation.selector)
    if (el) {
      const rect = el.getBoundingClientRect()
      selectorPos.value = { x: rect.left + 8, y: rect.top + 8 }
      return
    }
  }

  // 第二步：selector 找不到，根据 category + title 动态推断
  const fallbacks = getFallbackSelectors()
  for (const sel of fallbacks) {
    const el = document.querySelector(sel)
    if (el) {
      const rect = el.getBoundingClientRect()
      // 偏移量：每个标注点错开，避免完全重叠
      const offset = (props.index % 4) * 20
      selectorPos.value = { x: rect.left + 8 + offset, y: rect.top + 8 + offset }
      return
    }
  }

  // 两步都找不到：保持上次位置，不置 null（避免标注点消失）
  // selectorPos 保持原值
}

/**
 * 计算圆点位置
 * - page 容器：fixed 定位，相对视口
 * - modal/drawer 容器：absolute 定位，相对 teleport 目标容器
 *   容器本身是 fixed/absolute 的，所以坐标仍用视口坐标减去容器偏移
 */
const dotStyle = computed(() => {
  const isInContainer = container.value !== 'page'

  // 拖拽中：跟随鼠标（始终用 fixed）
  if (dragPos.value) {
    return {
      position: 'fixed' as const,
      left: `${dragPos.value.x - 13}px`,
      top: `${dragPos.value.y - 13}px`,
      zIndex: 9999,
      transition: 'none'
    }
  }

  // 选择器定位
  if (props.annotation.type === 'selector' && selectorPos.value) {
    if (isInContainer) {
      // teleport 到容器内：用 fixed 定位，z-index 高于弹窗内容但低于弹窗遮罩
      return {
        position: 'fixed' as const,
        left: `${selectorPos.value.x - 13}px`,
        top: `${selectorPos.value.y - 13}px`,
        zIndex: 1100  // 高于 ant-modal(1000) 但合理
      }
    }
    return {
      position: 'fixed' as const,
      left: `${selectorPos.value.x - 13}px`,
      top: `${selectorPos.value.y - 13}px`,
      zIndex: 9990
    }
  }

  // 手动标注（position 类型）
  const z = isInContainer ? 1100 : 9990
  return {
    position: 'fixed' as const,
    left: `${props.annotation.position.x - 13}px`,
    top: `${props.annotation.position.y - 13}px`,
    zIndex: z
  }
})

let rafId: number | null = null

const startPositionTracking = () => {
  if (props.annotation.type !== 'selector') return
  const tick = () => {
    updateSelectorPos()
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

const stopPositionTracking = () => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

onMounted(() => {
  nextTick(() => {
    updateSelectorPos()
    startPositionTracking()
  })
  window.addEventListener('scroll', updateSelectorPos, { passive: true })
  window.addEventListener('resize', updateSelectorPos, { passive: true })
})

onUnmounted(() => {
  stopPositionTracking()
  window.removeEventListener('scroll', updateSelectorPos)
  window.removeEventListener('resize', updateSelectorPos)
})
</script>

<style scoped lang="scss">
.annotation-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--dot-color, #1677ff);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--dot-color, #1677ff) 50%, transparent);
  transition: transform 0.15s, box-shadow 0.15s;
  user-select: none;
  pointer-events: auto;
  border: 2px solid rgba(255, 255, 255, 0.6);
}

.annotation-dot:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 14px color-mix(in srgb, var(--dot-color, #1677ff) 60%, transparent);
}

.annotation-dot-active {
  --dot-color: #ff4d4f;
  transform: scale(1.1);
}

.annotation-dot-edit {
  cursor: grab;
}

/* 未定位的 position 标注：编辑模式下固定显示在右下角，虚线边框提示需要拖放 */
.annotation-dot-unplaced {
  position: fixed !important;
  bottom: 80px;
  right: 24px;
  left: auto !important;
  top: auto !important;
  border: 2px dashed rgba(255, 255, 255, 0.8) !important;
  opacity: 0.85;
}

.annotation-dot-dragging {
  cursor: grabbing;
  transform: scale(1.15);
}

.dot-number {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.dot-tooltip {
  position: fixed;
  top: -8px;
  left: calc(100% + 8px);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  white-space: nowrap;
  font-size: 12px;
  pointer-events: none;
  z-index: 9999;
}

.tooltip-title {
  font-weight: 500;
  margin-bottom: 2px;
}

.tooltip-category {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}
</style>
