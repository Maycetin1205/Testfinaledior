import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@/editor/icons/icon'
import { Button } from './Button'
import { cn } from './cn'
import { FamilyMember } from './Popover'
import { useCloseOnEscape } from './useCloseOnEscape'

interface WindowTab<K extends string> {
  key: K
  name: string
  count?: number
}

// A window in the middle of the screen over the mask, never modal: the mask
// stays at hand around it. The head holds the title, what stands beside it
// and the buttons on the right; then the tabs, the content, the foot. A
// popover opened in it belongs to it, and one it was opened from stays open.
// As a panel it holds lists of its own, so Delete there leaves the marked
// block alone. It looks like the window of the mask (DialogFrame): white, no
// edge, the larger corner of a card and the shadow of what floats.
export function Window<K extends string>({
  title,
  beside,
  buttons,
  tabs,
  tab,
  onTab,
  width,
  height,
  tabsInHead = false,
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
  // The tabs stand in the head and the title is only read out.
  tabsInHead?: boolean
  width: number
  // Without a height the window is as high as its content.
  height?: number
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
          style={{
            width: `min(${width}px, 96vw)`,
            ...(height === undefined ? { maxHeight: '92vh' } : { height: `min(${height}px, 92vh)` }),
            zIndex: level,
          }}
          className="fixed left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-card)] bg-panel text-ui text-ink shadow-overlay"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* The head of a card of the mask: the title as text, a hairline below. */}
          <header className="flex h-[52px] shrink-0 items-stretch gap-[14px] border-b border-line-soft pr-[12px]">
            {tabsInHead && tabs
              ? <Tabs tabs={tabs} tab={tab} onTab={onTab} inHead />
              : <h2 className="flex shrink-0 items-center pl-[22px] text-title font-bold tracking-[-.01em]">{title}</h2>}
            <div className="flex min-w-0 flex-1 items-center">{beside}</div>
            <div className="flex shrink-0 items-center gap-[8px]">
              {buttons}
              <Button onlyIcon aria-label={`${title} schließen`} title="Schließen" onClick={onClose}>
                <X size={15} />
              </Button>
            </div>
          </header>
          {!tabsInHead && tabs && <Tabs tabs={tabs} tab={tab} onTab={onTab} />}
          <div className="flex min-h-0 flex-1">{children}</div>
          {foot && (
            <footer className="flex shrink-0 justify-end gap-[8px] border-t border-line-soft bg-panel px-[18px] py-[10px]">
              {foot}
            </footer>
          )}
        </section>,
        document.body,
      )}
    </FamilyMember>
  )
}

// The tabs, on a row of their own or in the head in place of the title: the
// open one bold with a blue line under it, the others quiet, all on white.
function Tabs<K extends string>({ tabs, tab, onTab, inHead = false }: {
  tabs: readonly WindowTab<K>[]
  tab?: K
  onTab?: (key: K) => void
  inHead?: boolean
}) {
  return (
    <nav className={cn('flex shrink-0', inHead ? 'px-[8px]' : 'border-b border-line-soft px-[6px]')}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          aria-pressed={tab === t.key}
          onClick={() => onTab?.(t.key)}
          className={cn(
            '-mb-px border-b-2 px-[12px] transition-colors',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
            inHead ? 'text-title' : 'pb-[8px] pt-[9px]',
            tab === t.key
              ? 'border-b-accent font-bold text-ink'
              : 'border-b-transparent font-semibold text-muted hover:text-ink',
          )}
        >
          {t.name}
          {t.count !== undefined && <span className="ml-[6px] text-ui font-semibold tabular-nums text-muted">{t.count}</span>}
        </button>
      ))}
    </nav>
  )
}
