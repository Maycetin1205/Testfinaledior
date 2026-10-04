import { useRef, useState } from 'react'
import { Plus, Trash2 } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { Grid, GridLine, GridNewLine, INPUT, MARKED, Strip, TD } from '@/editor/widgets/Grid'
import type { ListGroup } from '@/editor/widgets/List'
import { Segment } from '@/editor/widgets/Segment'
import { Window } from '@/editor/widgets/Window'
import { capability } from '../../core/block/capability'
import { blockType } from '../../core/block/registry'
import { sourcesInReach } from '../../core/block/sourcesInReach'
import {
  calculationsFrom,
  newCalculation,
  toldFrom,
  DECIMALS_MAX,
  type Calculation,
  type Term,
  type UnitsTerm,
} from '../../core/data/calculation'
import type { SourceInReach } from '../../core/data/extraSources'
import { asNumber, numberText } from '../../core/data/number'
import { ORIGIN_KINDS, type ValueOrigin } from '../../core/data/valueOrigin'
import { ChoiceCell } from '../actions/Places'
import { PickerControl } from '../controls/PickerControl'
import { decodeOrigin, encodeOrigin } from '../controls/originOffer'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useView } from '../state/useView'

interface ColumnHead {
  key: string
  title: string
}

interface Names {
  // The column the sentence is told from.
  lead: string
  columns: readonly ColumnHead[]
  sources: readonly SourceInReach[]
}

const FIXED = 'Feste Zahl'
const UNITS = 'Faktor aus zwei Einheiten'

const COLUMNS = [
  { name: 'Nr.', width: 44, right: true },
  { name: 'Zeichen', width: 72 },
  { name: 'Herkunft', width: 240 },
  { name: 'Eingabe' },
]

const PAIR_COLUMNS = [
  { name: 'Einheit 1' },
  { name: 'Einheit 2' },
  { name: 'Faktor', width: 110, right: true },
]

const EMPTY_TERM: Term = { kind: 'fixed', value: '', divides: false }

// ----- words -----

function columnTitle(names: Names, key: string): string {
  return names.columns.find((c) => c.key === key)?.title || key
}

function originName(origin: ValueOrigin, names: Names): string {
  switch (origin.kind) {
    case 'row':
      return columnTitle(names, origin.value)
    case 'helper': {
      const source = names.sources.find((q) => q.source.id === origin.sourceId)?.source
      return source?.fields.find((f) => f.code === origin.value)?.name || origin.value
    }
    case 'fixed':
      return origin.value
    default:
      return ''
  }
}

function pairsText(term: UnitsTerm): string {
  return term.table.map((p) => `${p.first}/${p.second} ${numberText(p.factor, DECIMALS_MAX)}`).join(', ')
}

function termName(term: Term, names: Names): string {
  if (term.kind !== 'units') return originName(term, names)
  const first = term.first === undefined ? '' : originName(term.first, names)
  const second = term.second === undefined ? '' : originName(term.second, names)
  return first !== '' && second !== '' ? `Faktor(${first}/${second})` : 'Faktor'
}

// The sentence as the column head would say it.
function sentenceText(b: Calculation, names: Names): string {
  const words = b.terms.map((t, i) => {
    const sign = t.divides ? '÷' : '×'
    const name = termName(t, names)
    return i === 0 && !t.divides ? name : `${sign} ${name}`
  })
  const lead = columnTitle(names, b.lead)
  if (words.length === 0) return `${lead} =`
  return `${lead} = ${words.join(' ')}, gerundet auf ${b.decimals} Stellen`
}

// ----- where a term comes from, in two steps: the origin, then the entry -----

const originKey = (term: Term): string => {
  switch (term.kind) {
    case 'row': return 'row'
    case 'helper': return `helper:${term.sourceId ?? ''}`
    case 'fixed': return 'fixed'
    case 'units': return 'units'
    default: return ''
  }
}

function originGroups(names: Names): ListGroup[] {
  return [
    {
      key: 'mask',
      entries: [
        { value: 'row', name: ORIGIN_KINDS.row },
        ...names.sources.slice(1).map((q) => ({ value: `helper:${q.source.id}`, name: q.source.name })),
      ],
    },
    { key: 'more', entries: [{ value: 'fixed', name: FIXED }, { value: 'units', name: UNITS }] },
  ]
}

function originText(key: string, names: Names): string {
  if (key === 'row') return ORIGIN_KINDS.row
  if (key === 'fixed') return FIXED
  if (key === 'units') return UNITS
  const id = key.slice('helper:'.length)
  return names.sources.find((q) => q.source.id === id)?.source.name ?? ''
}

// The columns of the row but the lead, or the fields of one helper source.
function entryGroups(key: string, names: Names, lead: boolean): ListGroup[] {
  if (key === 'row') {
    return [{
      key,
      entries: names.columns
        .filter((c) => !lead || c.key !== names.lead)
        .map((c) => ({ value: encodeOrigin({ kind: 'row', value: c.key }), name: c.title || c.key })),
    }]
  }
  const id = key.slice('helper:'.length)
  const source = names.sources.find((q) => q.source.id === id)?.source
  return source === undefined ? [] : [{
    key,
    entries: source.fields.map((f) => ({
      value: encodeOrigin({ kind: 'helper', sourceId: id, value: f.code }),
      name: f.name || f.code,
      badge: f.code,
    })),
  }]
}

const unitGroups = (names: Names): ListGroup[] => [
  ...entryGroups('row', names, false).map((g) => ({ ...g, name: ORIGIN_KINDS.row })),
  ...names.sources.slice(1).flatMap((q) => entryGroups(`helper:${q.source.id}`, names, false)
    .map((g) => ({ ...g, name: q.source.name }))),
]

// ----- the window -----

// The open calculation window, drawn beside the mask so that closing the
// bar keeps it. It shows the sentence of the column it was opened at, told
// from that column.
export function OpenCalculationWindow() {
  const ed = useEditor()
  const open = useView().calculationWindow
  const library = useDataSources().list
  if (open === null) return null
  const block = ed.tree[open.blockId]
  const def = block === undefined ? undefined : blockType(block.type)
  const prop = capability(def, 'compute')?.prop
  const binding = capability(def, 'list')?.binding
  if (block === undefined || prop === undefined || binding === undefined) return null

  const columns = binding.entries(block.values[binding.prop]).flatMap((e): ColumnHead[] => {
    const key = binding.keyOf?.(e) ?? ''
    return key === '' ? [] : [{ key, title: binding.titleOf(e) }]
  })
  const all = calculationsFrom(block.values[prop])
  const present = all.flatMap((b) => {
    const told = toldFrom(b, open.column)
    return told === null ? [] : [told]
  })[0]
  const own = present ?? newCalculation(all, open.column)
  const close = (): void => ed.openCalculation(null)

  return (
    <CalculationWindow
      key={`${open.blockId}:${open.column}:${own.key}`}
      calculation={own}
      names={{ lead: open.column, columns, sources: sourcesInReach(ed.tree, block.id, library) }}
      onApply={(next) => {
        ed.updateProperty(block.id, prop, present === undefined
          ? [...all, next]
          : all.map((b) => (b.key === next.key ? next : b)))
        close()
      }}
      onRemove={present === undefined ? undefined : () => {
        ed.updateProperty(block.id, prop, all.filter((b) => b.key !== own.key))
        close()
      }}
      onClose={close}
    />
  )
}

// The window of one sentence, like the one of a step: the terms as lines
// with their number, sign, origin and entry; on the right the sentence, the
// rounding and the table of a unit factor. Nothing reaches the mask before
// "Übernehmen".
function CalculationWindow({ calculation, names, onApply, onRemove, onClose }: {
  calculation: Calculation
  names: Names
  onApply: (b: Calculation) => void
  onRemove?: () => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(calculation)
  const [selected, setSelected] = useState<number | null>(null)
  const [pending, setPending] = useState<{ at: number; origin: string } | null>(null)
  const [open, setOpen] = useState<{ at: number; list: 'origin' | 'entry' } | null>(null)

  const terms = draft.terms
  const setTerms = (next: Term[]): void => setDraft({ ...draft, terms: next })
  const setTerm = (i: number, term: Term): void => setTerms(terms.map((t, k) => (k === i ? term : t)))

  const chooseOrigin = (i: number, key: string): void => {
    setOpen(null)
    const divides = terms[i]?.divides ?? false
    if (key === 'fixed') {
      setPending(null)
      if (terms[i]?.kind !== 'fixed') setTerm(i, { kind: 'fixed', value: '', divides })
      return
    }
    if (key === 'units') {
      setPending(null)
      if (terms[i]?.kind !== 'units') setTerm(i, { kind: 'units', table: [], divides })
      return
    }
    setPending({ at: i, origin: key })
    setOpen({ at: i, list: 'entry' })
  }
  const takeEntry = (i: number, value: string): void => {
    setPending(null)
    setOpen(null)
    setTerm(i, { ...decodeOrigin(value), divides: terms[i]?.divides ?? false })
  }

  // The unit factor on the right: the marked one, else the first.
  const unitsAt = selected !== null && terms[selected]?.kind === 'units'
    ? selected
    : terms.findIndex((t) => t.kind === 'units')
  const units = terms[unitsAt]
  const complete = terms.filter((t) => !(t.kind === 'fixed' && t.value.trim() === ''))
  const ready = complete.length > 0 && complete.every((t) => t.kind !== 'fixed' || asNumber(t.value) !== null)
  const finished: Calculation = { ...draft, terms: complete }

  return (
    <Window
      title="Berechnung"
      beside={(
        <span className="min-w-0 truncate border-l border-line pl-[14px] font-mono text-dense text-muted">
          {sentenceText(finished, names)}
        </span>
      )}
      width={1040}
      height={640}
      level={50}
      foot={(
        <>
          {onRemove !== undefined && (
            <Button kind="risk" className="mr-auto" onClick={onRemove}>Berechnung entfernen</Button>
          )}
          <Button onClick={onClose}>Abbrechen</Button>
          <Button kind="primary" disabled={!ready} onClick={() => onApply(finished)}>Übernehmen</Button>
        </>
      )}
      onClose={onClose}
    >
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-0 flex-col border-r border-line">
          <Strip right={`${complete.length} Größen`}>Satz</Strip>
          <Grid columns={COLUMNS} onEmpty={() => setSelected(null)}>
            <tr className="cursor-default">
              <td className={TD} />
              <td className={cn(TD, 'px-[10px] font-mono text-dense text-muted')}>=</td>
              <td className={cn(TD, 'px-[10px] text-muted')}>{ORIGIN_KINDS.row}</td>
              <td className={cn(TD, 'truncate px-[10px] font-semibold')}>{columnTitle(names, draft.lead)}</td>
            </tr>
            {terms.map((term, i) => (
              <TermLine
                key={i}
                nr={i + 1}
                term={term}
                names={names}
                origin={pending?.at === i ? pending.origin : originKey(term)}
                entry={pending?.at === i ? '' : termName(term, names)}
                on={selected === i}
                open={open?.at === i ? open.list : null}
                onSelect={() => {
                  if (selected !== i) setPending(null)
                  setSelected(i)
                }}
                onOpen={(list) => setOpen(list === null ? null : { at: i, list })}
                onSign={(divides) => setTerm(i, { ...term, divides })}
                onOrigin={(key) => chooseOrigin(i, key)}
                onTake={(value) => takeEntry(i, value)}
                onType={(value) => setTerm(i, { kind: 'fixed', value, divides: term.divides })}
                onRemove={() => {
                  setTerms(terms.filter((_, k) => k !== i))
                  setSelected(null)
                  setPending(null)
                }}
              />
            ))}
            <tr
              className="cursor-pointer text-muted hover:bg-accent-soft"
              onClick={() => {
                setTerms([...terms, EMPTY_TERM])
                setSelected(terms.length)
                setOpen({ at: terms.length, list: 'origin' })
              }}
            >
              <td className={TD} />
              <td className={cn(TD, 'px-[10px]')} colSpan={3}>
                <span className="flex items-center gap-[8px]"><Plus size={13} className="text-accent" /> Größe hinzufügen</span>
              </td>
            </tr>
          </Grid>
        </div>
        <div className="flex min-h-0 flex-col overflow-y-auto">
          <Strip>Ergebnis</Strip>
          <div className="break-words border-b border-line px-[12px] py-[9px] font-mono text-dense leading-[19px] text-ink">
            {sentenceText(finished, names)}
          </div>
          <Strip>Rundung</Strip>
          <div className="grid grid-cols-[112px_72px] items-center gap-[8px] border-b border-line px-[12px] py-[8px]">
            <span className="text-dense text-muted">Stellen</span>
            <input
              aria-label="Stellen"
              inputMode="numeric"
              value={draft.decimals}
              onChange={(e) => {
                const decimals = Number.parseInt(e.currentTarget.value, 10)
                if (Number.isInteger(decimals) && decimals >= 0 && decimals <= DECIMALS_MAX) {
                  setDraft({ ...draft, decimals })
                }
              }}
              className="h-control rounded border border-line bg-panel px-[8px] text-right font-mono text-ui outline-none focus:border-accent"
            />
          </div>
          {units?.kind === 'units' && (
            <UnitsPane
              term={units}
              names={names}
              onChange={(next) => setTerm(unitsAt, next)}
            />
          )}
        </div>
      </div>
    </Window>
  )
}

// A term as a line: its number, × or ÷, where it comes from and what it
// reads there; a fixed number is typed in place.
function TermLine({
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
                  groups={() => entryGroups(origin, names, true)}
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

// The two units the factor follows and the table that gives it for each
// pair; a pair the table does not hold counts 1.
function UnitsPane({ term, names, onChange }: {
  term: UnitsTerm
  names: Names
  onChange: (term: UnitsTerm) => void
}) {
  const [marked, setMarked] = useState<number | null>(null)
  const groups = unitGroups(names)
  const pairFrom = (v: readonly string[]) => ({ first: v[0].trim(), second: v[1].trim(), factor: asNumber(v[2]) ?? 1 })
  const valid = (v: readonly string[]): boolean => asNumber(v[2]) !== null
  return (
    <>
      <Strip>{UNITS}</Strip>
      <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-[8px] border-b border-line px-[12px] py-[8px]">
        <span className="text-dense text-muted">Einheit 1</span>
        <PickerControl
          name="Einheit 1"
          className="w-full"
          groups={groups}
          value={term.first === undefined ? '' : encodeOrigin(term.first)}
          placeholder=""
          onChoose={(v) => onChange({ ...term, first: decodeOrigin(v) })}
        />
        <span className="text-dense text-muted">Einheit 2</span>
        <PickerControl
          name="Einheit 2"
          className="w-full"
          groups={groups}
          value={term.second === undefined ? '' : encodeOrigin(term.second)}
          placeholder=""
          onChoose={(v) => onChange({ ...term, second: decodeOrigin(v) })}
        />
      </div>
      <Strip right={term.table.length}>Tabelle</Strip>
      <Grid columns={PAIR_COLUMNS} fill={false} onEmpty={() => setMarked(null)}>
        {term.table.map((p, i) => (
          <GridLine
            key={i}
            cells={[p.first, p.second, numberText(p.factor, DECIMALS_MAX)]}
            marked={marked === i}
            valid={valid}
            onMark={() => setMarked(i)}
            onSave={(v) => onChange({ ...term, table: term.table.map((q, k) => (k === i ? pairFrom(v) : q)) })}
            onRemove={() => {
              onChange({ ...term, table: term.table.filter((_, k) => k !== i) })
              setMarked(null)
            }}
            removeName={`Zeile ${i + 1} löschen`}
          />
        ))}
        <GridNewLine
          names={['Einheit 1', 'Einheit 2', 'Faktor']}
          valid={valid}
          onAdd={(v) => {
            onChange({ ...term, table: [...term.table, pairFrom(v)] })
            return true
          }}
        />
      </Grid>
    </>
  )
}
