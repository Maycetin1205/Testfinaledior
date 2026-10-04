import { Fragment, useRef, useState, type RefObject } from 'react'
import { Plus, Trash2, X } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { Field } from '@/editor/widgets/Field'
import { List } from '@/editor/widgets/List'
import { MenuRow } from '@/editor/widgets/MenuRow'
import { NumberInput } from '@/editor/widgets/NumberInput'
import { Popover } from '@/editor/widgets/Popover'
import { Separator } from '@/editor/widgets/Separator'
import type { BlockNode } from '../../core/block/tree'
import {
  calculationsFrom,
  newCalculation,
  toldFrom,
  DECIMALS_MAX,
  type Calculation,
  type Term,
  type UnitPair,
  type UnitsTerm,
} from '../../core/data/calculation'
import type { SourceInReach } from '../../core/data/extraSources'
import { asNumber, numberText } from '../../core/data/number'
import { ORIGIN_KINDS, type ValueOrigin } from '../../core/data/valueOrigin'
import { OriginPicker } from '../controls/OriginPicker'
import { decodeOrigin, encodeOrigin, originGroups, type OriginOffer } from '../controls/originOffer'
import type { EditorStore } from '../state/EditorStore'
import { Labeled } from './Labeled'

interface ColumnHead {
  key: string
  title: string
}

const UNITS_LABEL = 'Faktor aus zwei Einheiten'

// What a term is called in the sentence: the column's title, the field with
// its source, the typed number.
function originName(origin: ValueOrigin, columns: readonly ColumnHead[], sources: readonly SourceInReach[]): string {
  switch (origin.kind) {
    case 'row':
      return columns.find((c) => c.key === origin.value)?.title || origin.value
    case 'helper': {
      const source = sources.find((q) => q.source.id === origin.sourceId)?.source
      const field = source?.fields.find((f) => f.code === origin.value)?.name || origin.value
      return source ? `${field} · ${source.name}` : field
    }
    case 'fixed':
      return origin.value
    default:
      return ''
  }
}

function termName(term: Term, columns: readonly ColumnHead[], sources: readonly SourceInReach[]): string {
  if (term.kind !== 'units') return originName(term, columns, sources)
  const first = term.first === undefined ? '' : originName(term.first, columns, sources)
  const second = term.second === undefined ? '' : originName(term.second, columns, sources)
  return first !== '' && second !== '' ? `Faktor ${first} / ${second}` : 'Faktor'
}

// A term takes its value from a column of the row or a field of a helper
// source; a term of the sentence also from a typed number.
function offerFor(
  columns: readonly ColumnHead[],
  sources: readonly SourceInReach[],
  except: string,
  fixed: boolean,
): OriginOffer {
  return {
    row: columns
      .filter((c) => c.key !== except)
      .map((c) => ({ value: c.key, name: c.title || c.key })),
    helpers: sources.slice(1).map((q) => ({
      sourceId: q.source.id,
      name: q.source.name,
      fields: q.source.fields.map((f) => ({ value: f.code, name: f.name || f.code, badge: f.code })),
    })),
    fixed,
  }
}

// Where a term takes its value from, chosen at the term itself: a column, a
// field, a typed number or the factor of two units; and the way out.
function TermPicker({ anchor, offer, term, onTerm, onRemove, onClose }: {
  anchor: RefObject<HTMLElement | null>
  offer: OriginOffer
  term: Term | null
  onTerm: (term: Term) => void
  onRemove?: () => void
  onClose: () => void
}) {
  const divides = term?.divides ?? false
  const chosen = term === null || term.kind === 'units' ? '' : encodeOrigin(term)
  return (
    <Popover name="Größe" anchor={anchor} width={380} maxHeight={405} onClose={onClose}>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <List
          fill
          searchable
          groups={originGroups(offer)}
          value={chosen}
          onChoose={(v) => onTerm({ ...decodeOrigin(v), divides })}
        />
        <div className="flex shrink-0 flex-col gap-1 px-1.5">
          <span className="text-dense font-semibold text-muted">{ORIGIN_KINDS.fixed}</span>
          <Field
            aria-label={ORIGIN_KINDS.fixed}
            inputMode="decimal"
            defaultValue={term?.kind === 'fixed' ? term.value : ''}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              const value = e.currentTarget.value.trim()
              if (asNumber(value) !== null) onTerm({ kind: 'fixed', value, divides })
            }}
          />
        </div>
        <Separator className="shrink-0" />
        <MenuRow className="shrink-0" onClick={() => onTerm({ kind: 'units', table: [], divides })}>
          {UNITS_LABEL}
        </MenuRow>
        {onRemove !== undefined && (
          <div className="flex shrink-0 items-center justify-end border-t border-line px-1.5 pt-1.5">
            <Button kind="risk" onClick={onRemove}>Entfernen</Button>
          </div>
        )}
      </div>
    </Popover>
  )
}

// The two units the factor follows, and the table that gives the factor for
// each pair of them; a pair the table does not hold counts 1.
function UnitsPicker({ anchor, offer, term, onTerm, onRemove, onClose }: {
  anchor: RefObject<HTMLElement | null>
  offer: OriginOffer
  term: UnitsTerm
  onTerm: (term: UnitsTerm) => void
  onRemove: () => void
  onClose: () => void
}) {
  const setPair = (at: number, part: Partial<UnitPair>): void => {
    onTerm({ ...term, table: term.table.map((p, i) => (i === at ? { ...p, ...part } : p)) })
  }
  return (
    <Popover name={UNITS_LABEL} anchor={anchor} width={380} maxHeight={405} onClose={onClose}>
      <div className="flex flex-col gap-[6px] p-1">
        <Labeled label="Einheit 1">
          <OriginPicker
            name="Einheit 1"
            className="w-full"
            origin={term.first ?? null}
            offer={offer}
            onChoose={(first) => onTerm({ ...term, first })}
          />
        </Labeled>
        <Labeled label="Einheit 2">
          <OriginPicker
            name="Einheit 2"
            className="w-full"
            origin={term.second ?? null}
            offer={offer}
            onChoose={(second) => onTerm({ ...term, second })}
          />
        </Labeled>
        <Separator />
        {/* A new row resets the rows below it, so each one keeps to its pair. */}
        {term.table.map((pair, i) => (
          <div key={`${i}-${term.table.length}`} className="grid grid-cols-[1fr_1fr_96px_24px] items-center gap-[4px]">
            <Field
              aria-label="Einheit 1"
              defaultValue={pair.first}
              onBlur={(e) => setPair(i, { first: e.currentTarget.value.trim() })}
            />
            <Field
              aria-label="Einheit 2"
              defaultValue={pair.second}
              onBlur={(e) => setPair(i, { second: e.currentTarget.value.trim() })}
            />
            <NumberInput
              aria-label="Faktor"
              defaultValue={numberText(pair.factor, DECIMALS_MAX)}
              onBlur={(e) => {
                const factor = asNumber(e.currentTarget.value)
                if (factor !== null) setPair(i, { factor })
              }}
            />
            <Button
              onlyIcon
              aria-label="Zeile wegnehmen"
              onClick={() => onTerm({ ...term, table: term.table.filter((_, k) => k !== i) })}
            >
              <X size={13} />
            </Button>
          </div>
        ))}
        <Button
          className="self-start"
          onClick={() => onTerm({ ...term, table: [...term.table, { first: '', second: '', factor: 1 }] })}
        >
          <Plus size={13} aria-hidden />
          Zeile
        </Button>
        <div className="flex items-center justify-end border-t border-line pt-1.5">
          <Button kind="risk" onClick={onRemove}>Entfernen</Button>
        </div>
      </div>
    </Popover>
  )
}

// A term of the sentence: its name, and on a click the choice of what it reads.
function TermChip({ term, name, offer, unitOffer, onTerm, onRemove }: {
  term: Term
  name: string
  offer: OriginOffer
  unitOffer: OriginOffer
  onTerm: (term: Term) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  return (
    <>
      <Button ref={button} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>
        {name}
      </Button>
      {open && term.kind === 'units' && (
        <UnitsPicker
          anchor={button}
          offer={unitOffer}
          term={term}
          onTerm={onTerm}
          onRemove={onRemove}
          onClose={() => setOpen(false)}
        />
      )}
      {open && term.kind !== 'units' && (
        <TermPicker
          anchor={button}
          offer={offer}
          term={term}
          onTerm={(next) => {
            onTerm(next)
            if (next.kind !== 'units') setOpen(false)
          }}
          onRemove={onRemove}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// One sentence, told from the column at whose head it stands: the column
// equals its terms, each one multiplied or divided, rounded to its places.
function Sentence({ b, title, columns, sources, onChange, onRemove }: {
  b: Calculation
  title: string
  columns: readonly ColumnHead[]
  sources: readonly SourceInReach[]
  onChange: (b: Calculation) => void
  onRemove: () => void
}) {
  const [adding, setAdding] = useState(false)
  const plus = useRef<HTMLButtonElement>(null)
  const offer = offerFor(columns, sources, b.lead, true)
  const unitOffer = offerFor(columns, sources, '', false)
  const setTerms = (terms: Term[]): void => {
    if (terms.length === 0) onRemove()
    else onChange({ ...b, terms })
  }
  const setTerm = (at: number, term: Term): void => setTerms(b.terms.map((t, i) => (i === at ? term : t)))

  return (
    <div className="flex flex-wrap items-center gap-[4px]">
      <span className="font-semibold">{title}</span>
      <span className="text-muted">=</span>
      {b.terms.map((term, i) => (
        <Fragment key={i}>
          {/* The first term follows the "=" without a sign; one that divides
              divides 1. */}
          {i === 0 && term.divides && <span>1</span>}
          {(i > 0 || term.divides) && (
            <Button
              onlyIcon
              aria-label={term.divides ? 'geteilt durch' : 'mal'}
              onClick={() => setTerm(i, { ...term, divides: !term.divides })}
            >
              {term.divides ? '÷' : '×'}
            </Button>
          )}
          <TermChip
            term={term}
            name={termName(term, columns, sources)}
            offer={offer}
            unitOffer={unitOffer}
            onTerm={(next) => setTerm(i, next)}
            onRemove={() => setTerms(b.terms.filter((_, k) => k !== i))}
          />
        </Fragment>
      ))}
      <Button ref={plus} onlyIcon aria-label="Größe anfügen" aria-haspopup="dialog" onClick={() => setAdding(!adding)}>
        <Plus size={13} />
      </Button>
      {adding && (
        <TermPicker
          anchor={plus}
          offer={offer}
          term={null}
          onTerm={(term) => {
            setTerms([...b.terms, term])
            setAdding(false)
          }}
          onClose={() => setAdding(false)}
        />
      )}
      {b.terms.length > 0 && (
        <>
          <span className="text-muted">, gerundet auf</span>
          <NumberInput
            aria-label="Stellen"
            className="w-[40px]"
            value={b.decimals}
            onChange={(e) => {
              const decimals = Number.parseInt(e.currentTarget.value, 10)
              if (Number.isInteger(decimals) && decimals >= 0 && decimals <= DECIMALS_MAX) {
                onChange({ ...b, decimals })
              }
            }}
          />
          <span className="text-muted">Stellen</span>
          <Button onlyIcon aria-label="Berechnung entfernen" title="Berechnung entfernen" onClick={onRemove}>
            <Trash2 size={14} />
          </Button>
        </>
      )}
    </div>
  )
}

// The calculations a column takes part in, each as a sentence told from this
// column; without one, the empty sentence to begin with.
export function CalculationWindow({ editor, block, prop, column, columns, sources }: {
  editor: EditorStore
  block: BlockNode
  prop: string
  column: string
  columns: readonly ColumnHead[]
  sources: readonly SourceInReach[]
}) {
  const all = calculationsFrom(block.values[prop])
  const told = all.flatMap((b) => {
    const own = toldFrom(b, column)
    return own === null ? [] : [own]
  })
  const shown = told.length > 0 ? told : [newCalculation(all, column)]
  const title = columns.find((c) => c.key === column)?.title || column

  const write = (next: Calculation[]): void => {
    editor.updateProperty(block.id, prop, next)
  }
  const keep = (b: Calculation): void => {
    write(all.some((o) => o.key === b.key) ? all.map((o) => (o.key === b.key ? b : o)) : [...all, b])
  }

  return (
    <div className="flex flex-col gap-[8px]">
      {shown.map((b) => (
        <Sentence
          key={b.key}
          b={b}
          title={title}
          columns={columns}
          sources={sources}
          onChange={keep}
          onRemove={() => write(all.filter((o) => o.key !== b.key))}
        />
      ))}
    </div>
  )
}
