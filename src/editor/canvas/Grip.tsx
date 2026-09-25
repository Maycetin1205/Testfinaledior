import type { PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '@/editor/widgets/cn'
import type { Edge } from './useBlockResize'

// An edge takes the pointer along its whole length; its mark sits in the middle.
const GRIP_PLACE: Record<Edge, string> = {
  n: '-top-1 inset-x-[4px] h-[7px] cursor-ns-resize',
  s: '-bottom-1 inset-x-[4px] h-[7px] cursor-ns-resize',
  e: '-right-1 inset-y-[4px] w-[7px] cursor-ew-resize',
  w: '-left-1 inset-y-[4px] w-[7px] cursor-ew-resize',
  ne: '-right-1 -top-1 h-[7px] w-[7px] cursor-nesw-resize',
  se: '-bottom-1 -right-1 h-[7px] w-[7px] cursor-nwse-resize',
  sw: '-bottom-1 -left-1 h-[7px] w-[7px] cursor-nesw-resize',
  nw: '-left-1 -top-1 h-[7px] w-[7px] cursor-nwse-resize',
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
      <span className="h-[7px] w-[7px] bg-[hsl(var(--wb-selection))]" />
    </div>
  )
}
