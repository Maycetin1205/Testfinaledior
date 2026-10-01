import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@/editor/icons/icon'
import { Button } from './Button'
import { cn } from './cn'
import { FamilyMember } from './Popover'
import { useCloseOnEscape } from './useCloseOnEscape'

export interface WindowTab<K extends string> {
  key: K
  name: string
  count?: number
}

// A window in the middle of the screen over the mask, never modal: the mask
// stays at hand around it. The head holds the title, what stands beside it
// and the buttons on the right; then the tabs, the content, the foot. A
// popover opened in it belongs to it, and one it was opened from stays open.
// As a panel it holds lists of its own, so Delete there leaves the marked
// block alone.
export function Window<K extends string>({
  title,
  beside,
  buttons,
  tabs,
  tab,
  onTab,
  width,
  height,
  panel = false,
  level = 40,
  foot,
  onClose,
  children,
}: {
  title: string
  beside?: ReactNode
  buttons?: ReactNode
  tabs?: readonly WindowTab<K>[]
  tab?: K
  onTab?: (key: K) => void
  width: number
  height: number
  panel?: boolean
  // Above the window it was opened from.
  level?: number
  foot?: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  useCloseOnEscape(onClose)
  return (
    <FamilyMember>
      {(family) => createPortal(
        <section
          role={panel ? 'region' : 'dialog'}
          aria-label={title}
          data-ff-popover-family={family}
          {...(panel ? { 'data-ff-data-panel': '' } : { 'data-ff-editor-helper': '' })}
          style={{ width: `min(${width}px, 96vw)`, height: `min(${height}px, 92vh)`, zIndex: level }}
          className="fixed left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded border border-line bg-panel text-ui text-ink shadow-overlay"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <header className="flex h-[44px] shrink-0 items-center gap-[14px] border-b border-line px-[14px]">
            <h2 className="shrink-0 text-title font-semibold">{title}</h2>
            <div className="flex min-w-0 flex-1 items-center">{beside}</div>
            {buttons}
            <Button onlyIcon aria-label={`${title} schließen`} title="Schließen" onClick={onClose}>
              <X size={15} />
            </Button>
          </header>
          {tabs && (
            <nav className="flex shrink-0 border-b border-line bg-control px-[8px]">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={tab === t.key}
                  onClick={() => onTab?.(t.key)}
                  className={cn(
                    '-mb-px border-b-2 px-[14px] pb-[6px] pt-[7px]',
                    tab === t.key
                      ? 'border-x border-x-line border-b-accent bg-panel font-semibold text-ink'
                      : 'border-b-transparent text-muted hover:text-ink',
                  )}
                >
                  {t.name}
                  {t.count !== undefined && <span className="ml-[6px] font-normal tabular-nums text-muted">{t.count}</span>}
                </button>
              ))}
            </nav>
          )}
          <div className="flex min-h-0 flex-1">{children}</div>
          {foot && (
            <footer className="flex shrink-0 justify-end gap-[8px] border-t border-line bg-control px-[14px] py-[8px]">
              {foot}
            </footer>
          )}
        </section>,
        document.body,
      )}
    </FamilyMember>
  )
}
