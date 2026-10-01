import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown, Plus, Trash2, X } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { Grid, MARKED, TD } from '@/editor/widgets/Grid'
import { List } from '@/editor/widgets/List'
import { Popover } from '@/editor/widgets/Popover'
import { OnEscape } from '@/editor/widgets/useCloseOnEscape'
import type { Parameter } from '../../core/data/actions'
import type { RelationTemplate } from '../../core/data/relations'
import { adoptedField, fieldAdopt } from './fieldAdopt'
import { placeGroups, placePicked, placeText, type PlaceChoices, type PlaceText } from './placeChoices'

// What stands in the places of a relation: one per place of its syntax, then
// those added behind a relation that ends in "...".
export interface Filled {
  parameter: readonly Parameter[]
  extraParameter: readonly Parameter[]
}

const EMPTY: Parameter = { source: 'fixed', value: '' }

const isEmpty = (b: Parameter | undefined): boolean =>
  !b || b.source === 'omitted' || (b.source === 'fixed' && b.value.trim() === '')

const COLUMNS = [
  { name: 'Nr.', width: 44, right: true },
  { name: 'Bezeichnung', width: 130 },
  { name: 'Eingabe' },
  { name: 'Herkunft', width: 150 },
]

function texts(template: RelationTemplate, filled: Filled, choices: PlaceChoices): { raw: string; text: PlaceText }[] {
  const field = adoptedField(template, filled.parameter, choices.dataSources)
  return [...filled.parameter, ...filled.extraParameter].map((b, i) => {
    const raw = template.parameter[i] ?? '…'
    return { raw, text: placeText(b, raw, choices, field?.label) }
  })
}

// The relation as it goes out: a fixed value as it stands, every other value
// as its name in braces.
export function Result({ template, filled, choices }: { template: RelationTemplate; filled: Filled; choices: PlaceChoices }) {
  const all = [...filled.parameter, ...filled.extraParameter]
  return (
    <div className="break-all border-b border-line px-[12px] py-[9px] font-mono text-dense leading-[19px] text-muted">
      {template.verb}[{template.nr}
      {texts(template, filled, choices).map(({ text }, k) => (
        <span key={k}>
          !
          {text.entry !== '' && (
            <span className="font-semibold text-ink">{all[k]?.source === 'fixed' ? text.entry : `{${text.entry}}`}</span>
          )}
        </span>
      ))}
      ]
    </div>
  )
}

// The places as SoftEngine resolves a relation: a line per place with its
// number, its name, the entry and where it comes from. Filled places stand
// first, empty ones fold away. A click on a line types into its entry; Enter
// and the arrows go on, F4 opens the choice.
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
  const [showAll, setShowAll] = useState(false)
  const all = [...filled.parameter, ...filled.extraParameter]
  const lines = texts(template, filled, choices)
  const fixedCount = filled.parameter.length

  const set = (i: number, b: Parameter) => onChange(i < fixedCount
    ? { ...filled, parameter: filled.parameter.map((x, k) => (k === i ? b : x)) }
    : { ...filled, extraParameter: filled.extraParameter.map((x, k) => (k === i - fixedCount ? b : x)) })
  const choose = (i: number, value: string) => {
    const picked = placePicked(value)
    if ('set' in picked) {
      set(i, picked.set)
      return
    }
    const source = choices.dataSources.find((s) => s.id === picked.adopt.sourceId)
    if (source) onChange({ ...filled, parameter: fieldAdopt(filled.parameter, template, source, picked.adopt.code) })
  }

  const indexes = all.map((_, i) => i)
  const shown = showAll ? indexes : indexes.filter((i) => !isEmpty(all[i]) || i === selected)
  const hidden = all.length - shown.length
  const move = (from: number, by: number) => {
    const at = shown.indexOf(from) + by
    if (at >= 0 && at < shown.length) setSelected(shown[at])
  }

  return (
    <Grid columns={COLUMNS} fill={fill}>
      {shown.map((i) => (
        <PlaceLine
          key={i}
          nr={i + 1}
          raw={lines[i]?.raw ?? '…'}
          binding={all[i] ?? EMPTY}
          text={lines[i]?.text ?? { entry: '', origin: '' }}
          on={selected === i}
          extra={i >= fixedCount}
          choices={choices}
          onSelect={() => setSelected(i)}
          onChange={(b) => set(i, b)}
          onChoose={(value) => choose(i, value)}
          onMove={(by) => move(i, by)}
          onDone={() => setSelected(null)}
          onRemove={() => {
            onChange({ ...filled, extraParameter: filled.extraParameter.filter((_, k) => k !== i - fixedCount) })
            setSelected(null)
          }}
        />
      ))}
      {(hidden > 0 || showAll) && (
        <tr className="cursor-pointer text-muted hover:bg-accent-soft" onClick={() => setShowAll(!showAll)}>
          <td className={TD} />
          <td className={cn(TD, 'px-[10px]')} colSpan={3}>
            <span className="flex items-center gap-[8px]">
              <ChevronDown size={13} className={cn('text-accent transition-transform', showAll && 'rotate-180')} />
              {showAll ? 'Leere Stellen ausblenden' : `${hidden} leere Stellen einblenden`}
            </span>
          </td>
        </tr>
      )}
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

function PlaceLine({ nr, raw, binding, text, on, extra, choices, onSelect, onChange, onChoose, onMove, onDone, onRemove }: {
  nr: number
  raw: string
  binding: Parameter
  text: PlaceText
  on: boolean
  extra: boolean
  choices: PlaceChoices
  onSelect: () => void
  onChange: (b: Parameter) => void
  onChoose: (value: string) => void
  onMove: (by: number) => void
  onDone: () => void
  onRemove: () => void
}) {
  const [listOpen, setListOpen] = useState(false)
  const chevron = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const typed = binding.source === 'fixed' || binding.source === 'omitted'
  useEffect(() => { if (on && typed) input.current?.focus() }, [on, typed])

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); onMove(1) }
    if (e.key === 'ArrowUp') { e.preventDefault(); onMove(-1) }
    if (e.key === 'F4') { e.preventDefault(); setListOpen(true) }
  }
  const cell = (k: string) => cn(TD, 'px-[10px]', k)

  return (
    <tr onClick={onSelect} className={cn('cursor-default', on ? MARKED : 'hover:bg-accent-soft')}>
      {on && <OnEscape run={onDone} />}
      <td className={cell('text-right font-mono text-dense')}>{nr}</td>
      <td className={cell('truncate font-mono text-dense')} title={raw}>{raw}</td>
      <td className={cn(TD, on ? 'px-[4px]' : 'px-[10px]')}>
        {on
          ? (
              <span className="flex h-[24px] items-center rounded border border-accent bg-panel text-ink">
                {typed
                  ? (
                      <input
                        ref={input}
                        aria-label={`${nr} ${raw}`}
                        value={binding.value}
                        placeholder={raw}
                        spellCheck={false}
                        onChange={(e) => onChange({ source: 'fixed', value: e.currentTarget.value })}
                        onKeyDown={onKey}
                        className="h-full min-w-0 flex-1 bg-transparent px-[6px] text-ui outline-none placeholder:font-mono placeholder:text-dense placeholder:text-muted/60"
                      />
                    )
                  : (
                      <>
                        <span className="min-w-0 flex-1 truncate px-[6px]">{text.entry}</span>
                        <button
                          type="button"
                          aria-label={`${nr} ${raw} leeren`}
                          title="Leeren"
                          onClick={(e) => { e.stopPropagation(); onChange(EMPTY) }}
                          className="flex h-full items-center px-[6px] text-muted hover:text-ink"
                        >
                          <X size={12} />
                        </button>
                      </>
                    )}
                <button
                  ref={chevron}
                  type="button"
                  aria-label={`${nr} ${raw} wählen`}
                  title="Wählen"
                  aria-haspopup="dialog"
                  aria-expanded={listOpen}
                  onClick={(e) => { e.stopPropagation(); setListOpen(!listOpen) }}
                  className="flex h-full items-center border-l border-line px-[6px] text-muted hover:text-ink"
                >
                  <ChevronDown size={13} />
                </button>
              </span>
            )
          : text.entry === ''
            ? <span className="font-mono text-dense opacity-40">{raw}</span>
            : <span className="block truncate">{text.entry}</span>}
        {listOpen && (
          <Popover name={`${nr} ${raw}`} anchor={chevron} width={300} level={70} onClose={() => setListOpen(false)}>
            <List
              searchable
              groups={placeGroups(raw, choices)}
              value=""
              onChoose={(value) => {
                setListOpen(false)
                onChoose(value)
              }}
            />
          </Popover>
        )}
      </td>
      <td className={cell('')}>
        <span className="flex items-center">
          <span className={cn('min-w-0 flex-1 truncate', !on && 'text-muted')}>{text.origin}</span>
          {extra && on && (
            <button
              type="button"
              aria-label={`Stelle ${nr} entfernen`}
              title="Stelle entfernen"
              onClick={(e) => { e.stopPropagation(); onRemove() }}
              className="hover:text-error-soft"
            >
              <Trash2 size={13} />
            </button>
          )}
        </span>
      </td>
    </tr>
  )
}
