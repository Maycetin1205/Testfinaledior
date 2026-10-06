import { createElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Component } from '@/editor/icons/icon'
import { BLOCK_ICONS } from '../blockIcons'
import { useBarStrip } from './useBarStrip'
import { LabelsShown } from './labelsShown'

const hold = (e: { stopPropagation: () => void }): void => e.stopPropagation()

// The frame of a bar: one line in the strip under the toolbar, the same place
// for every block and column.
export function BarFrame({ children }: { children: ReactNode }) {
  const strip = useBarStrip()
  if (!strip) return null
  return createPortal(
    <div
      className="flex w-max items-center gap-[4px] whitespace-nowrap"
      onPointerDown={hold}
      onClick={hold}
      onDoubleClick={hold}
      onDragStart={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      <LabelsShown.Provider value={false}>{children}</LabelsShown.Provider>
    </div>,
    strip,
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
