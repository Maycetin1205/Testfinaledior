import { useContext, type ReactNode } from 'react'
import { Tile } from '@/editor/widgets/Tile'
import { LabelsShown } from './labelsShown'

// The name in front of a control, as .vfeld-label writes it, and what it
// refers to, like the field a Kanban column sorts by. In the bar itself the
// control stands alone.
export function Labeled({ label, detail = '', children }: {
  label: string
  detail?: string
  children: ReactNode
}) {
  if (!useContext(LabelsShown)) return <>{children}</>
  // A line of a window: the name on the left, the control on the right.
  return (
    <span className="grid min-h-control w-full min-w-0 grid-cols-[112px_minmax(0,1fr)] items-center gap-[8px]">
      <span className="truncate text-dense text-muted" title={label}>{label}</span>
      <span className="flex min-w-0 items-center gap-[6px]">
        {detail !== '' && <span className="shrink-0 font-semibold text-ink">{detail}</span>}
        {children}
      </span>
    </span>
  )
}

// A switch: in the bar a tile with its name, in a window a small tick with its
// name beside it, so several stand side by side.
export function Switch({ label, on, onToggle }: { label: string; on: boolean; onToggle: (on: boolean) => void }) {
  if (!useContext(LabelsShown)) return <Tile label={label} on={on} onToggle={onToggle} />
  return (
    <label data-switch className="flex h-[24px] shrink-0 cursor-pointer items-center gap-[6px] text-ui text-ink">
      <input
        type="checkbox"
        className="h-[14px] w-[14px] shrink-0 accent-accent"
        checked={on}
        onChange={(e) => onToggle(e.currentTarget.checked)}
      />
      {label}
    </label>
  )
}
