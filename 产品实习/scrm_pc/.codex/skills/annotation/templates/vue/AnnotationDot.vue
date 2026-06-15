<!-- 标注圆点：显示在页面上的编号标记，支持 page/modal/drawer 三种宿主容器 -->
<template>
  <!-- 根据 container 决定渲染到哪个容器 -->
  <Teleport :to="teleportTarget" :disabled="!teleportTarget">
    <!-- position 类型且坐标为 (0,0) 时隐藏，等用户在编辑模式下拖放定位 -->
    <div
      v-if="shouldShow"
      class="annotation-dot"
      :data-annot-id="annotation.id"
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import type { AnnotationItem } from './types'
import { registerOnElement, unregisterFromElement } from './annotationRegistry'

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

// ═══ 响应式状态（必须在 computed 使用之前声明）═══
const selectorPos = ref<{ x: number; y: number } | null>(null)
const isDragging = ref(false)
let hasMoved = false
const dragPos = ref<{ x: number; y: number } | null>(null)
const showTooltip = ref(false)
// 当前已登记到的目标元素（用于元素变化时先从旧元素解除登记）
let registeredEl: Element | null = null

const unregisterCurrent = () => {
  if (registeredEl) {
    unregisterFromElement(registeredEl, props.annotation.id)
    registeredEl = null
  }
}

// ═══ 计算属性 ═══
// 宿主容器，默认 page
const container = computed(() => props.annotation.container || 'page')

// 是否为未定位的 position 标注
const isUnplaced = computed(() =>
  props.annotation.type === 'position' &&
  props.annotation.position.x === 0 &&
  props.annotation.position.y === 0
)

// selector 类型但元素还没找到（未完成首次定位）
const isSelectorPending = computed(() =>
  props.annotation.type === 'selector' && selectorPos.value === null
)

/**
 * 决定是否显示：
 * - page 容器：弹窗或抽屉打开时隐藏（避免遮挡）
 * - modal 容器：只有弹窗打开时才显示
 * - drawer 容器：只有抽屉打开时才显示
 * - 编辑模式下始终显示（方便调整位置）
 * - selector 类型未找到元素时：隐藏（避免显示在 (0,0) 位置）
 */
const shouldShow = computed(() => {
  if (props.editMode) return true
  if (isUnplaced.value) return false
  if (isSelectorPending.value) return false

  if (container.value === 'page') {
    return !props.modalOpen && !props.drawerOpen
  }
  if (container.value === 'modal') {
    return props.modalOpen
  }
  if (container.value === 'drawer') {
    return props.drawerOpen
  }
  return true
})

// Teleport 目标标识（依赖 modalOpen/drawerOpen 变化时重新计算）
const teleportTargetKey = ref(0)

/**
 * 通用浮层容器选择器（按优先级排序，兼容多种 UI 库）
 */
// modal 标注点 Teleport 到弹窗内容区（而非遮罩层），确保 pointer-events 不被遮罩拦截
const MODAL_SELECTORS = [
  '.ant-modal-content',   // Ant Design Vue（内容区，不含遮罩）
  '.el-dialog',           // Element Plus
  '.van-dialog',          // Vant
  '.t-dialog',            // TDesign
  '.n-dialog',            // Naive UI
  '[class*="modal-content"]',
  '[class*="dialog-content"]'
]

const DRAWER_SELECTORS = [
  '.ant-drawer-body',     // Ant Design Vue
  '.el-drawer__body',     // Element Plus
  '.van-popup',           // Vant（用作抽屉时）
  '.t-drawer__body',      // TDesign
  '.n-drawer-body-content',  // Naive UI
  '[class*="drawer-body"]',
  '[class*="drawer-content"]'
]

/**
 * Teleport 目标：根据 container 类型查找可用的浮层容器
 */
const teleportTarget = computed<string | null>(() => {
  void teleportTargetKey.value
  void props.modalOpen
  void props.drawerOpen

  const selectors = container.value === 'modal' ? MODAL_SELECTORS
                  : container.value === 'drawer' ? DRAWER_SELECTORS
                  : null

  if (!selectors) return null

  for (const sel of selectors) {
    if (document.querySelector(sel)) return sel
  }
  return null
})

const dotColor = computed(() => props.annotation.color || '#1677ff')

const categoryMap: Record<string, string> = {
  filter: '筛选', field: '字段', action: '操作', rule: '规则', custom: '自定义'
}
const categoryLabel = computed(() => categoryMap[props.annotation.category] || props.annotation.category)

// ═══ 拖拽逻辑 ═══
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

// ═══ 选择器定位 ═══
/**
 * 正式标注使用注入的 .annot-xxx class 精确定位，selector 永远命中。
 * 以下 fallback 仅在用户手动写标注但 selector 找不到时兜底，使用通用语义 class 匹配。
 * 严禁出现任何 UI 库专属选择器（如 .ant-table、.el-table）。
 */
const getFallbackSelectors = (): string[] => {
  const { category } = props.annotation
  // 通用语义类（项目可能自定义的布局容器）
  if (category === 'filter') return ['[class*="filter"]', '[class*="search"]', 'form:first-of-type']
  if (category === 'action') return ['[class*="action"]', '[class*="toolbar"]', '[class*="operate"]']
  if (category === 'field')  return ['[class*="table"]', '[class*="list"]', '[class*="form"]', 'table', 'form']
  if (category === 'rule')   return ['[class*="table"]', '[class*="filter"]', 'main']
  return []
}

/**
 * 查找元素并更新位置
 * 返回值：true 表示本次找到了稳定元素，可以停止高频轮询
 */
const updateSelectorPos = (): boolean => {
  if (props.annotation.type !== 'selector') return true

  /**
   * 计算标注点位置
   * 策略：贴在目标元素"内部左上角"，点直接覆盖在元素上
   * - 默认：rect 内部左上角（x = rect.left + 2, y = rect.top + 2）
   * - 堆叠错位：同一元素上有多个标注点时，按登记顺序 X 方向累加 28px（按钮通常比较矮，横向错开更好看）
   */
  const computePos = (rect: DOMRect, el: Element): { x: number; y: number } => {
    const INSIDE_GAP = 2
    const STEP = 28

    // 登记到目标元素，拿到在组内的索引（单点 → 0）
    const stackIndex = registerOnElement(el, props.annotation.id)

    // 贴元素内部左上角
    const x = rect.left + INSIDE_GAP + stackIndex * STEP
    const y = rect.top + INSIDE_GAP

    return { x, y }
  }

  // 第一步：直接用 selector 查
  if (props.annotation.selector) {
    const el = document.querySelector(props.annotation.selector) as HTMLElement | null
    if (el) {
      const rect = el.getBoundingClientRect()
      // 元素 display:none（offsetParent 为 null）或尺寸为 0 → 元素被隐藏，标注点也隐藏
      if (rect.width === 0 && rect.height === 0) {
        unregisterCurrent()
        selectorPos.value = null
        return false
      }
      // 目标元素变化 → 从旧元素解除登记
      if (registeredEl && registeredEl !== el) unregisterCurrent()
      registeredEl = el
      selectorPos.value = computePos(rect, el)
      return true
    }
    // 元素不在 DOM 中：清空位置（可能是路由已切换或条件渲染关闭）
    unregisterCurrent()
    selectorPos.value = null
    return false
  }

  // 第二步：selector 找不到，根据 category + title 动态推断
  const fallbacks = getFallbackSelectors()
  for (const sel of fallbacks) {
    const el = document.querySelector(sel) as HTMLElement | null
    if (el) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) {
        unregisterCurrent()
        selectorPos.value = null
        continue
      }
      if (registeredEl && registeredEl !== el) unregisterCurrent()
      registeredEl = el
      selectorPos.value = computePos(rect, el)
      return true
    }
  }

  // 都找不到：清空位置，标注点隐藏
  unregisterCurrent()
  selectorPos.value = null
  return false
}

// ═══ 位置样式 ═══
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

  // 选择器定位：selectorPos 已是"圆点左上角坐标"，不需要再减 13
  if (props.annotation.type === 'selector' && selectorPos.value) {
    return {
      position: 'fixed' as const,
      left: `${selectorPos.value.x}px`,
      top: `${selectorPos.value.y}px`,
      zIndex: isInContainer ? 1100 : 9990
    }
  }

  // 手动标注（position 类型）
  return {
    position: 'fixed' as const,
    left: `${props.annotation.position.x - 13}px`,
    top: `${props.annotation.position.y - 13}px`,
    zIndex: isInContainer ? 1100 : 9990
  }
})

// ═══ 定位追踪（自适应频率 + 事件驱动）═══
let rafId: number | null = null
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let scheduledUpdate = false

/**
 * 请求下一帧更新（防抖，一帧内多次调用只执行一次）
 */
const scheduleUpdate = () => {
  if (scheduledUpdate) return
  scheduledUpdate = true
  requestAnimationFrame(() => {
    scheduledUpdate = false
    updateSelectorPos()
  })
}

/**
 * 初始定位：rAF 轮询直到找到稳定元素，然后停止高频轮询
 * 之后仅靠 scroll/resize/mutation 事件触发更新
 */
const startInitialTracking = () => {
  if (props.annotation.type !== 'selector') return

  let attempts = 0
  const MAX_ATTEMPTS = 300 // 最多轮询 300 帧 ≈ 5 秒

  const tick = () => {
    attempts++
    const found = updateSelectorPos()

    if (found || attempts >= MAX_ATTEMPTS) {
      rafId = null
      return
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

const stopTracking = () => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  resizeObserver?.disconnect()
  resizeObserver = null
  intersectionObserver?.disconnect()
  intersectionObserver = null
}

// 监听 props 变化：annotation 或容器开关状态变化时重新定位
watch(
  () => [props.modalOpen, props.drawerOpen, props.annotation.selector, props.annotation.container],
  () => {
    teleportTargetKey.value++  // 强制 teleportTarget computed 重新求值
    // 容器状态变化可能导致元素位置变化，重新开始轮询
    stopTracking()
    selectorPos.value = null  // 重置为 null，让 shouldShow 正确判断
    nextTick(() => startInitialTracking())
  }
)

onMounted(() => {
  nextTick(() => startInitialTracking())

  // 滚动/resize：只在有位置数据后才需要更新
  window.addEventListener('scroll', scheduleUpdate, { passive: true, capture: true })
  window.addEventListener('resize', scheduleUpdate, { passive: true })

  // 监听 DOM 变化：子节点增删（路由切换、抽屉打开）+ style/class 变化（v-show 切换、隐藏/显示）
  if (typeof MutationObserver !== 'undefined') {
    const mo = new MutationObserver(() => scheduleUpdate())
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden']
    })
    // 保存到 resizeObserver 字段复用 disconnect 逻辑
    resizeObserver = mo as unknown as ResizeObserver
  }
})

onUnmounted(() => {
  stopTracking()
  unregisterCurrent()
  window.removeEventListener('scroll', scheduleUpdate, { capture: true } as any)
  window.removeEventListener('resize', scheduleUpdate)
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
