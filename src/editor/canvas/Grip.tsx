import type { PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '@/editor/widgets/cn'
import type { Edge } from './useBlockResize'

// An edge takes the pointer along its whole length, 10 px wide so it is
// easy to hit; its mark sits in the middle.
const GRIP_PLACE: Record<Edge, string> = {
  n: '-top-[5px] inset-x-[6px] h-[10px] cursor-ns-resize',
  s: '-bottom-[5px] inset-x-[6px] h-[10px] cursor-ns-resize',
  e: '-right-[5px] inset-y-[6px] w-[10px] cursor-ew-resize',
  w: '-left-[5px] inset-y-[6px] w-[10px] cursor-ew-resize',
  ne: '-right-[5px] -top-[5px] h-[10px] w-[10px] cursor-nesw-resize',
  se: '-bottom-[5px] -right-[5px] h-[10px] w-[10px] cursor-nwse-resize',
  sw: '-bottom-[5px] -left-[5px] h-[10px] w-[10px] cursor-nesw-resize',
  nw: '-left-[5px] -top-[5px] h-[10px] w-[10px] cursor-nwse-resize',
}

interface GripProps {
  edge: Edge
  onStart: (e: ReactPointerEvent<HTMLDivElement>) => void
  onReset: () => void
}

// The handle a block or a window is pulled at; a double click gives back the
// start size along it.
export function Grip({ edge, onStart, onReset }: GripProps) {
  return (
    <div
      draggable={false}
      onPointerDown={onStart}
      onDragStart={(e) => e.preventDefault()}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onReset()
      }}
      className={cn('pointer-events-auto absolute z-30 flex items-center justify-center', GRIP_PLACE[edge])}
    >
      <span className="h-[8px] w-[8px] bg-[hsl(var(--wb-selection))] ring-1 ring-[hsl(var(--wb-panel))]" />
    </div>
  )
}
