import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/editor/widgets/cn'

const EDGE = 8

export const LEVEL_OVER_MASK_WINDOW = 2147483647

interface SelectionWindowProps {
  name: string

  top: number
  left: number

  anchor?: RefObject<HTMLElement | null>

  className: string

  level?: number
  inPictureHold?: boolean
  escapeCatch?: boolean
  onClose: () => void
  children: ReactNode
}

export function SelectionWindow({
  name,
  top,
  left,
  anchor,
  className,
  level = 50,
  inPictureHold = false,
  escapeCatch = false,
  onClose,
  children,
}: SelectionWindowProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [clamped, setClamped] = useState({ top: top, left: left })

  const position = inPictureHold ? clamped : { top: top, left: left }

  useLayoutEffect(() => {
    const el = ref.current
    if (!inPictureHold || !el) return
    const clamp = () => {
      const rect = el.getBoundingClientRect()
      const maxLeft = Math.max(EDGE, window.innerWidth - EDGE - rect.width)
      const maxTop = Math.max(EDGE, window.innerHeight - EDGE - rect.height)
      const nextLeft = Math.max(EDGE, Math.min(left, maxLeft))
      const nextTop = Math.max(EDGE, Math.min(top, maxTop))
      setClamped((prev) =>
        prev.left === nextLeft && prev.top === nextTop ? prev : { top: nextTop, left: nextLeft },
      )
    }
    clamp()
    const ro = new ResizeObserver(clamp)
    ro.observe(el)
    return () => ro.disconnect()
  }, [top, left, inPictureHold])

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target) || anchor?.current?.contains(target)) return
      onClose()
    }
    const onScroll = (e: Event) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return
      onClose()
    }
    const onKeyDown = (e: Event) => {
      if (!(e instanceof KeyboardEvent) || e.key !== 'Escape') return
      if (escapeCatch) {
        e.stopImmediatePropagation()
        e.stopPropagation()
      }
      onClose()
    }

    const keysTarget: EventTarget = escapeCatch ? window : document
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('scroll', onScroll, true)
    keysTarget.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('scroll', onScroll, true)
      keysTarget.removeEventListener('keydown', onKeyDown, true)
    }
  }, [anchor, onClose, escapeCatch])

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={name}
      data-ff-editor-helper
      draggable={false}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onDragStart={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      style={{ position: 'fixed', top: position.top, left: position.left, zIndex: level }}
      className={cn(
        'overflow-y-auto rounded-md border border-linie bg-panel p-1 text-tinte shadow-md',
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  )
}
