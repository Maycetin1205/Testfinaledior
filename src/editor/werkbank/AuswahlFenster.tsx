// Das kleine Auswahlfenster, das an einem Griff haengt.
import {
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

// Ueber einem Fenster der Maske: dessen Dialograhmen stapelt sich ganz oben,
// also muss die Bedienung darueber noch eine Stufe hoeher.
export const EBENE_UEBER_MASKENFENSTER = 2147483647

interface AuswahlFensterProps {
  bezeichnung: string

  oben: number
  links: number

  // Ein Zeigerdruck auf den Griff schliesst hier nicht: sonst raeumt der Druck
  // das Fenster ab und der Klick danach oeffnet es wieder.
  anker?: RefObject<HTMLElement | null>

  className: string

  // Wie hoch das Fenster stapelt. Ohne Angabe die Stufe der Werkbank.
  ebene?: number
  imBildHalten?: boolean
  escapeAbfangen?: boolean
  onClose: () => void
  children: ReactNode
}

export function AuswahlFenster({
  bezeichnung,
  oben,
  links,
  anker,
  className,
  ebene = 50,
  imBildHalten = false,
  escapeAbfangen = false,
  onClose,
  children,
}: AuswahlFensterProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [geklemmt, setGeklemmt] = useState({ top: oben, left: links })

  const position = imBildHalten ? geklemmt : { top: oben, left: links }

  useLayoutEffect(() => {
    const el = ref.current
    if (!imBildHalten || !el) return
    const klemmen = () => {
      const rect = el.getBoundingClientRect()
      const maxLeft = Math.max(RAND, window.innerWidth - RAND - rect.width)
      const maxTop = Math.max(RAND, window.innerHeight - RAND - rect.height)
      const nextLeft = Math.max(RAND, Math.min(links, maxLeft))
      const nextTop = Math.max(RAND, Math.min(oben, maxTop))
      setGeklemmt((prev) =>
        prev.left === nextLeft && prev.top === nextTop ? prev : { top: nextTop, left: nextLeft },
      )
    }
    klemmen()
    const ro = new ResizeObserver(klemmen)
    ro.observe(el)
    return () => ro.disconnect()
  }, [oben, links, imBildHalten])

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const ziel = e.target as Node
      if (ref.current?.contains(ziel) || anker?.current?.contains(ziel)) return
      onClose()
    }
    const onScroll = (e: Event) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return
      onClose()
    }
    const onKeyDown = (e: Event) => {
      if (!(e instanceof KeyboardEvent) || e.key !== 'Escape') return
      if (escapeAbfangen) {
        e.stopImmediatePropagation()
        e.stopPropagation()
      }
      onClose()
    }

    const tastenZiel: EventTarget = escapeAbfangen ? window : document
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('scroll', onScroll, true)
    tastenZiel.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('scroll', onScroll, true)
      tastenZiel.removeEventListener('keydown', onKeyDown, true)
    }
  }, [anker, onClose, escapeAbfangen])

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={bezeichnung}
      data-ff-editor-helper
      draggable={false}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onDragStart={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      style={{ position: 'fixed', top: position.top, left: position.left, zIndex: ebene }}
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
