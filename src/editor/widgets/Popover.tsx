import {
  createContext,
  useContext,
  useId,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/editor/widgets/cn'
import { useCloseOnEscape } from './useCloseOnEscape'

const EDGE = 8
const Family = createContext<readonly string[]>([])

export const LEVEL_OVER_MASK_WINDOW = 2147483647

export interface PopoverProps {
  name: string

  anchor?: RefObject<HTMLElement | null>

  // A point to open at; the anchor then only keeps a click on it from closing.
  at?: { top: number; left: number }

  width?: number
  maxHeight?: number
  level?: number

  onClose: () => void
  children: ReactNode
}

export function Popover({
  name,
  anchor,
  at,
  width = 256,
  maxHeight = 320,
  level = 50,
  onClose,
  children,
}: PopoverProps) {
  const id = useId()
  const ancestors = useContext(Family)
  const family = [...ancestors, id]
  const ref = useRef<HTMLDivElement | null>(null)
  const [slot, setSlot] = useState<{ top: number; left: number } | null>(null)
  useCloseOnEscape(onClose)

  const atTop = at?.top
  const atLeft = at?.left
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const own = el.getBoundingClientRect()
      const maxLeft = Math.max(EDGE, window.innerWidth - EDGE - own.width)
      const maxTop = Math.max(EDGE, window.innerHeight - EDGE - own.height)
      let top: number
      let left: number
      if (atTop !== undefined && atLeft !== undefined) {
        top = Math.max(EDGE, Math.min(atTop, maxTop))
        left = Math.max(EDGE, Math.min(atLeft, maxLeft))
      } else {
        const a = anchor?.current?.getBoundingClientRect()
        if (!a) return
        const bottomFits = a.bottom + 4 <= maxTop
        top = bottomFits ? a.bottom + 4 : Math.max(EDGE, a.top - 4 - own.height)
        left = Math.max(EDGE, Math.min(a.left, maxLeft))
      }
      setSlot((before) =>
        before?.top === top && before.left === left ? before : { top, left: left })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [anchor, atTop, atLeft])

  useEffect(() => {
    const inFamily = (e: Event): boolean => e.composedPath().some((el) => el instanceof HTMLElement
      && el.dataset.ffPopoverFamily?.split(' ').includes(id))
    const onto = (e: PointerEvent) => {
      const target = e.target as Node
      if (inFamily(e)) return
      if (ref.current?.contains(target) || anchor?.current?.contains(target)) return
      onClose()
    }
    const scrolled = (e: Event) => {
      if (inFamily(e)) return
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return
      onClose()
    }
    document.addEventListener('pointerdown', onto, true)
    document.addEventListener('scroll', scrolled, true)
    return () => {
      document.removeEventListener('pointerdown', onto, true)
      document.removeEventListener('scroll', scrolled, true)
    }
  }, [anchor, onClose, id])

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      tabIndex={-1}
      aria-label={name}
      data-ff-editor-helper
      data-ff-popover-family={family.join(' ')}
      draggable={false}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onDragStart={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      style={{
        position: 'fixed',
        top: slot?.top ?? -9999,
        left: slot?.left ?? -9999,
        width: width,
        maxHeight: maxHeight,
        zIndex: level,
      }}
      className={cn(
        'overflow-y-auto rounded border border-line bg-panel p-1 text-ink shadow-overlay',

        slot === null && 'opacity-0',
      )}
    >
      <Family.Provider value={family}>{children}</Family.Provider>
    </div>,
    document.body,
  )
}
