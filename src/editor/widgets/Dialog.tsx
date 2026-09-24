import { useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { useCloseOnEscape } from './useCloseOnEscape'
import { Button } from './Button'

interface DialogProps {
  title: ReactNode

  besideTitle?: ReactNode

  narrow?: boolean

  edgeless?: boolean

  foot?: ReactNode
  onClose: () => void
  children: ReactNode
}

export function Dialog({
  title,
  besideTitle,
  narrow = false,
  edgeless = false,
  foot,
  onClose,
  children,
}: DialogProps) {
  const titleId = useId()
  useCloseOnEscape(onClose)

  const body = (
    <div
      role="dialog"
      aria-modal="true"

      aria-labelledby={titleId}
      className={cn(
        'flex min-h-0 flex-col bg-ground',
        narrow
          ? 'w-full max-w-md rounded border border-line bg-panel shadow-overlay'
          : 'h-full w-full',
      )}
    >
      <header className="flex h-10 shrink-0 items-center gap-3 border-b border-line bg-panel px-3">
        <h2 id={titleId} className="min-w-0 flex-1 truncate text-title font-bold text-ink">
          {title}
          {besideTitle !== undefined && (
            <span className="ml-2 text-ui font-normal text-muted">{besideTitle}</span>
          )}
        </h2>
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
        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-panel px-3 py-2">
          {foot}
        </footer>
      )}
    </div>
  )

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-40',
        // .vov: rgba(16,40,48,.34); --wb-ink is the nearest editor color.
        narrow ? 'flex items-center justify-center bg-ink/[.34] p-6' : '',
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
