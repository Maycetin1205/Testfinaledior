import { useRef } from 'react'
import { Trash2 } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { INPUT, MARKED, TD } from '@/editor/widgets/Grid'
import { Segment } from '@/editor/widgets/Segment'
import type { Term } from '../../core/data/calculation'
import { ChoiceCell } from '../origin/ChoiceCell'
import { encodeOrigin } from '../origin/origins'
import { entryGroups, originGroups, originText, pairsText, type Names } from './calculationWords'

// A term as a line: its number, × or ÷, where it comes from and what it
// reads there; a fixed number is typed in place.
export function TermLine({
  nr, term, names, origin, entry, on, open,
  onSelect, onOpen, onSign, onOrigin, onTake, onType, onRemove,
}: {
  nr: number
  term: Term
  names: Names
  origin: string
  entry: string
  on: boolean
  open: 'origin' | 'entry' | null
  onSelect: () => void
  onOpen: (list: 'origin' | 'entry' | null) => void
  onSign: (divides: boolean) => void
  onOrigin: (key: string) => void
  onTake: (value: string) => void
  onType: (value: string) => void
  onRemove: () => void
}) {
  const originRef = useRef<HTMLButtonElement>(null)
  const entryRef = useRef<HTMLButtonElement>(null)
  const typed = origin === 'fixed'
  const listed = origin === 'row' || origin.startsWith('helper:')
  const sign = term.divides ? '÷' : '×'

  return (
    <tr onClick={onSelect} className={cn('group cursor-default', on ? MARKED : 'hover:bg-accent-soft')}>
      <td className={cn(TD, 'px-[10px] text-right font-mono text-dense', !on && 'text-muted')}>{nr}</td>
      <td className={cn(TD, 'px-[6px]')}>
        {on
          ? (
              <Segment
                name="Zeichen"
                options={[{ value: 'times', name: '×' }, { value: 'divides', name: '÷' }]}
                value={term.divides ? 'divides' : 'times'}
                onChoose={(v) => onSign(v === 'divides')}
              />
            )
          : <span className="block px-[4px] font-mono">{sign}</span>}
      </td>
      <td className={cn(TD, !on && 'text-muted')}>
        {on
          ? (
              <ChoiceCell
                label={originText(origin, names)}
                on={on}
                open={open === 'origin'}
                groups={() => originGroups(names)}
                value={origin}
                cellRef={originRef}
                onOpen={(o) => onOpen(o ? 'origin' : null)}
                onChoose={onOrigin}
              />
            )
          : <span className="block truncate px-[10px]">{originText(origin, names)}</span>}
      </td>
      <td className={cn(TD, 'relative', on && typed && 'bg-panel text-ink')}>
        {on && typed
          ? (
              <input
                aria-label={`Größe ${nr}`}
                autoFocus
                inputMode="decimal"
                value={term.kind === 'fixed' ? term.value : ''}
                spellCheck={false}
                onChange={(e) => onType(e.currentTarget.value)}
                className={cn(INPUT, 'font-mono')}
              />
            )
          : on && listed
            ? (
                <ChoiceCell
                  label={entry}
                  on={on}
                  open={open === 'entry'}
                  groups={() => entryGroups(origin, names)}
                  value={term.kind === 'units' ? '' : encodeOrigin(term)}
                  cellRef={entryRef}
                  onOpen={(o) => onOpen(o ? 'entry' : null)}
                  onChoose={onTake}
                />
              )
            : (
                <span className={cn('block truncate px-[10px]', term.kind === 'units' && !on && 'text-muted')}>
                  {term.kind === 'units' ? pairsText(term) : entry}
                </span>
              )}
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Größe ${nr} entfernen`}
          title="Entfernen"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className={cn(
            'absolute inset-y-0 right-0 flex items-center px-[8px]',
            on ? 'bg-accent text-panel hover:text-error-soft' : 'hidden bg-accent-soft text-muted hover:text-error group-hover:flex',
          )}
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}
