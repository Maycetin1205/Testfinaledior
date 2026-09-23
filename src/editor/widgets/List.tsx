import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Search } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { Badge } from './Badge'

export interface ListEntry {
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

export interface ListProps {
  groups: readonly ListGroup[]
  value: string

  emptyText?: string

  searchable?: boolean
  onChoose: (value: string) => void
}

const ROW = 'flex w-full items-baseline gap-3 rounded px-2 py-1 text-left text-ui transition-colors'

function fits(text: string, search: string): boolean {
  return text.toLowerCase().includes(search)
}

export function List({
  groups,
  value,
  emptyText,
  searchable = false,
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
    <div className="flex flex-col">
      {searchable && (
        <div className="flex items-center gap-1.5 border-b border-line px-2 py-1">
          <Search size={13} aria-hidden className="shrink-0 text-muted" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder="Suchen…"
            aria-label="Suchen"
            className="h-control min-w-0 flex-1 bg-transparent text-ui text-ink outline-none placeholder:text-muted"
          />
        </div>
      )}

      {emptyText !== undefined && wanted === '' && (
        <button
          type="button"
          onClick={() => onChoose('')}
          className={cn(ROW, 'text-muted hover:bg-control hover:text-ink',
            value === '' && 'font-medium text-ink')}
        >
          <span className="w-3 shrink-0">{value === '' && <Check size={12} />}</span>
          <span className="min-w-0 flex-1 truncate">{emptyText}</span>
        </button>
      )}

      {filtered.map((g) => (
        <div key={g.key} className="flex flex-col">
          {g.name !== undefined && g.name !== '' && (
            <p className="flex items-baseline gap-2 px-2 pb-0.5 pt-1.5 text-dense font-semibold uppercase tracking-wide text-muted">
              <span className="min-w-0 truncate">{g.name}</span>
              {g.badge !== undefined && g.badge !== '' && (
                <Badge className="font-normal normal-case tracking-normal">{g.badge}</Badge>
              )}
            </p>
          )}
          {g.entries.map((e) => {
            const chosen = e.value === value
            return (
              <button
                key={`${g.key}::${e.value}`}
                type="button"
                disabled={e.disabled}
                onClick={() => onChoose(e.value)}
                className={cn(
                  ROW,
                  e.disabled
                    ? 'cursor-not-allowed text-muted opacity-50'
                    : 'text-ink hover:bg-control',
                  chosen && 'bg-accent/15 font-medium',
                )}
              >
                <span className="w-3 shrink-0 text-accent">
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
  )
}
