import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Search } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { Badge } from './Badge'
import { LINE_CHOSEN, LINE_HOVER } from './lineLook'

interface ListEntry {
  value: string
  name: string

  badge?: string
  disabled?: boolean
}

export interface ListGroup {
  key: string
  name?: string
  badge?: string
  entries: readonly ListEntry[]
}

interface ListProps {
  groups: readonly ListGroup[]
  value: string

  // Several chosen at once; stands in for value.
  values?: readonly string[]

  emptyText?: string

  searchable?: boolean

  // Takes the room its parent leaves: the entries scroll below a standing search.
  fill?: boolean
  onChoose: (value: string) => void
}

// A line as in the small windows of the mask (.picker-row), hovered and chosen
// as every line of the editor (lineLook.ts).
const ROW = 'flex w-full items-baseline gap-[8px] rounded-[var(--radius-small)] px-[9px] py-[6px] text-left text-ui font-semibold transition-colors'

function fits(text: string, search: string): boolean {
  return text.toLowerCase().includes(search)
}

export function List({
  groups,
  value,
  values,
  emptyText,
  searchable = false,
  fill = false,
  onChoose,
}: ListProps) {
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (searchable) searchRef.current?.focus()
  }, [searchable])

  const wanted = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (wanted === '') return groups
    return groups
      .map((g) => ({
        ...g,
        entries: g.entries.filter((e) => fits(e.name, wanted) || fits(e.badge ?? '', wanted)),
      }))
      .filter((g) => g.entries.length > 0)
  }, [groups, wanted])

  return (
    <div className={cn('flex flex-col', fill && 'min-h-0 flex-1')}>
      {searchable && (
        // The search of the mask's capture (.cell): a soft ground, white with
        // the blue edge while it is typed into.
        <div className="mb-[4px] flex shrink-0 items-center gap-[6px] rounded border border-transparent bg-control px-[9px] transition-colors focus-within:border-accent focus-within:bg-panel focus-within:shadow-focus">
          <Search size={13} aria-hidden className="shrink-0 text-muted" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder="Suchen…"
            aria-label="Suchen"
            className="h-control min-w-0 flex-1 bg-transparent text-ui font-semibold text-ink outline-none placeholder:text-muted"
          />
        </div>
      )}

      <div className={cn('flex flex-col', fill && 'min-h-0 flex-1 overflow-y-auto')}>
      {emptyText !== undefined && wanted === '' && (
        <button
          type="button"
          onClick={() => onChoose('')}
          className={cn(ROW, 'text-muted hover:text-ink', LINE_HOVER, value === '' && LINE_CHOSEN)}
        >
          <span className="w-[12px] shrink-0 text-accent">{value === '' && <Check size={12} />}</span>
          <span className="min-w-0 flex-1 truncate">{emptyText}</span>
        </button>
      )}

      {filtered.map((g) => (
        <div key={g.key} className="flex flex-col">
          {g.name !== undefined && g.name !== '' && (
            <p className="flex items-baseline gap-[8px] px-[9px] pb-[2px] pt-[8px] text-dense font-semibold text-muted">
              <span className="min-w-0 truncate">{g.name}</span>
              {g.badge !== undefined && g.badge !== '' && (
                <Badge className="font-normal normal-case tracking-normal">{g.badge}</Badge>
              )}
            </p>
          )}
          {g.entries.map((e) => {
            const chosen = values ? values.includes(e.value) : e.value === value
            return (
              <button
                key={`${g.key}::${e.value}`}
                type="button"
                disabled={e.disabled}
                onClick={() => onChoose(e.value)}
                className={cn(
                  ROW,
                  e.disabled
                    ? 'cursor-not-allowed text-muted opacity-[.45]'
                    : cn('text-ink', LINE_HOVER),
                  chosen && LINE_CHOSEN,
                )}
              >
                <span className="w-[12px] shrink-0 text-accent">
                  {chosen && <Check size={12} />}
                </span>
                <span className="min-w-0 flex-1 truncate">{e.name}</span>
                {e.badge !== undefined && e.badge !== '' && (
                  <Badge className="max-w-[50%]">{e.badge}</Badge>
                )}
              </button>
            )
          })}
        </div>
      ))}
      </div>
    </div>
  )
}
