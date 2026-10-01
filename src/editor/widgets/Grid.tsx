import {
  createContext,
  useContext,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Trash2 } from '@/editor/icons/icon'
import { cn } from './cn'
import { OnEscape, useCloseOnEscape } from './useCloseOnEscape'

// A list as SoftEngine shows one: a strip that names it, a head, a line per
// entry with lines between rows and columns. A click marks the whole line, a
// double click types into it, the empty last line takes a new entry.

export interface GridColumn {
  name: string
  // Pixels; a column without takes what is left.
  width?: number
  mono?: boolean
  right?: boolean
}

export const TH = 'h-[26px] truncate border-b border-r border-line bg-control px-[10px] text-left text-dense font-semibold text-muted last:border-r-0'
export const TD = 'h-[29px] border-b border-r border-line/70 p-0 last:border-r-0'
const TEXT = 'block truncate px-[10px]'
const INPUT = 'h-[28px] w-full min-w-0 bg-transparent px-[10px] text-ui text-ink outline-none focus:bg-panel focus:shadow-cell'
// The marked line, as .is-aktiv: the whole line in the accent, the text white.
export const MARKED = 'bg-accent text-panel'
const BIN = 30

export function Strip({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex h-[30px] shrink-0 items-center gap-[8px] border-b border-line bg-control px-[12px] text-dense font-semibold text-muted">
      <span className="flex min-w-0 items-center gap-[8px] truncate">{children}</span>
      {right !== undefined && <span className="ml-auto flex shrink-0 items-center font-normal">{right}</span>}
    </div>
  )
}

interface Columns {
  columns: readonly GridColumn[]
  bin: boolean
}

const ColumnsOf = createContext<Columns>({ columns: [], bin: false })

// The table, as wide as its room; the head stays while the lines scroll. It
// fills the height left, or stands as high as its lines. A click below the
// lines lets go of the marked one.
export function Grid({ columns, bin = false, fill = true, onEmpty, children }: {
  columns: readonly GridColumn[]
  bin?: boolean
  fill?: boolean
  onEmpty?: () => void
  children: ReactNode
}) {
  return (
    <div
      className={cn('overflow-y-auto overflow-x-hidden', fill && 'min-h-0 flex-1')}
      onClick={(e) => { if (e.target === e.currentTarget) onEmpty?.() }}
    >
      <table className="w-full table-fixed border-collapse text-ui">
        <colgroup>
          {columns.map((c, k) => <col key={k} style={c.width === undefined ? undefined : { width: c.width }} />)}
          {bin && <col style={{ width: BIN }} />}
        </colgroup>
        <thead className="sticky top-0 z-[1]">
          <tr>
            {columns.map((c, k) => <th key={k} className={cn(TH, c.right && 'text-right')}>{c.name}</th>)}
            {bin && <th className={TH} />}
          </tr>
        </thead>
        <tbody>
          <ColumnsOf.Provider value={{ columns, bin }}>{children}</ColumnsOf.Provider>
        </tbody>
      </table>
    </div>
  )
}

// Focus that leaves the line, not just the cell.
const leavesLine = (e: FocusEvent<HTMLElement>): boolean =>
  !(e.currentTarget.closest('tr')?.contains(e.relatedTarget as Node | null) ?? false)

function Inputs({ names, draft, at, bad, onDraft, onEnter, onLeave, onEscape }: {
  names: readonly string[]
  draft: readonly string[]
  at: number
  bad: boolean
  onDraft: (draft: readonly string[]) => void
  onEnter: () => void
  onLeave: () => void
  onEscape: () => void
}) {
  const { columns } = useContext(ColumnsOf)
  useCloseOnEscape(onEscape)
  return columns.map((c, k) => (
    <td key={k} className={TD}>
      <input
        aria-label={names[k] ?? c.name}
        autoFocus={k === at}
        value={draft[k] ?? ''}
        spellCheck={false}
        className={cn(INPUT, c.mono && 'font-mono text-dense', c.right && 'text-right', bad && 'text-error')}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => onDraft(draft.map((x, i) => (i === k ? e.currentTarget.value : x)))}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          onEnter()
        }}
        onBlur={(e) => { if (leavesLine(e)) onLeave() }}
      />
    </td>
  ))
}

function Bin({ name, marked, onRemove }: { name: string; marked: boolean; onRemove?: () => void }) {
  return (
    <td className={cn(TD, 'text-center')}>
      {onRemove && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={name}
          title="Löschen"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className={cn(
            'inline-flex h-[28px] items-center px-[8px] opacity-0 group-hover:opacity-100',
            marked ? 'text-panel opacity-100 hover:text-error-soft' : 'text-muted hover:text-error',
          )}
        >
          <Trash2 size={13} />
        </button>
      )}
    </td>
  )
}

// A line of an entry. A click marks it whole; a double click, Enter or F2
// types into it, Enter or leaving the line saves, Escape takes back, and the
// line keeps the keys. What does not read stays red and is not saved. Up and
// down mark the next line.
export function GridLine({ cells, names = [], marked, tips = false, valid, onMark, onSave, onRemove, removeName }: {
  cells: readonly string[]
  names?: readonly string[]
  marked: boolean
  // Each cell shows its text when the pointer rests on it, for text cut short.
  tips?: boolean
  valid?: (v: readonly string[]) => boolean
  onMark: () => void
  // Without, the line can be marked but not typed into.
  onSave?: (v: readonly string[]) => void
  onRemove?: () => void
  removeName?: string
}) {
  const { columns, bin } = useContext(ColumnsOf)
  const [draft, setDraft] = useState<readonly string[] | null>(null)
  const [at, setAt] = useState(0)
  const row = useRef<HTMLTableRowElement>(null)
  const ok = draft === null || valid === undefined || valid(draft)
  const changed = draft !== null && draft.some((x, k) => x !== (cells[k] ?? ''))

  const edit = (k: number) => {
    if (!onSave) return
    setAt(k)
    setDraft(cells)
  }
  const save = () => {
    if (draft !== null && changed) onSave?.(draft)
    setDraft(null)
  }

  const onKey = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (draft !== null || e.target !== e.currentTarget) return
    const next = e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling
      : e.key === 'ArrowUp' ? e.currentTarget.previousElementSibling : null
    if (next instanceof HTMLElement && next.dataset.gridLine !== undefined) {
      e.preventDefault()
      next.focus()
    }
    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault()
      edit(0)
    }
  }

  return (
    <tr
      ref={row}
      data-grid-line
      tabIndex={marked ? 0 : -1}
      onFocus={onMark}
      onClick={onMark}
      onKeyDown={onKey}
      className={cn(
        'group cursor-default outline-none',
        draft !== null ? 'bg-panel' : marked ? MARKED : 'hover:bg-accent-soft',
      )}
    >
      {draft !== null
        ? (
            <Inputs
              names={names}
              draft={draft}
              at={at}
              bad={!ok}
              onDraft={setDraft}
              onEnter={() => { if (ok) { save(); row.current?.focus() } }}
              onLeave={() => (ok ? save() : setDraft(null))}
              onEscape={() => { setDraft(null); row.current?.focus() }}
            />
          )
        : columns.map((c, k) => (
            <td
              key={k}
              className={cn(TD, c.mono && 'font-mono text-dense', c.right && 'text-right')}
              title={tips ? cells[k] : undefined}
              onDoubleClick={() => edit(k)}
            >
              <span className={TEXT}>{cells[k]}</span>
            </td>
          ))}
      {bin && <Bin name={removeName ?? `${cells[0] ?? ''} löschen`} marked={marked && draft === null} onRemove={onRemove} />}
    </tr>
  )
}

// The empty last line: one cell after the other with Tab, then Enter. What
// cannot be added stays and turns red where it does not read.
export function GridNewLine({ names, valid, onAdd }: {
  names: readonly string[]
  valid: (v: readonly string[]) => boolean
  onAdd: (v: readonly string[]) => boolean
}) {
  const { columns, bin } = useContext(ColumnsOf)
  const empty = columns.map(() => '')
  const [v, setV] = useState<readonly string[]>(empty)
  const typed = v.some((x) => x.trim() !== '')
  const ok = !typed || valid(v)
  const add = () => {
    if (typed && onAdd(v)) setV(empty)
  }
  return (
    <tr>
      {columns.map((c, k) => (
        <td key={k} className={TD}>
          <input
            aria-label={names[k] ?? c.name}
            value={v[k] ?? ''}
            spellCheck={false}
            className={cn(INPUT, c.mono && 'font-mono text-dense', c.right && 'text-right', !ok && 'text-error')}
            onChange={(e) => setV(v.map((x, i) => (i === k ? e.currentTarget.value : x)))}
            onKeyDown={(e) => { if (e.key === 'Enter') add() }}
            onBlur={(e) => { if (leavesLine(e)) add() }}
          />
        </td>
      ))}
      {bin && <td className={TD} />}
      {typed && <OnEscape run={() => setV(empty)} />}
    </tr>
  )
}
