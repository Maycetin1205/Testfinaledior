import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { Button } from './PushButton'

export interface DialogProps {
  title: ReactNode

  besideTitle?: ReactNode

  actions?: ReactNode

  narrow?: boolean

  edgeless?: boolean

  escapeCatch?: boolean

  foot?: ReactNode
  onClose: () => void
  children: ReactNode
}

export function Dialog({
  title,
  besideTitle,
  actions,
  narrow = false,
  edgeless = false,
  escapeCatch = false,
  foot,
  onClose,
  children,
}: DialogProps) {
  const titleId = useId()

  useEffect(() => {
    const key = (e: Event) => {
      if (!(e instanceof KeyboardEvent) || e.key !== 'Escape') return
      if (escapeCatch) {
        e.stopImmediatePropagation()
        e.stopPropagation()
      }
      onClose()
    }

    if (escapeCatch) {
      window.addEventListener('keydown', key, true)
      return () => window.removeEventListener('keydown', key, true)
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose, escapeCatch])

  const body = (
    <div
      role="dialog"
      aria-modal="true"

      aria-labelledby={titleId}
      className={cn(
        'flex min-h-0 flex-col bg-grund',
        narrow
          ? 'w-full max-w-md rounded border border-linie bg-panel shadow-overlay'
          : 'h-full w-full',
      )}
    >
      <header className="flex h-10 shrink-0 items-center gap-3 border-b border-linie px-3">
        <h2 id={titleId} className="min-w-0 flex-1 truncate text-ui font-semibold text-tinte">
          {title}
          {besideTitle !== undefined && (
            <span className="ml-2 font-normal text-matt">{besideTitle}</span>
          )}
        </h2>
        {actions}
        <Button onlyIcon aria-label="Schließen" title="Schließen (Esc)" onClick={onClose}>
          <X size={15} />
        </Button>
      </header>

      <div
        className={cn(
          'min-h-0 min-w-0 flex-1',
          edgeless
            ? 'flex overflow-hidden'
            : cn('overflow-auto', narrow ? 'p-3' : 'p-4'),
        )}
      >
        {children}
      </div>

      {foot && (
        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-linie px-3 py-2">
          {foot}
        </footer>
      )}
    </div>
  )

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-40',
        narrow ? 'flex items-center justify-center bg-tinte/30 p-6' : '',
      )}
      onPointerDown={(e) => {
        if (narrow && e.target === e.currentTarget) onClose()
      }}
    >
      {body}
    </div>,
    document.body,
  )
}
