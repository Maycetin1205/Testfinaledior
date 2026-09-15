// Der Rahmen jedes Editor-Fensters: Kopf, Inhalt, Fuss, Escape.
import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@/editor/zeichen/zeichen'
import { cn } from '@/editor/werkbank/cn'
import { Knopf } from './Knopf'

export interface DialogProps {
  titel: ReactNode

  nebenTitel?: ReactNode

  aktionen?: ReactNode

  schmal?: boolean

  // Ohne Innenabstand und ohne eigenen Scroller: fuer Fenster, die ihre
  // Scroll-Flaechen selbst mitbringen.
  randlos?: boolean

  // Ein Fenster UEBER einem Fenster muss Escape abfangen, sonst raeumt dieselbe
  // Taste das darunter mit auf.
  escapeAbfangen?: boolean

  fuss?: ReactNode
  onClose: () => void
  children: ReactNode
}

export function Dialog({
  titel,
  nebenTitel,
  aktionen,
  schmal = false,
  randlos = false,
  escapeAbfangen = false,
  fuss,
  onClose,
  children,
}: DialogProps) {
  const titelId = useId()

  useEffect(() => {
    const taste = (e: Event) => {
      if (!(e instanceof KeyboardEvent) || e.key !== 'Escape') return
      if (escapeAbfangen) {
        e.stopImmediatePropagation()
        e.stopPropagation()
      }
      onClose()
    }
      // `window` in der Fangphase liegt VOR jedem Lauscher am `document`: nur so
      // kommt das obere Fenster zuerst an die Taste.
    if (escapeAbfangen) {
      window.addEventListener('keydown', taste, true)
      return () => window.removeEventListener('keydown', taste, true)
    }
    document.addEventListener('keydown', taste)
    return () => document.removeEventListener('keydown', taste)
  }, [onClose, escapeAbfangen])

  const rumpf = (
    <div
      role="dialog"
      aria-modal="true"

      // Der Vorlesename haengt an der Kopfzeile, nicht an einer Kopie des Titels:
      // so traegt er auch den Nebentitel.
      aria-labelledby={titelId}
      className={cn(
        'flex min-h-0 flex-col bg-grund',
        schmal
          ? 'w-full max-w-md rounded border border-linie bg-panel shadow-overlay'
          : 'h-full w-full',
      )}
    >
      <header className="flex h-10 shrink-0 items-center gap-3 border-b border-linie px-3">
        <h2 id={titelId} className="min-w-0 flex-1 truncate text-ui font-semibold text-tinte">
          {titel}
          {nebenTitel !== undefined && (
            <span className="ml-2 font-normal text-matt">{nebenTitel}</span>
          )}
        </h2>
        {aktionen}
        <Knopf nurZeichen aria-label="Schließen" title="Schließen (Esc)" onClick={onClose}>
          <X size={15} />
        </Knopf>
      </header>

      <div
        className={cn(
          'min-h-0 min-w-0 flex-1',
          randlos
            ? 'flex overflow-hidden'
            : cn('overflow-auto', schmal ? 'p-3' : 'p-4'),
        )}
      >
        {children}
      </div>

      {fuss && (
        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-linie px-3 py-2">
          {fuss}
        </footer>
      )}
    </div>
  )

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-40',
        schmal ? 'flex items-center justify-center bg-tinte/30 p-6' : '',
      )}
      onPointerDown={(e) => {
        if (schmal && e.target === e.currentTarget) onClose()
      }}
    >
      {rumpf}
    </div>,
    document.body,
  )
}
