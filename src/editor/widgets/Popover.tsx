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

const EDGE = 8
const Family = createContext<readonly string[]>([])
const openPopovers: string[] = []

export interface PopoverProps {
  name: string

  anchor: RefObject<HTMLElement | null>

  width?: number
  maxHeight?: number

  escapeCatch?: boolean
  onClose: () => void
  children: ReactNode
}

export function Popover({
  name,
  anchor,
  width = 256,
  maxHeight = 320,
  escapeCatch = false,
  onClose,
  children,
}: PopoverProps) {
  const id = useId()
  const ancestors = useContext(Family)
  const family = [...ancestors, id]
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    openPopovers.push(id)
    return () => {
      const slot = openPopovers.indexOf(id)
      if (slot >= 0) openPopovers.splice(slot, 1)
    }
  }, [id])
  const [slot, setSlot] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const a = anchor.current?.getBoundingClientRect()
      if (!a) return
      const own = el.getBoundingClientRect()
      const maxLeft = Math.max(EDGE, window.innerWidth - EDGE - own.width)
      const maxTop = Math.max(EDGE, window.innerHeight - EDGE - own.height)

      const bottomFits = a.bottom + 4 <= maxTop
      const top = bottomFits ? a.bottom + 4 : Math.max(EDGE, a.top - 4 - own.height)
      const left = Math.max(EDGE, Math.min(a.left, maxLeft))
      setSlot((before) =>
        before?.top === top && before.left === left ? before : { top, left: left })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [anchor])

  useEffect(() => {
    const onto = (e: PointerEvent) => {
      const target = e.target as Node
      if (e.composedPath().some((el) => el instanceof HTMLElement
        && el.dataset.ffPopoverFamily?.split(' ').includes(id))) return
      if (ref.current?.contains(target) || anchor.current?.contains(target)) return
      onClose()
    }
    const scrolled = (e: Event) => {
      if (e.composedPath().some((el) => el instanceof HTMLElement
        && el.dataset.ffPopoverFamily?.split(' ').includes(id))) return
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return
      onClose()
    }
    const key = (e: Event) => {
      if (!(e instanceof KeyboardEvent) || e.key !== 'Escape' || openPopovers.at(-1) !== id) return
      if (escapeCatch) {
        e.stopImmediatePropagation()
        e.stopPropagation()
      }
      onClose()
    }
    const keysTarget: EventTarget = escapeCatch ? window : document
    document.addEventListener('pointerdown', onto, true)
    document.addEventListener('scroll', scrolled, true)
    keysTarget.addEventListener('keydown', key, true)
    return () => {
      document.removeEventListener('pointerdown', onto, true)
      document.removeEventListener('scroll', scrolled, true)
      keysTarget.removeEventListener('keydown', key, true)
    }
  }, [anchor, onClose, escapeCatch, id])

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
        zIndex: 50,
      }}
      className={cn(
        'overflow-y-auto rounded border border-linie bg-panel p-1 text-tinte shadow-overlay',

        slot === null && 'opacity-0',
      )}
    >
      <Family.Provider value={family}>{children}</Family.Provider>
    </div>,
    document.body,
  )
}
