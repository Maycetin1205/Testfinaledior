// Ein Fenster, das unter seinem Anker haengt und sich selbst hinmisst.
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
import { cn } from '@/editor/werkbank/cn'

const RAND = 8
const Familie = createContext<readonly string[]>([])
const offeneFenster: string[] = []

export interface PopoverProps {
  bezeichnung: string

  // Das Ding, unter dem das Fenster haengt. Die Messung passiert HIER, ein
  // einziges Mal.
  anker: RefObject<HTMLElement | null>

  breite?: number
  maxHoehe?: number

  // Ein Fenster darueber muss Escape abfangen, sonst raeumt die Taste das
  // darunter mit auf.
  escapeAbfangen?: boolean
  onClose: () => void
  children: ReactNode
}

export function Popover({
  bezeichnung,
  anker,
  breite = 256,
  maxHoehe = 320,
  escapeAbfangen = false,
  onClose,
  children,
}: PopoverProps) {
  const id = useId()
  const vorfahren = useContext(Familie)
  const familie = [...vorfahren, id]
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    offeneFenster.push(id)
    return () => {
      const platz = offeneFenster.indexOf(id)
      if (platz >= 0) offeneFenster.splice(platz, 1)
    }
  }, [id])
  const [platz, setPlatz] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const messen = () => {
      const a = anker.current?.getBoundingClientRect()
      if (!a) return
      const eigen = el.getBoundingClientRect()
      const maxLeft = Math.max(RAND, window.innerWidth - RAND - eigen.width)
      const maxTop = Math.max(RAND, window.innerHeight - RAND - eigen.height)
  // Kein Platz mehr unter dem Anker: dann darueber, nicht halb aus dem Bild.
      const untenPasst = a.bottom + 4 <= maxTop
      const top = untenPasst ? a.bottom + 4 : Math.max(RAND, a.top - 4 - eigen.height)
      const links = Math.max(RAND, Math.min(a.left, maxLeft))
      setPlatz((vorher) =>
        vorher?.top === top && vorher.left === links ? vorher : { top, left: links })
    }
    messen()
    const ro = new ResizeObserver(messen)
    ro.observe(el)
    return () => ro.disconnect()
  }, [anker])

  useEffect(() => {
    const drauf = (e: PointerEvent) => {
      const ziel = e.target as Node
      if (e.composedPath().some((el) => el instanceof HTMLElement
        && el.dataset.ffPopoverFamilie?.split(' ').includes(id))) return
      if (ref.current?.contains(ziel) || anker.current?.contains(ziel)) return
      onClose()
    }
    const gerollt = (e: Event) => {
      if (e.composedPath().some((el) => el instanceof HTMLElement
        && el.dataset.ffPopoverFamilie?.split(' ').includes(id))) return
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return
      onClose()
    }
    const taste = (e: Event) => {
      if (!(e instanceof KeyboardEvent) || e.key !== 'Escape' || offeneFenster.at(-1) !== id) return
      if (escapeAbfangen) {
        e.stopImmediatePropagation()
        e.stopPropagation()
      }
      onClose()
    }
    const tastenZiel: EventTarget = escapeAbfangen ? window : document
    document.addEventListener('pointerdown', drauf, true)
    document.addEventListener('scroll', gerollt, true)
    tastenZiel.addEventListener('keydown', taste, true)
    return () => {
      document.removeEventListener('pointerdown', drauf, true)
      document.removeEventListener('scroll', gerollt, true)
      tastenZiel.removeEventListener('keydown', taste, true)
    }
  }, [anker, onClose, escapeAbfangen, id])

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      tabIndex={-1}
      aria-label={bezeichnung}
      data-ff-editor-helper
      data-ff-popover-familie={familie.join(' ')}
      draggable={false}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onDragStart={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      style={{
        position: 'fixed',
        top: platz?.top ?? -9999,
        left: platz?.left ?? -9999,
        width: breite,
        maxHeight: maxHoehe,
        zIndex: 50,
      }}
      className={cn(
        'overflow-y-auto rounded border border-linie bg-panel p-1 text-tinte shadow-overlay',
        // Vor der Messung unsichtbar, aber nicht `invisible`: was
        // visibility:hidden traegt, nimmt keinen Fokus an.
        platz === null && 'opacity-0',
      )}
    >
      <Familie.Provider value={familie}>{children}</Familie.Provider>
    </div>,
    document.body,
  )
}
