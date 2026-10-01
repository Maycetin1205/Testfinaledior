import { useMemo, useState } from 'react'
import { Plus, Trash2 } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { cn } from '@/editor/widgets/cn'
import { Grid, Strip, TD } from '@/editor/widgets/Grid'
import { Segment } from '@/editor/widgets/Segment'
import { Window } from '@/editor/widgets/Window'
import { relationParameterDefault } from '../../core/data/actions'
import {
  relationFitsToSearch,
  relationGroup,
  relationSyntaxAsText,
  type RelationTemplate,
} from '../../core/data/relations'
import { resultStepsBefore } from '../../core/data/steps/chains'
import type { PopupCloseStep } from '../../core/data/steps/popupClose'
import type { PopupOpenStep } from '../../core/data/steps/popupOpen'
import type { RelationStep } from '../../core/data/steps/relation'
import type { StartToolStep } from '../../core/data/steps/startTool'
import type { Step } from '../../core/data/steps/steps'
import { PickerControl } from '../controls/PickerControl'
import type { PlaceChoices } from './placeChoices'
import { Places, Result } from './Places'

export type StepTab = 'GET' | 'PUT' | 'TOOL' | 'POPUP'

export interface StepContext {
  relations: readonly RelationTemplate[]
  popups: readonly { value: string; name: string }[]
  choices: Omit<PlaceChoices, 'steps'>
}

type PopupStep = PopupOpenStep | PopupCloseStep

const TABS: readonly { key: StepTab; name: string }[] = [
  { key: 'GET', name: 'GET Relation' },
  { key: 'PUT', name: 'PUT Relation' },
  { key: 'TOOL', name: 'START_TOOL' },
  { key: 'POPUP', name: 'Popup' },
]

const emptyRelation = (id: string): RelationStep =>
  ({ id, kind: 'RELATION', resultName: '', relationId: '', parameter: [], extraParameter: [] })

// The window of one step, as SoftEngine resolves a relation: tabs for the
// kind, the places as a grid, the result on the right. Nothing reaches the
// step before "Übernehmen".
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
  const reads = context.relations.filter((r) => relationGroup(r) === 'read').length
  const writes = context.relations.length - reads
  // A new step opens where the relations are.
  const [tab, setTab] = useState<StepTab>(() =>
    (step === undefined && firstTab === 'PUT' && writes === 0 && reads > 0 ? 'GET' : firstTab))
  const own = (group: 'read' | 'write'): RelationStep => {
    if (step?.kind !== 'RELATION') return emptyRelation(id)
    const t = context.relations.find((r) => r.id === step.relationId)
    return t && relationGroup(t) === group ? step : emptyRelation(id)
  }
  const [get, setGet] = useState<RelationStep>(() => own('read'))
  const [put, setPut] = useState<RelationStep>(() => own('write'))
  const [tool, setTool] = useState<StartToolStep>(() => (step?.kind === 'START_TOOL'
    ? step
    : { id, kind: 'START_TOOL', resultName: '', toolNumber: '', toolParameter: [] }))
  const [popup, setPopup] = useState<PopupStep>(() => (step?.kind === 'POPUP_OPEN' || step?.kind === 'POPUP_CLOSE'
    ? step
    : { id, kind: 'POPUP_OPEN', resultName: '', popupId: '' }))

  const choices: PlaceChoices = useMemo(() => ({
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

  return (
    <Window
      title={`Schritt ${nr}`}
      beside={(
        <span className="min-w-0 truncate border-l border-line pl-[14px] font-mono text-dense text-muted" title={head}>
          {head}
        </span>
      )}
      tabs={TABS.map((t) => ({ ...t, ...(t.key === 'GET' ? { count: reads } : t.key === 'PUT' ? { count: writes } : {}) }))}
      tab={tab}
      onTab={setTab}
      width={780}
      height={560}
      level={50}
      foot={(
        <>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button kind="primary" disabled={!ready} onClick={() => onApply(draft)}>Übernehmen</Button>
        </>
      )}
      onClose={onClose}
    >
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
    </Window>
  )
}

function RelationBody({ step, group, template, relations, choices, onChange }: {
  step: RelationStep
  group: 'read' | 'write'
  template: RelationTemplate | undefined
  relations: readonly RelationTemplate[]
  choices: PlaceChoices
  onChange: (step: RelationStep) => void
}) {
  const offered = relations.filter((r) => relationGroup(r) === group)
  const choose = (relationId: string) => {
    const t = relations.find((r) => r.id === relationId)
    if (!t) return
    onChange({
      ...step,
      relationId,
      parameter: relationParameterDefault(t),
      extraParameter: t.extraParameterAllowed ? step.extraParameter : [],
    })
  }

  // Without a relation the window lists them all, as SoftEngine's choice of
  // variables does: syntax and name, a search above, a click takes one.
  if (!template) return <RelationList relations={offered} onChoose={choose} />

  const all = [...step.parameter, ...step.extraParameter]
  const used = all.filter((b) => !(b.source === 'omitted' || (b.source === 'fixed' && b.value.trim() === ''))).length

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_260px]">
      <div className="flex min-h-0 flex-col border-r border-line">
        <Strip>Relation</Strip>
        <div className="border-b border-line px-[12px] py-[8px]">
          <PickerControl
            name="Relation"
            className="w-full"
            groups={[{ key: 'relations', entries: offered.map((r) => ({ value: r.id, name: r.name, badge: relationSyntaxAsText(r) })) }]}
            value={template.id}
            placeholder=""
            onChoose={choose}
          />
        </div>
        <Strip right={`${used} von ${all.length} belegt`}>Stellen</Strip>
        <Places
          key={template.id}
          template={template}
          filled={step}
          choices={choices}
          onChange={(filled) => onChange({ ...step, parameter: [...filled.parameter], extraParameter: [...filled.extraParameter] })}
        />
      </div>
      <div className="flex min-h-0 flex-col overflow-y-auto">
        <Strip>Ergebnis</Strip>
        <Result template={template} filled={step} choices={choices} />
        <Strip>Bezeichnung</Strip>
        <div className="px-[12px] py-[9px]">{template.name}</div>
      </div>
    </div>
  )
}

function RelationList({ relations, onChoose }: {
  relations: readonly RelationTemplate[]
  onChoose: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const hits = relations.filter((r) => relationFitsToSearch(r, search))
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Strip right={hits.length}>
        <input
          aria-label="Relationen durchsuchen"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          className="h-[22px] w-[260px] rounded border border-line bg-panel px-[6px] font-normal text-ui text-ink outline-none focus:border-accent"
        />
      </Strip>
      <Grid columns={[{ name: 'Syntax', mono: true }, { name: 'Bezeichnung', width: 300 }]}>
        {hits.map((r) => (
          <tr key={r.id} className="cursor-pointer hover:bg-accent-soft" onClick={() => onChoose(r.id)}>
            <td className={cn(TD, 'truncate px-[10px] font-mono text-dense')} title={relationSyntaxAsText(r)}>{relationSyntaxAsText(r)}</td>
            <td className={cn(TD, 'truncate px-[10px]')}>{r.name}</td>
          </tr>
        ))}
      </Grid>
    </div>
  )
}

// A tool: its number, then its parameters as lines, each typed.
function ToolBody({ step, onChange }: { step: StartToolStep; onChange: (step: StartToolStep) => void }) {
  const params = step.toolParameter
  const setAt = (i: number, value: string) => onChange({ ...step, toolParameter: params.map((q, k) => (k === i ? value : q)) })
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
      <Grid columns={[{ name: 'Nr.', width: 44, right: true }, { name: 'Eingabe' }]} bin>
        {params.map((p, i) => (
          <tr key={i} className="group hover:bg-accent-soft">
            <td className={cn(TD, 'px-[10px] text-right font-mono text-dense text-muted')}>{i + 1}</td>
            <td className={cn(TD, 'px-[4px]')}>
              <input
                aria-label={`Parameter ${i + 1}`}
                value={p}
                onChange={(e) => setAt(i, e.currentTarget.value)}
                className="h-[24px] w-full rounded border border-transparent bg-transparent px-[6px] outline-none focus:border-accent focus:bg-panel"
              />
            </td>
            <td className={cn(TD, 'text-center')}>
              <button
                type="button"
                aria-label={`Parameter ${i + 1} entfernen`}
                title="Entfernen"
                onClick={() => onChange({ ...step, toolParameter: params.filter((_, k) => k !== i) })}
                className="text-muted opacity-0 hover:text-error group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </td>
          </tr>
        ))}
        <tr className="cursor-pointer text-muted hover:bg-accent-soft" onClick={() => onChange({ ...step, toolParameter: [...params, ''] })}>
          <td className={TD} />
          <td className={cn(TD, 'px-[10px]')} colSpan={2}>
            <span className="flex items-center gap-[8px]"><Plus size={13} className="text-accent" /> Parameter hinzufügen</span>
          </td>
        </tr>
      </Grid>
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
