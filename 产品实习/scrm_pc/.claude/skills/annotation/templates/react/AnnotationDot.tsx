import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { AnnotationItem } from './types'
import { registerOnElement, unregisterFromElement } from './annotationRegistry'

interface AnnotationDotProps {
  annotation: AnnotationItem
  index: number
  isActive: boolean
  editMode: boolean
  modalOpen: boolean
  drawerOpen: boolean
  onClick: (id: string) => void
  onMove: (id: string, pos: { x: number; y: number }) => void
}

const MODAL_SELECTORS = [
  '.ant-modal-content', '.el-dialog', '.van-dialog', '.t-dialog', '.n-dialog',
  '[class*="modal-content"]', '[class*="dialog-content"]'
]
const DRAWER_SELECTORS = [
  '.ant-drawer-body', '.el-drawer__body', '.van-popup', '.t-drawer__body',
  '.n-drawer-body-content', '[class*="drawer-body"]', '[class*="drawer-content"]'
]

const categoryMap: Record<string, string> = {
  filter: '筛选', field: '字段', action: '操作', rule: '规则', custom: '自定义'
}

const getFallbackSelectors = (category: string): string[] => {
  if (category === 'filter') return ['[class*="filter"]', '[class*="search"]', 'form:first-of-type']
  if (category === 'action') return ['[class*="action"]', '[class*="toolbar"]', '[class*="operate"]']
  if (category === 'field') return ['[class*="table"]', '[class*="list"]', '[class*="form"]', 'table', 'form']
  if (category === 'rule') return ['[class*="table"]', '[class*="filter"]', 'main']
  return []
}

export function AnnotationDot({ annotation, index, isActive, editMode, modalOpen, drawerOpen, onClick, onMove }: AnnotationDotProps) {
  const [selectorPos, setSelectorPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const registeredElRef = useRef<Element | null>(null)
  const hasMovedRef = useRef(false)
  const dragPosRef = useRef<{ x: number; y: number } | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const scheduledRef = useRef(false)

  const container = annotation.container || 'page'
  const isUnplaced = annotation.type === 'position' && annotation.position.x === 0 && annotation.position.y === 0
  const isSelectorPending = annotation.type === 'selector' && selectorPos === null

  const shouldShow = useMemo(() => {
    if (editMode) return true
    if (isUnplaced) return false
    if (isSelectorPending) return false
    if (container === 'page') return !modalOpen && !drawerOpen
    if (container === 'modal') return modalOpen
    if (container === 'drawer') return drawerOpen
    return true
  }, [editMode, isUnplaced, isSelectorPending, container, modalOpen, drawerOpen])

  // Teleport 目标
  const teleportTarget = useMemo(() => {
    const selectors = container === 'modal' ? MODAL_SELECTORS
                    : container === 'drawer' ? DRAWER_SELECTORS
                    : null
    if (!selectors) return null
    for (const sel of selectors) {
      if (document.querySelector(sel)) return document.querySelector(sel) as Element
    }
    return null
  }, [container, modalOpen, drawerOpen])

  const dotColor = annotation.color || '#1677ff'

  // 选择器定位
  const updateSelectorPos = useCallback((): boolean => {
    if (annotation.type !== 'selector') return true

    const computePos = (rect: DOMRect, el: Element) => {
      const stackIndex = registerOnElement(el, annotation.id)
      return { x: rect.left + 2 + stackIndex * 28, y: rect.top + 2 }
    }

    if (annotation.selector) {
      const el = document.querySelector(annotation.selector)
      if (el) {
        const rect = el.getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) {
          if (registeredElRef.current) { unregisterFromElement(registeredElRef.current, annotation.id); registeredElRef.current = null }
          setSelectorPos(null)
          return false
        }
        if (registeredElRef.current && registeredElRef.current !== el) {
          unregisterFromElement(registeredElRef.current, annotation.id)
        }
        registeredElRef.current = el
        setSelectorPos(computePos(rect, el))
        return true
      }
      if (registeredElRef.current) { unregisterFromElement(registeredElRef.current, annotation.id); registeredElRef.current = null }
      setSelectorPos(null)
      return false
    }

    const fallbacks = getFallbackSelectors(annotation.category)
    for (const sel of fallbacks) {
      const el = document.querySelector(sel)
      if (el) {
        const rect = el.getBoundingClientRect()
        if (rect.width === 0 && rect.height === 0) continue
        if (registeredElRef.current && registeredElRef.current !== el) {
          unregisterFromElement(registeredElRef.current, annotation.id)
        }
        registeredElRef.current = el
        setSelectorPos(computePos(rect, el))
        return true
      }
    }
    if (registeredElRef.current) { unregisterFromElement(registeredElRef.current, annotation.id); registeredElRef.current = null }
    setSelectorPos(null)
    return false
  }, [annotation.type, annotation.selector, annotation.id, annotation.category])

  const scheduleUpdate = useCallback(() => {
    if (scheduledRef.current) return
    scheduledRef.current = true
    requestAnimationFrame(() => { scheduledRef.current = false; updateSelectorPos() })
  }, [updateSelectorPos])

  // 初始定位轮询
  useEffect(() => {
    if (annotation.type !== 'selector') return
    let attempts = 0
    const tick = () => {
      attempts++
      const found = updateSelectorPos()
      if (found || attempts >= 300) { rafIdRef.current = null; return }
      rafIdRef.current = requestAnimationFrame(tick)
    }
    rafIdRef.current = requestAnimationFrame(tick)

    window.addEventListener('scroll', scheduleUpdate, { passive: true, capture: true })
    window.addEventListener('resize', scheduleUpdate, { passive: true })

    const mo = new MutationObserver(scheduleUpdate)
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] })

    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
      window.removeEventListener('scroll', scheduleUpdate, { capture: true } as any)
      window.removeEventListener('resize', scheduleUpdate)
      mo.disconnect()
      if (registeredElRef.current) unregisterFromElement(registeredElRef.current, annotation.id)
    }
  }, [annotation.type, annotation.selector, annotation.id, updateSelectorPos, scheduleUpdate])

  // 容器状态变化时重新定位
  useEffect(() => {
    setSelectorPos(null)
    if (annotation.type === 'selector') {
      setTimeout(() => updateSelectorPos(), 50)
    }
  }, [modalOpen, drawerOpen, annotation.container])

  // 拖拽
  const handleDragStart = (e: React.MouseEvent) => {
    if (!editMode) return
    const startX = e.clientX
    const startY = e.clientY
    hasMovedRef.current = false
    dragPosRef.current = null

    const onMouseMove = (ev: MouseEvent) => {
      if (!hasMovedRef.current && (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3)) {
        setIsDragging(true)
        hasMovedRef.current = true
      }
      if (hasMovedRef.current) {
        const pos = { x: ev.clientX, y: ev.clientY }
        dragPosRef.current = pos
        setDragPos(pos)
      }
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      if (hasMovedRef.current && dragPosRef.current) onMove(annotation.id, dragPosRef.current)
      setIsDragging(false)
      setDragPos(null)
      dragPosRef.current = null
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const handleClick = () => { if (!hasMovedRef.current) onClick(annotation.id) }

  // 位置样式
  const dotStyle = useMemo((): React.CSSProperties => {
    const isInContainer = container !== 'page'
    if (dragPos) return { position: 'fixed', left: dragPos.x - 13, top: dragPos.y - 13, zIndex: 9999, transition: 'none' }
    if (annotation.type === 'selector' && selectorPos) {
      return { position: 'fixed', left: selectorPos.x, top: selectorPos.y, zIndex: isInContainer ? 1100 : 9990 }
    }
    return { position: 'fixed', left: annotation.position.x - 13, top: annotation.position.y - 13, zIndex: isInContainer ? 1100 : 9990 }
  }, [dragPos, annotation.type, selectorPos, annotation.position, container])

  if (!shouldShow) return null

  const className = [
    'annotation-dot',
    isActive && 'annotation-dot-active',
    editMode && 'annotation-dot-edit',
    isDragging && 'annotation-dot-dragging',
    isUnplaced && 'annotation-dot-unplaced',
  ].filter(Boolean).join(' ')

  const dot = (
    <div
      className={className}
      data-annot-id={annotation.id}
      style={{ ...dotStyle, '--dot-color': dotColor } as React.CSSProperties}
      onClick={handleClick}
      onMouseDown={handleDragStart}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="dot-number">{index + 1}</span>
      {showTooltip && !isActive && (
        <div className="dot-tooltip">
          <div className="tooltip-title">{annotation.title}</div>
          <div className="tooltip-category">{categoryMap[annotation.category] || annotation.category}</div>
        </div>
      )}
    </div>
  )

  if (teleportTarget) return createPortal(dot, teleportTarget)
  return dot
}
