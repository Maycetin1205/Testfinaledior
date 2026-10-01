import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { ChevronDown, Plus, Trash2 } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { Grid, INPUT, MARKED, TD } from '@/editor/widgets/Grid'
import { List, type ListGroup } from '@/editor/widgets/List'
import { Popover } from '@/editor/widgets/Popover'
import { OnEscape } from '@/editor/widgets/useCloseOnEscape'
import type { Parameter } from '../../core/data/actions'
import type { RelationTemplate } from '../../core/data/relations'
import { adoptedField, fieldAdopt } from './fieldAdopt'
import {
  originEntries,
  originGroups,
  originName,
  originOf,
  placeEntry,
  placePicked,
  type PlaceChoices,
} from './placeChoices'

// What stands in the places of a relation: one per place of its syntax, then
// those added behind a relation that ends in "...".
export interface Filled {
  parameter: readonly Parameter[]
  extraParameter: readonly Parameter[]
}

const EMPTY: Parameter = { source: 'fixed', value: '' }

const COLUMNS = [
  { name: 'Nr.', width: 44, right: true },
  { name: 'Bezeichnung', width: 150 },
  { name: 'Herkunft', width: 240 },
  { name: 'Eingabe' },
]

// The relation as it goes out: a fixed value as it stands, every other value
// as its name in braces.
export function Result({ template, filled, choices }: { template: RelationTemplate; filled: Filled; choices: PlaceChoices }) {
  const all = [...filled.parameter, ...filled.extraParameter]
  return (
    <div className="break-all border-b border-line px-[12px] py-[9px] font-mono text-dense leading-[19px] text-muted">
      {template.verb}[{template.nr}
      {all.map((b, k) => {
        const entry = placeEntry(b, choices)
        return (
          <span key={k}>
            !
            {entry !== '' && <span className="font-semibold text-ink">{b.source === 'fixed' ? entry : `{${entry}}`}</span>}
          </span>
        )
      })}
      ]
    </div>
  )
}

type Open = { at: number; list: 'origin' | 'entry' } | null

// The places as SoftEngine resolves a relation: a line per place with its
// number, its name, where its value comes from and the value itself. First
// the origin, a short list of what the mask has; then the entry offers only
// what that origin holds, and a fixed value is just typed. A click on a line
// types into it; Enter and the arrows go on, F4 opens the choice.
export function Places({ template, filled, choices, extras = true, fill = true, onChange }: {
  template: RelationTemplate
  filled: Filled
  choices: PlaceChoices
  // Places may be added behind a relation that ends in "...".
  extras?: boolean
  fill?: boolean
  onChange: (filled: Filled) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  // An origin chosen whose entry is still to be picked.
  const [pending, setPending] = useState<{ at: number; origin: string } | null>(null)
  const [open, setOpen] = useState<Open>(null)
  const all = [...filled.parameter, ...filled.extraParameter]
  const fixedCount = filled.parameter.length
  const adopted = adoptedField(template, filled.parameter, choices.dataSources)

  const set = (i: number, b: Parameter) => onChange(i < fixedCount
    ? { ...filled, parameter: filled.parameter.map((x, k) => (k === i ? b : x)) }
    : { ...filled, extraParameter: filled.extraParameter.map((x, k) => (k === i - fixedCount ? b : x)) })
  const take = (i: number, value: string) => {
    setPending(null)
    setOpen(null)
    const picked = placePicked(value)
    if ('set' in picked) {
      set(i, picked.set)
      return
    }
    const source = choices.dataSources.find((s) => s.id === picked.adopt.sourceId)
    if (source) onChange({ ...filled, parameter: fieldAdopt(filled.parameter, template, source, picked.adopt.code) })
  }
  const chooseOrigin = (i: number, origin: string) => {
    setOpen(null)
    if (origin === 'fixed') {
      setPending(null)
      if (all[i]?.source !== 'fixed') set(i, EMPTY)
      return
    }
    // One entry is taken at once; more open right away beside it.
    const entries = originEntries(origin, choices).flatMap((g) => g.entries)
    if (entries.length === 1 && entries[0]) {
      take(i, entries[0].value)
      return
    }
    set(i, EMPTY)
    setPending({ at: i, origin })
    setOpen({ at: i, list: 'entry' })
  }
  const move = (from: number, by: number) => {
    const to = from + by
    if (to >= 0 && to < all.length) setSelected(to)
  }

  return (
    <Grid columns={COLUMNS} fill={fill}>
      {all.map((b, i) => {
        const raw = template.parameter[i] ?? '…'
        const origin = pending?.at === i ? pending.origin : originOf(b, raw, adopted)
        return (
          <PlaceLine
            key={i}
            nr={i + 1}
            raw={raw}
            binding={b}
            origin={origin}
            originText={originName(origin, choices, adopted?.label)}
            entry={pending?.at === i ? '' : placeEntry(b, choices)}
            on={selected === i}
            open={open?.at === i ? open.list : null}
            origins={() => originGroups(raw, choices)}
            entries={() => originEntries(origin, choices)}
            onSelect={() => {
              if (selected !== i) setPending(null)
              setSelected(i)
            }}
            onOpen={(list) => setOpen(list === null ? null : { at: i, list })}
            onOrigin={(o) => chooseOrigin(i, o)}
            onTake={(value) => take(i, value)}
            onType={(value) => set(i, { source: 'fixed', value })}
            onMove={(by) => move(i, by)}
            onDone={() => {
              setPending(null)
              setSelected(null)
            }}
            onRemove={i >= fixedCount
              ? () => {
                  onChange({ ...filled, extraParameter: filled.extraParameter.filter((_, k) => k !== i - fixedCount) })
                  setSelected(null)
                }
              : undefined}
          />
        )
      })}
      {extras && template.extraParameterAllowed === true && (
        <tr
          className="cursor-pointer text-muted hover:bg-accent-soft"
          onClick={() => {
            onChange({ ...filled, extraParameter: [...filled.extraParameter, EMPTY] })
            setSelected(all.length)
          }}
        >
          <td className={TD} />
          <td className={cn(TD, 'px-[10px]')} colSpan={3}>
            <span className="flex items-center gap-[8px]"><Plus size={13} className="text-accent" /> Stelle hinzufügen</span>
          </td>
        </tr>
      )}
    </Grid>
  )
}

// A cell that opens a short list: what it shows, and a chevron on the marked line.
function ChoiceCell({ label, on, open, groups, value, cellRef, onOpen, onChoose }: {
  label: ReactNode
  on: boolean
  open: boolean
  groups: () => ListGroup[]
  value: string
  cellRef: RefObject<HTMLButtonElement | null>
  onOpen: (open: boolean) => void
  onChoose: (value: string) => void
}) {
  return (
    <>
      <button
        ref={cellRef}
        type="button"
        tabIndex={on ? 0 : -1}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          onOpen(!open)
        }}
        className="flex h-[28px] w-full min-w-0 items-center gap-[6px] px-[10px] text-left outline-none"
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {on && <ChevronDown size={13} aria-hidden className="shrink-0 opacity-80" />}
      </button>
      {open && (
        <Popover name="Wahl" anchor={cellRef} width={280} level={70} onClose={() => onOpen(false)}>
          <List searchable groups={groups()} value={value} onChoose={onChoose} />
        </Popover>
      )}
    </>
  )
}

function PlaceLine({
  nr, raw, binding, origin, originText, entry, on, open, origins, entries,
  onSelect, onOpen, onOrigin, onTake, onType, onMove, onDone, onRemove,
}: {
  nr: number
  raw: string
  binding: Parameter
  origin: string
  originText: string
  entry: string
  on: boolean
  open: 'origin' | 'entry' | null
  origins: () => ListGroup[]
  entries: () => ListGroup[]
  onSelect: () => void
  onOpen: (list: 'origin' | 'entry' | null) => void
  onOrigin: (origin: string) => void
  onTake: (value: string) => void
  onType: (value: string) => void
  onMove: (by: number) => void
  onDone: () => void
  onRemove?: () => void
}) {
  const originRef = useRef<HTMLButtonElement>(null)
  const entryRef = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  // A fixed value, a field's position typed in, or nothing yet: typed in place.
  const typed = origin === '' || origin === 'fixed' || (origin.startsWith('adopt:') && binding.source === 'fixed' && binding.value !== '')
  const chosen = !typed && origin !== 'previous' && origin !== 'var'
  useEffect(() => { if (on && typed && open === null) input.current?.focus() }, [on, typed, open])

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); onMove(1) }
    if (e.key === 'ArrowUp') { e.preventDefault(); onMove(-1) }
    if (e.key === 'F4') { e.preventDefault(); onOpen('origin') }
  }

  return (
    <tr onClick={onSelect} className={cn('group cursor-default', on ? MARKED : 'hover:bg-accent-soft')}>
      {on && open === null && <OnEscape run={onDone} />}
      <td className={cn(TD, 'px-[10px] text-right font-mono text-dense', !on && 'text-muted')}>{nr}</td>
      <td className={cn(TD, 'truncate px-[10px] font-mono text-dense')} title={raw}>{raw}</td>
      <td className={cn(TD, !on && 'text-muted')}>
        {on
          ? (
              <ChoiceCell
                label={originText}
                on={on}
                open={open === 'origin'}
                groups={origins}
                value={origin}
                cellRef={originRef}
                onOpen={(o) => onOpen(o ? 'origin' : null)}
                onChoose={onOrigin}
              />
            )
          : <span className="block truncate px-[10px]">{originText}</span>}
      </td>
      <td className={cn(TD, 'relative', on && typed && 'bg-panel text-ink')}>
        {on && typed
          ? (
              <input
                ref={input}
                aria-label={`${nr} ${raw}`}
                value={binding.source === 'fixed' ? binding.value : ''}
                placeholder={raw}
                spellCheck={false}
                onChange={(e) => onType(e.currentTarget.value)}
                onKeyDown={onKey}
                className={cn(INPUT, 'placeholder:font-mono placeholder:text-dense placeholder:text-muted/60')}
              />
            )
          : on && chosen
            ? (
                <ChoiceCell
                  label={entry}
                  on={on}
                  open={open === 'entry'}
                  groups={entries}
                  value=""
                  cellRef={entryRef}
                  onOpen={(o) => onOpen(o ? 'entry' : null)}
                  onChoose={onTake}
                />
              )
            : entry === ''
              ? <span className="block truncate px-[10px] font-mono text-dense opacity-40">{raw}</span>
              : <span className="block truncate px-[10px]">{entry}</span>}
        {on && onRemove && (
          <button
            type="button"
            aria-label={`Stelle ${nr} entfernen`}
            title="Stelle entfernen"
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="absolute inset-y-0 right-0 flex items-center px-[8px] text-muted hover:text-error"
          >
            <Trash2 size={13} />
          </button>
        )}
      </td>
    </tr>
  )
}
