import { createElement, useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Component } from '@/editor/icons/icon'
import { BLOCK_ICONS } from '../blockIcons'
import { headDepth, spotFor } from './barPlacement'
import { LabelsShown } from './labelsShown'

const hold = (e: { stopPropagation: () => void }): void => e.stopPropagation()

interface BarFrameProps {
  host: RefObject<HTMLElement | null>
  element: HTMLElement | null
  head?: string

  // The left edge the bar would rather start at, like a column's.
  align?: number
  children: ReactNode
}

// The frame of a bar at a block: one line, placed anew after every change and
// whenever the canvas scrolls or the block changes its size.
export function BarFrame({ host, element, head, align, children }: BarFrameProps) {
  const barRef = useRef<HTMLDivElement | null>(null)
  const placeRef = useRef(() => {})
  useLayoutEffect(() => {
    placeRef.current = () => {
      const bar = barRef.current
      const el = host.current
      if (!bar || !el) return
      const spot = spotFor(bar, el, headDepth(el, element, head), align)
      bar.style.top = `${spot.top}px`
      bar.style.left = `${spot.left}px`
    }
    placeRef.current()
  })
  useEffect(() => {
    const place = () => placeRef.current()
    const el = host.current
    const watch = new ResizeObserver(place)
    if (el) watch.observe(el)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      watch.disconnect()
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [host])

  return createPortal(
    <div
      ref={barRef}
      data-ff-editor-helper
      className="fixed z-20 flex w-max items-center gap-[4px] overflow-hidden whitespace-nowrap rounded border border-line bg-panel p-px text-ui text-ink"
      style={{ top: -9999, left: -9999 }}
      onPointerDown={hold}
      onClick={hold}
      onDoubleClick={hold}
      onDragStart={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      <LabelsShown.Provider value={false}>{children}</LabelsShown.Provider>
    </div>,
    document.body,
  )
}

// The block or column the bar belongs to, as its sign alone; the name is for
// a screen reader.
export function BarSign({ type, name }: { type: string; name: string }) {
  return (
    <span role="img" aria-label={name} className="flex h-control items-center px-[6px]">
      {createElement(BLOCK_ICONS[type] ?? Component, { size: 14, className: 'text-muted', 'aria-hidden': true })}
    </span>
  )
}
