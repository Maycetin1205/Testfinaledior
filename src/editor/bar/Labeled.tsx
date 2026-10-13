import { useContext, type ReactNode } from 'react'
import { Tile } from '@/editor/widgets/Tile'
import { TickBox } from '@/editor/widgets/TickBox'
import { LabelsShown } from './labelsShown'

// The name in front of a control, as the label of a field of the mask (.f .l)
// writes it, and what it refers to, like the field a Kanban column sorts by.
// In the bar itself the control stands alone.
export function Labeled({ label, detail = '', children }: {
  label: string
  detail?: string
  children: ReactNode
}) {
  if (!useContext(LabelsShown)) return <>{children}</>
  // A line of a window: the name on the left, the control on the right.
  return (
    <span className="grid min-h-control w-full min-w-0 grid-cols-[112px_minmax(0,1fr)] items-center gap-[8px]">
      <span className="truncate text-dense font-semibold text-muted" title={label}>{label}</span>
      <span className="flex min-w-0 items-center gap-[6px]">
        {detail !== '' && <span className="shrink-0 font-semibold text-ink">{detail}</span>}
        {children}
      </span>
    </span>
  )
}

// A switch: in the bar a tile with its name, in a window the box of a
// checkbox of the mask with its name beside it, so several stand side by side.
// The checkbox itself is unseen and keeps the keys.
export function Switch({ label, on, onToggle }: { label: string; on: boolean; onToggle: (on: boolean) => void }) {
  if (!useContext(LabelsShown)) return <Tile label={label} on={on} onToggle={onToggle} />
  return (
    <label data-switch className="flex h-[24px] shrink-0 cursor-pointer items-center gap-[8px] text-ui font-semibold text-ink">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={on}
        onChange={(e) => onToggle(e.currentTarget.checked)}
      />
      <TickBox
        on={on}
        className="peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
      />
      {label}
    </label>
  )
}
