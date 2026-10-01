import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronDown, Plus, Trash2, X } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { List, type ListGroup } from '@/editor/widgets/List'
import { Popover } from '@/editor/widgets/Popover'
import { Segment } from '@/editor/widgets/Segment'
import { ACTION_PLACEHOLDER, relationParameterDefault, type Parameter } from '../../core/data/actions'
import type { DataSource } from '../../core/data/dataSources'
import {
  fieldCodeSplit,
  parameterRole,
  relationGroup,
  relationSyntaxAsText,
  relIdFromIdbId,
  type RelationTemplate,
} from '../../core/data/relations'
import type { RelationStep } from '../../core/data/steps/relation'
import type { StartToolStep } from '../../core/data/steps/startTool'
import type { PopupOpenStep } from '../../core/data/steps/popupOpen'
import type { PopupCloseStep } from '../../core/data/steps/popupClose'
import { resultStepsBefore } from '../../core/data/steps/chains'
import type { Step } from '../../core/data/steps/steps'
import { decodeOrigin, originGroups } from '../controls/originOffer'
import { PickerControl } from '../controls/PickerControl'
import { adoptFields, fieldAdopt } from '../datacenter/fieldAdopt'
import { bindingText } from '../datacenter/parameter/bindingRegistry'
import type { ParameterChoices } from '../datacenter/parameter/choices'
import { PLACEHOLDER_PLAIN_TEXT } from '../datacenter/parameterText'
import { parameterOfOrigin, parameterOffer } from './parameterOrigin'

export type StepTab = 'GET' | 'PUT' | 'TOOL' | 'POPUP'

export interface StepContext {
  relations: readonly RelationTemplate[]
  popups: readonly { value: string; name: string }[]
  choices: Omit<ParameterChoices, 'steps'>
}

const TABS: readonly { key: StepTab; name: string }[] = [
  { key: 'GET', name: 'GET Relation' },
  { key: 'PUT', name: 'PUT Relation' },
  { key: 'TOOL', name: 'START_TOOL' },
  { key: 'POPUP', name: 'Popup' },
]

const WIDTH = 780
const HEIGHT = 560
const EMPTY: Parameter = { source: 'fixed', value: '' }

const emptyRelation = (id: string): RelationStep =>
  ({ id, kind: 'RELATION', resultName: '', relationId: '', parameter: [], extraParameter: [] })
const emptyTool = (id: string): StartToolStep =>
  ({ id, kind: 'START_TOOL', resultName: '', toolNumber: '', toolParameter: [] })

type PopupStep = PopupOpenStep | PopupCloseStep
const emptyPopup = (id: string): PopupStep =>
  ({ id, kind: 'POPUP_OPEN', resultName: '', popupId: '' })

const isEmpty = (b: Parameter | undefined): boolean =>
  !b || b.source === 'omitted' || (b.source === 'fixed' && b.value.trim() === '')

// The window of one step, as SoftEngine resolves a relation: tabs for the
// kind, the places as a grid of number, name, entry and origin, the result on
// the right. Nothing reaches the step before "Übernehmen".
export function StepWindow({ nr, step, tab: firstTab, chain, context, onApply, onClose }: {
  nr: number
  step: Step | undefined
  tab: StepTab
  chain: readonly Step[]
  context: StepContext
  onApply: (step: Step) => void
  onClose: () => void
}) {
  const [id] = useState(() => step?.id ?? crypto.randomUUID())
  const [tab, setTab] = useState<StepTab>(firstTab)
  const own = (group: 'read' | 'write'): RelationStep => {
    if (step?.kind !== 'RELATION') return emptyRelation(id)
    const t = context.relations.find((r) => r.id === step.relationId)
    return t && relationGroup(t) === group ? step : emptyRelation(id)
  }
  const [get, setGet] = useState<RelationStep>(() => own('read'))
  const [put, setPut] = useState<RelationStep>(() => own('write'))
  const [tool, setTool] = useState<StartToolStep>(() => (step?.kind === 'START_TOOL' ? step : emptyTool(id)))
  const [popup, setPopup] = useState<PopupStep>(() =>
    (step?.kind === 'POPUP_OPEN' || step?.kind === 'POPUP_CLOSE' ? step : emptyPopup(id)))

  const choices: ParameterChoices = useMemo(() => ({
    ...context.choices,
    steps: resultStepsBefore(chain, id, context.relations),
  }), [context, chain, id])

  const draft: Step = tab === 'GET' ? get : tab === 'PUT' ? put : tab === 'TOOL' ? tool : popup
  const template = draft.kind === 'RELATION' ? context.relations.find((r) => r.id === draft.relationId) : undefined
  const popupName = context.popups.find((p) => p.value === popup.popupId)?.name ?? ''
  const { ready, head } = draft.kind === 'RELATION'
    ? { ready: template !== undefined, head: template ? relationSyntaxAsText(template) : '' }
    : draft.kind === 'START_TOOL'
      ? { ready: draft.toolNumber.trim() !== '', head: draft.toolNumber.trim() !== '' ? `START_TOOL ${draft.toolNumber.trim()}` : '' }
      : { ready: popupName !== '', head: popupName !== '' ? `Popup ${popupName} ${draft.kind === 'POPUP_OPEN' ? 'öffnen' : 'schließen'}` : '' }
  // In the middle of the screen.
  const at = {
    top: Math.max(8, (window.innerHeight - HEIGHT) / 2),
    left: Math.max(8, (window.innerWidth - WIDTH) / 2),
  }

  return (
    <Popover name={`Schritt ${nr}`} at={at} width={WIDTH} maxHeight={HEIGHT + 8} level={60} onClose={onClose}>
      <div className="-m-1 flex flex-col text-ui" style={{ height: HEIGHT }}>
        <header className="flex h-[44px] shrink-0 items-center gap-[14px] border-b border-line px-[14px]">
          <h2 className="shrink-0 text-title font-semibold text-ink">Schritt {nr}</h2>
          <span className="min-w-0 flex-1 truncate border-l border-line pl-[14px] font-mono text-dense text-muted" title={head}>
            {head}
          </span>
        </header>
        <nav className="flex shrink-0 border-b border-line bg-control px-[8px]">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                '-mb-px border-b-2 px-[14px] pb-[6px] pt-[7px]',
                tab === t.key
                  ? 'border-x border-x-line border-b-accent bg-panel font-semibold text-ink'
                  : 'border-b-transparent text-muted hover:text-ink',
              )}
            >
              {t.name}
            </button>
          ))}
        </nav>

        {draft.kind === 'RELATION'
          ? (
              <RelationBody
                key={tab}
                step={draft}
                group={tab === 'GET' ? 'read' : 'write'}
                template={template}
                relations={context.relations}
                choices={choices}
                onChange={tab === 'GET' ? setGet : setPut}
              />
            )
          : draft.kind === 'START_TOOL'
            ? <ToolBody step={draft} onChange={setTool} />
            : <PopupBody step={popup} popups={context.popups} onChange={setPopup} />}

        <footer className="flex shrink-0 justify-end gap-[8px] border-t border-line bg-control px-[14px] py-[8px]">
          <Button onClick={onClose}>Abbrechen</Button>
          <Button kind="primary" disabled={!ready} onClick={() => onApply(draft)}>Übernehmen</Button>
        </footer>
      </div>
    </Popover>
  )
}

// A strip that names what follows, with a line above and below.
function Strip({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex h-[28px] shrink-0 items-center border-b border-line bg-control px-[12px] text-dense font-semibold text-muted">
      {children}
      {right !== undefined && <span className="ml-auto font-normal">{right}</span>}
    </div>
  )
}

const TH = 'h-[26px] border-b border-r border-line bg-control px-[10px] text-left text-dense font-semibold text-muted last:border-r-0'
const TD = 'h-[29px] border-b border-r border-line/70 px-[10px] last:border-r-0'

// What a place shows: the entry in plain words, and where it comes from.
interface PlaceText { entry: string; origin: string }

function relationBody(template: RelationTemplate, step: RelationStep, sources: readonly DataSource[]) {
  const fixed = (role: string): string => {
    const at = template.parameter.findIndex((p) => parameterRole(p) === role)
    const b = at < 0 ? undefined : step.parameter[at]
    return b?.source === 'fixed' ? b.value.trim() : ''
  }
  const hasTable = template.parameter.some((p) => parameterRole(p) === 'relid')
  // The field whose position and length stand in the places, if any.
  const field = adoptFields(sources).find((f) => {
    const split = fieldCodeSplit(f.posLen)
    const source = sources.find((s) => s.id === f.sourceId)
    return split !== null && split.pos === fixed('pos') && split.len === fixed('len')
      && (!hasTable || relIdFromIdbId(source?.tableId ?? '') === fixed('relid'))
  })
  return { hasTable, field }
}

function placeText(
  binding: Parameter,
  raw: string,
  choices: ParameterChoices,
  fieldName: string | undefined,
): PlaceText {
  switch (binding.source) {
    case 'fixed':
      if (binding.value.trim() === '') return { entry: '', origin: '' }
      return {
        entry: binding.value,
        origin: parameterRole(raw) !== null && fieldName ? `Feld ${fieldName}` : 'fester Wert',
      }
    case 'context':
      return { entry: PLACEHOLDER_PLAIN_TEXT[binding.value]?.name ?? binding.value, origin: 'Ereignis' }
    case 'dataField': {
      const source = choices.dataSources.find((s) => s.id === binding.sourceId)
      const name = source?.fields.find((f) => f.code === binding.value)?.name ?? binding.value
      return { entry: name, origin: source?.name ?? '' }
    }
    case 'blockValue': {
      const spot = choices.blockValues.find((b) => b.blockId === binding.blockId && b.prop === binding.value)
      return { entry: spot?.label ?? binding.value, origin: 'Formularfeld' }
    }
    case 'chosenRow': {
      const giver = choices.giver.find((g) => g.blockId === binding.blockId)
      const name = giver?.fields.find((f) => f.code === binding.value)?.name ?? binding.value
      return { entry: name, origin: giver ? `Gewählte Zeile ${giver.label}` : 'Gewählte Zeile' }
    }
    case 'captureCell':
    case 'changeCell':
    case 'deleteCell': {
      const list = binding.source === 'captureCell' ? choices.captures
        : binding.source === 'changeCell' ? choices.changes : choices.deletions
      const column = list.find((c) => c.blockId === binding.blockId)?.columns.find((c) => c.key === binding.value)
      const word = binding.source === 'captureCell' ? 'Erfasste Zeile'
        : binding.source === 'changeCell' ? 'Geänderte Zeile' : 'Gelöschte Zeile'
      return { entry: column?.title ?? binding.value, origin: word }
    }
    case 'omitted':
      return { entry: '', origin: '' }
    default:
      return { entry: bindingText(binding, choices).replace(/^\{|\}$/g, ''), origin: 'Schritt davor' }
  }
}

const EVENT_KEY = 'event:'
const ADOPT_KEY = 'adopt:'
const ADOPT_SEP = '::'

function RelationBody({ step, group, template, relations, choices, onChange }: {
  step: RelationStep
  group: 'read' | 'write'
  template: RelationTemplate | undefined
  relations: readonly RelationTemplate[]
  choices: ParameterChoices
  onChange: (step: RelationStep) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)
  const offered = relations.filter((r) => relationGroup(r) === group)
  const sources = choices.dataSources

  const choose = (relationId: string) => {
    const t = relations.find((r) => r.id === relationId)
    if (!t) return
    onChange({
      ...step,
      relationId,
      parameter: relationParameterDefault(t),
      extraParameter: t.extraParameterAllowed ? step.extraParameter : [],
    })
    setSelected(null)
  }

  if (!template) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Strip>Relation</Strip>
        <div className="border-b border-line px-[12px] py-[8px]">
          <RelationChoice relations={offered} value="" onChoose={choose} />
        </div>
      </div>
    )
  }

  const { hasTable, field } = relationBody(template, step, sources)
  const all = [...step.parameter, ...step.extraParameter]
  const nameAt = (i: number): string => template.parameter[i] ?? '…'
  const set = (i: number, b: Parameter) => {
    if (i < step.parameter.length) onChange({ ...step, parameter: step.parameter.map((x, k) => (k === i ? b : x)) })
    else {
      const e = i - step.parameter.length
      onChange({ ...step, extraParameter: step.extraParameter.map((x, k) => (k === e ? b : x)) })
    }
  }
  const adopt = (sourceId: string, code: string) => {
    const source = sources.find((s) => s.id === sourceId)
    if (!source) return
    let params = fieldAdopt(step.parameter, template, source, code, 'field').params
    if (hasTable) params = fieldAdopt(params, template, source, code, 'idb').params
    onChange({ ...step, parameter: params })
  }
  const used = all.filter((b) => !isEmpty(b)).length
  const indexes = all.map((_, i) => i)
  const shown = showAll ? indexes : indexes.filter((i) => !isEmpty(all[i]) || i === selected)
  const hidden = all.length - shown.length
  const move = (from: number, by: number) => {
    const at = shown.indexOf(from) + by
    if (at >= 0 && at < shown.length) setSelected(shown[at])
  }

  // The relation as it goes out: a fixed value as it stands, every other
  // value as its name in braces.
  const parts = all.map((b, i) => {
    const t = placeText(b, nameAt(i), choices, field?.label)
    if (t.entry === '') return ''
    return b.source === 'fixed' ? t.entry : `{${t.entry}}`
  })

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_260px]">
      <div className="flex min-h-0 flex-col border-r border-line">
        <Strip>Relation</Strip>
        <div className="border-b border-line px-[12px] py-[8px]">
          <RelationChoice relations={offered} value={template.id} onChoose={choose} />
        </div>
        <Strip right={`${used} von ${all.length} belegt`}>Stellen</Strip>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-[1]">
              <tr>
                <th className={cn(TH, 'w-[44px] text-right')}>Nr.</th>
                <th className={cn(TH, 'w-[130px]')}>Bezeichnung</th>
                <th className={TH}>Eingabe</th>
                <th className={cn(TH, 'w-[150px]')}>Herkunft</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((i) => (
                <PlaceLine
                  key={i}
                  nr={i + 1}
                  raw={nameAt(i)}
                  binding={all[i] ?? EMPTY}
                  text={placeText(all[i] ?? EMPTY, nameAt(i), choices, field?.label)}
                  on={selected === i}
                  extra={i >= step.parameter.length}
                  choices={choices}
                  onSelect={() => setSelected(i)}
                  onChange={(b) => set(i, b)}
                  onAdopt={adopt}
                  onMove={(by) => move(i, by)}
                  onDone={() => setSelected(null)}
                  onRemove={() => {
                    const e = i - step.parameter.length
                    onChange({ ...step, extraParameter: step.extraParameter.filter((_, k) => k !== e) })
                    setSelected(null)
                  }}
                />
              ))}
              {(hidden > 0 || showAll) && (
                <tr className="cursor-pointer text-muted hover:bg-control" onClick={() => setShowAll(!showAll)}>
                  <td className={TD} />
                  <td className={TD} colSpan={3}>
                    <span className="flex items-center gap-[8px]">
                      <ChevronDown size={13} className={cn('text-accent transition-transform', showAll && 'rotate-180')} />
                      {showAll ? 'Leere Stellen ausblenden' : `${hidden} leere Stellen einblenden`}
                    </span>
                  </td>
                </tr>
              )}
              {template.extraParameterAllowed === true && (
                <tr
                  className="cursor-pointer text-muted hover:bg-control"
                  onClick={() => {
                    onChange({ ...step, extraParameter: [...step.extraParameter, EMPTY] })
                    setSelected(all.length)
                  }}
                >
                  <td className={TD} />
                  <td className={TD} colSpan={3}>
                    <span className="flex items-center gap-[8px]"><Plus size={13} className="text-accent" /> Stelle hinzufügen</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex min-h-0 flex-col overflow-y-auto">
        <Strip>Ergebnis</Strip>
        <div className="break-all border-b border-line px-[12px] py-[9px] font-mono text-dense leading-[19px] text-muted">
          {template.verb}[{template.nr}
          {parts.map((part, k) => (
            <span key={k}>!{part !== '' && <span className="font-semibold text-ink">{part}</span>}</span>
          ))}
          ]
        </div>
        <Strip>Bezeichnung</Strip>
        <div className="px-[12px] py-[9px]">{template.name}</div>
      </div>
    </div>
  )
}

function RelationChoice({ relations, value, onChoose }: {
  relations: readonly RelationTemplate[]
  value: string
  onChoose: (id: string) => void
}) {
  return (
    <PickerControl
      name="Relation"
      className="w-full"
      groups={[{
        key: 'relations',
        entries: relations.map((r) => ({ value: r.id, name: r.name, badge: relationSyntaxAsText(r) })),
      }]}
      value={value}
      placeholder=""
      onChoose={onChoose}
    />
  )
}

// What a place can take: for position, length and table a field of a source,
// which fills all three; else a value of the event, a row, a field, a form
// field. Typed text is the entry itself.
function placeGroups(raw: string, choices: ParameterChoices): ListGroup[] {
  if (parameterRole(raw) !== null) {
    const fields = adoptFields(choices.dataSources)
    return choices.dataSources
      .map((s) => ({
        key: `adopt:${s.id}`,
        name: s.name,
        entries: fields.filter((f) => f.sourceId === s.id)
          .map((f) => ({ value: `${ADOPT_KEY}${s.id}${ADOPT_SEP}${f.code}`, name: f.label, badge: f.code })),
      }))
      .filter((g) => g.entries.length > 0)
  }
  return [
    {
      key: 'event',
      name: 'Ereignis',
      entries: ACTION_PLACEHOLDER.map((key) => ({
        value: `${EVENT_KEY}${key}`,
        name: PLACEHOLDER_PLAIN_TEXT[key]?.name ?? key,
      })),
    },
    ...originGroups(parameterOffer(choices)),
  ]
}

function PlaceLine({ nr, raw, binding, text, on, extra, choices, onSelect, onChange, onAdopt, onMove, onDone, onRemove }: {
  nr: number
  raw: string
  binding: Parameter
  text: PlaceText
  on: boolean
  extra: boolean
  choices: ParameterChoices
  onSelect: () => void
  onChange: (b: Parameter) => void
  onAdopt: (sourceId: string, code: string) => void
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
    if (e.key === 'Escape') { e.stopPropagation(); onDone() }
    if (e.key === 'F4') { e.preventDefault(); setListOpen(true) }
  }

  return (
    <tr
      onClick={onSelect}
      className={cn('cursor-default', on ? 'bg-accent-soft' : 'hover:bg-control/60')}
    >
      <td className={cn(TD, 'text-right font-mono text-dense text-muted', on && 'text-accent-ink shadow-mark')}>{nr}</td>
      <td className={cn(TD, 'truncate font-mono text-dense')} title={raw}>{raw}</td>
      <td className={cn(TD, on && 'px-[4px]')}>
        {on
          ? (
              <span className="flex h-[24px] items-center rounded border border-accent bg-panel">
                {typed
                  ? (
                      <input
                        ref={input}
                        aria-label={`${nr} ${raw}`}
                        value={binding.value}
                        placeholder={raw}
                        onChange={(e) => onChange({ source: 'fixed', value: e.currentTarget.value })}
                        onKeyDown={onKey}
                        className="h-full min-w-0 flex-1 bg-transparent px-[6px] text-ui text-ink outline-none placeholder:font-mono placeholder:text-dense placeholder:text-muted/60"
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
            ? <span className="font-mono text-dense text-muted/50">{raw}</span>
            : <span className="truncate">{text.entry}</span>}
        {listOpen && (
          <Popover name={`${nr} ${raw}`} anchor={chevron} width={300} level={70} onClose={() => setListOpen(false)}>
            <List
              searchable
              groups={placeGroups(raw, choices)}
              value=""
              onChoose={(value) => {
                setListOpen(false)
                if (value.startsWith(ADOPT_KEY)) {
                  const [sourceId, code] = value.slice(ADOPT_KEY.length).split(ADOPT_SEP)
                  onAdopt(sourceId, code)
                  return
                }
                if (value.startsWith(EVENT_KEY)) {
                  onChange({ source: 'context', value: value.slice(EVENT_KEY.length) })
                  return
                }
                const next = parameterOfOrigin(decodeOrigin(value), choices)
                if (next !== null) onChange(next)
              }}
            />
          </Popover>
        )}
      </td>
      <td className={cn(TD, 'text-muted')}>
        <span className="flex items-center">
          <span className="min-w-0 flex-1 truncate">{text.origin}</span>
          {extra && on && (
            <button
              type="button"
              aria-label={`Stelle ${nr} entfernen`}
              title="Stelle entfernen"
              onClick={(e) => { e.stopPropagation(); onRemove() }}
              className="text-muted hover:text-error"
            >
              <Trash2 size={13} />
            </button>
          )}
        </span>
      </td>
    </tr>
  )
}

// A tool: its number, then its parameters as lines, each typed.
function ToolBody({ step, onChange }: { step: StartToolStep; onChange: (step: StartToolStep) => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Strip>START_TOOL</Strip>
      <div className="grid grid-cols-[112px_160px] items-center gap-[8px] border-b border-line px-[12px] py-[8px]">
        <span className="text-dense text-muted">Nummer</span>
        <input
          aria-label="Werkzeugnummer"
          value={step.toolNumber}
          onChange={(e) => onChange({ ...step, toolNumber: e.currentTarget.value })}
          className="h-control rounded border border-line bg-panel px-[8px] font-mono text-ui outline-none focus:border-accent"
        />
      </div>
      <Strip>Parameter</Strip>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={cn(TH, 'w-[44px] text-right')}>Nr.</th>
              <th className={TH}>Eingabe</th>
              <th className={cn(TH, 'w-[40px]')} />
            </tr>
          </thead>
          <tbody>
            {step.toolParameter.map((p, i) => (
              <tr key={i}>
                <td className={cn(TD, 'text-right font-mono text-dense text-muted')}>{i + 1}</td>
                <td className={cn(TD, 'px-[4px]')}>
                  <input
                    aria-label={`Parameter ${i + 1}`}
                    value={p}
                    onChange={(e) => onChange({ ...step, toolParameter: step.toolParameter.map((q, k) => (k === i ? e.currentTarget.value : q)) })}
                    className="h-[24px] w-full rounded border border-transparent bg-transparent px-[6px] outline-none focus:border-accent focus:bg-panel"
                  />
                </td>
                <td className={cn(TD, 'text-center')}>
                  <button
                    type="button"
                    aria-label={`Parameter ${i + 1} entfernen`}
                    title="Entfernen"
                    onClick={() => onChange({ ...step, toolParameter: step.toolParameter.filter((_, k) => k !== i) })}
                    className="text-muted hover:text-error"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            <tr className="cursor-pointer text-muted hover:bg-control" onClick={() => onChange({ ...step, toolParameter: [...step.toolParameter, ''] })}>
              <td className={TD} />
              <td className={TD} colSpan={2}>
                <span className="flex items-center gap-[8px]"><Plus size={13} className="text-accent" /> Parameter hinzufügen</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// A popup: open or close, and which one.
function PopupBody({ step, popups, onChange }: {
  step: PopupStep
  popups: readonly { value: string; name: string }[]
  onChange: (step: PopupStep) => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Strip>Popup</Strip>
      <div className="grid grid-cols-[112px_260px] items-center gap-[8px] px-[12px] py-[8px]">
        <span className="text-dense text-muted">Aktion</span>
        <Segment
          name="Aktion"
          options={[{ value: 'POPUP_OPEN', name: 'öffnen' }, { value: 'POPUP_CLOSE', name: 'schließen' }]}
          value={step.kind}
          onChoose={(kind) => onChange({ ...step, kind: kind === 'POPUP_CLOSE' ? 'POPUP_CLOSE' : 'POPUP_OPEN' })}
        />
        <span className="text-dense text-muted">Popup</span>
        <PickerControl
          name="Popup"
          className="w-full"
          groups={[{ key: 'popups', entries: popups }]}
          value={step.popupId}
          placeholder=""
          onChoose={(popupId) => onChange({ ...step, popupId })}
        />
      </div>
    </div>
  )
}
