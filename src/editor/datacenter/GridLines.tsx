import { useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Trash2 } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'

// The lists of the data panel: a strip that names a list, then lines of two
// typed cells and a bin, the last line empty for a new entry.

export const TH = 'h-[26px] border-b border-r border-line bg-control px-[10px] text-left text-dense font-semibold text-muted last:border-r-0'
export const TD = 'h-[29px] border-b border-r border-line/70 p-0 last:border-r-0'
const CELL = 'h-[28px] w-full min-w-0 bg-transparent px-[10px] text-ui text-ink outline-none focus:bg-panel focus:shadow-cell'

export function Strip({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex h-[30px] shrink-0 items-center gap-[8px] border-b border-line bg-control px-[12px] text-dense font-semibold text-muted">
      <span className="min-w-0 truncate">{children}</span>
      {right !== undefined && <span className="ml-auto flex shrink-0 items-center font-normal">{right}</span>}
    </div>
  )
}

// Focus that leaves the line, not just the cell.
const leavesLine = (e: FocusEvent<HTMLElement>): boolean =>
  !(e.currentTarget.closest('tr')?.contains(e.relatedTarget as Node | null) ?? false)

// A line of typed cells: Enter or leaving the line saves, Esc takes back.
// What does not read stays red and is not saved.
export function Line({ cells, names, mono, valid, active = false, onSelect, onSave, onRemove }: {
  cells: readonly string[]
  names: readonly string[]
  mono: readonly boolean[]
  valid: (v: readonly string[]) => boolean
  active?: boolean
  onSelect?: () => void
  onSave: (v: readonly string[]) => void
  onRemove: () => void
}) {
  const [v, setV] = useState<readonly string[]>(cells)
  const ok = valid(v)
  const commit = () => { if (ok) onSave(v) }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { commit(); e.currentTarget.blur() }
    if (e.key === 'Escape') { setV(cells); e.currentTarget.blur() }
  }
  return (
    <tr
      onClick={onSelect}
      className={cn(active ? 'bg-accent-soft' : 'hover:bg-control/60')}
    >
      {names.map((name, k) => (
        <td key={k} className={cn(TD, k === 0 && active && 'shadow-mark')}>
          <input
            aria-label={name}
            value={v[k] ?? ''}
            spellCheck={false}
            className={cn(CELL, mono[k] === true && 'font-mono text-dense', !ok && 'text-error')}
            onFocus={onSelect}
            onChange={(e) => setV(v.map((x, i) => (i === k ? e.currentTarget.value : x)))}
            onKeyDown={onKey}
            onBlur={(e) => { if (leavesLine(e)) commit() }}
          />
        </td>
      ))}
      <td className={cn(TD, 'text-center')}>
        <button
          type="button"
          aria-label={`${cells[0] ?? ''} löschen`}
          title="Löschen"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="inline-flex h-[28px] items-center px-[8px] text-muted hover:text-error"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}

// The empty last line: one cell after the other with Tab, then Enter.
export function NewLine({ names, mono, valid, onAdd }: {
  names: readonly string[]
  mono: readonly boolean[]
  valid: (v: readonly string[]) => boolean
  onAdd: (v: readonly string[]) => boolean
}) {
  const empty = names.map(() => '')
  const [v, setV] = useState<readonly string[]>(empty)
  const ok = valid(v)
  const commit = () => {
    if (v.every((x) => x.trim() === '')) return
    if (onAdd(v)) setV(empty)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') { setV(empty); e.currentTarget.blur() }
  }
  return (
    <tr>
      {names.map((name, k) => (
        <td key={k} className={TD}>
          <input
            aria-label={name}
            value={v[k] ?? ''}
            spellCheck={false}
            className={cn(CELL, mono[k] === true && 'font-mono text-dense', !ok && 'text-error')}
            onChange={(e) => setV(v.map((x, i) => (i === k ? e.currentTarget.value : x)))}
            onKeyDown={onKey}
            onBlur={(e) => { if (leavesLine(e)) commit() }}
          />
        </td>
      ))}
      <td className={TD} />
    </tr>
  )
}
