import { useState } from 'react'
import { Plus } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { Grid, Strip, TD } from '@/editor/widgets/Grid'
import { Window } from '@/editor/widgets/Window'
import { capability, hasCapability } from '../../core/block/capability'
import { blockType } from '../../core/block/registry'
import { sourcesInReach } from '../../core/block/sourcesInReach'
import {
  calculationsFrom,
  newCalculation,
  toldFrom,
  DECIMALS_MAX,
  type Calculation,
  type Term,
} from '../../core/data/calculation'
import { asNumber } from '../../core/data/number'
import { KIND_NAMES } from '../origin/origins'
import { columnEntries, sourceGroup } from '../origin/reach'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useView } from '../state/useView'
import { columnTitle, sentenceText, termName, termOrigin, termOriginKey, type Names } from './calculationWords'
import { TermLine } from './TermLine'
import { UnitsPane } from './UnitsPane'

const COLUMNS = [
  { name: 'Nr.', width: 44, right: true },
  { name: 'Zeichen', width: 72 },
  { name: 'Herkunft', width: 240 },
  { name: 'Eingabe' },
]

const EMPTY_TERM: Term = { kind: 'fixed', value: '', divides: false }

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
  if (block === undefined || prop === undefined || !hasCapability(def, 'list')) return null

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
      names={{
        lead: open.column,
        reach: {
          row: columnEntries(block),
          helpers: sourcesInReach(ed.tree, block.id, library).slice(1).map((q) => sourceGroup(q.source)),
        },
      }}
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
    const origin = termOrigin(value)
    if (origin) setTerm(i, { ...origin, divides: terms[i]?.divides ?? false })
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
              <td className={cn(TD, 'px-[10px] text-muted')}>{KIND_NAMES.row}</td>
              <td className={cn(TD, 'truncate px-[10px] font-semibold')}>{columnTitle(names, draft.lead)}</td>
            </tr>
            {terms.map((term, i) => (
              <TermLine
                key={i}
                nr={i + 1}
                term={term}
                names={names}
                origin={pending?.at === i ? pending.origin : termOriginKey(term)}
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
