import { useMemo, useState } from 'react'
import { Button } from '@/editor/widgets/Button'
import { NAME, Strip } from '@/editor/widgets/Grid'
import { Segment } from '@/editor/widgets/Segment'
import { Window } from '@/editor/widgets/Window'
import { relationGroup, relationSyntaxAsText, type RelationTemplate } from '../../core/data/relations'
import { resultStepsBefore } from '../../core/data/steps/chains'
import type { PopupCloseStep } from '../../core/data/steps/popupClose'
import type { PopupOpenStep } from '../../core/data/steps/popupOpen'
import type { RelationStep } from '../../core/data/steps/relation'
import type { Step } from '../../core/data/steps/steps'
import { PickerControl } from '../controls/PickerControl'
import type { Reach } from '../origin/reach'
import { RelationBody } from './RelationBody'

export type StepTab = 'GET' | 'PUT' | 'POPUP'

export interface StepContext {
  relations: readonly RelationTemplate[]
  popups: readonly { value: string; name: string }[]
  reach: Omit<Reach, 'steps'>
}

type PopupStep = PopupOpenStep | PopupCloseStep

const isPopupStep = (step: Step | undefined): step is PopupStep =>
  step?.kind === 'POPUP_OPEN' || step?.kind === 'POPUP_CLOSE'

const TABS: readonly { key: StepTab; name: string }[] = [
  { key: 'GET', name: 'GET Relation' },
  { key: 'PUT', name: 'PUT Relation' },
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
  const [popup, setPopup] = useState<PopupStep>(() => (isPopupStep(step)
    ? step
    : { id, kind: 'POPUP_OPEN', resultName: '', popupId: '' }))

  const reach: Reach = useMemo(() => ({
    ...context.reach,
    steps: resultStepsBefore(chain, id, context.relations),
  }), [context, chain, id])

  const draft: Step = tab === 'GET' ? get : tab === 'PUT' ? put : popup
  const template = draft.kind === 'RELATION' ? context.relations.find((r) => r.id === draft.relationId) : undefined
  const popupName = context.popups.find((p) => p.value === popup.popupId)?.name ?? ''
  const { ready, head } = draft.kind === 'RELATION'
    ? { ready: template !== undefined, head: template ? relationSyntaxAsText(template) : '' }
    : { ready: popupName !== '', head: popupName !== '' ? `Popup ${popupName} ${draft.kind === 'POPUP_OPEN' ? 'öffnen' : 'schließen'}` : '' }

  return (
    <Window
      title={`Schritt ${nr}`}
      beside={(
        <span className="min-w-0 truncate border-l border-line-soft pl-[14px] font-mono text-dense text-muted" title={head}>
          {head}
        </span>
      )}
      tabs={TABS.map((t) => ({ ...t, ...(t.key === 'GET' ? { count: reads } : t.key === 'PUT' ? { count: writes } : {}) }))}
      tab={tab}
      onTab={setTab}
      width={1040}
      height={720}
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
              reach={reach}
              onChange={tab === 'GET' ? setGet : setPut}
            />
          )
        : <PopupBody step={popup} popups={context.popups} onChange={setPopup} />}
    </Window>
  )
}

// A popup: open or close, and which one.
function PopupBody({ step, popups, onChange }: {
  step: PopupStep
  popups: readonly { value: string; name: string }[]
  onChange: (step: PopupStep) => void
}) {
  const choose = (kind: string): void => {
    onChange({ ...step, kind: kind === 'POPUP_CLOSE' ? 'POPUP_CLOSE' : 'POPUP_OPEN' })
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Strip>Popup</Strip>
      <div className="grid grid-cols-[112px_260px] items-center gap-[8px] px-[12px] py-[8px]">
        <span className={NAME}>Aktion</span>
        <Segment
          name="Aktion"
          options={[
            { value: 'POPUP_OPEN', name: 'öffnen' },
            { value: 'POPUP_CLOSE', name: 'schließen' },
          ]}
          value={step.kind}
          onChoose={choose}
        />
        <span className={NAME}>Popup</span>
        <PickerControl
          name="Popup"
          className="w-full"
          groups={[{ key: 'popups', entries: popups }]}
          value={step.popupId}
          onChoose={(id) => onChange({ ...step, popupId: id })}
        />
      </div>
    </div>
  )
}
