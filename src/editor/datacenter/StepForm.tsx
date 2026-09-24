import { useMemo, useReducer, useRef } from 'react'
import { Plus } from '@/editor/icons/icon'
import { Field } from '@/editor/widgets/Field'
import { Group } from '@/editor/widgets/Group'
import { Button } from '@/editor/widgets/Button'
import { Row } from '@/editor/widgets/Row'
import { relationParameterDefault } from '../../core/data/actions'
import { resultStepsBefore, stepProblem, stepsBefore } from '../../core/data/steps/chains'
import { relationBinding } from '../../core/data/steps/relation'
import { STEP_KINDS, stepAdapter, type Step, type StepKind } from '../../core/data/steps/steps'
import { blockType } from '../../core/block/registry'
import { capability } from '../../core/block/capability'
import {
  valueSpotsInTree,
  selectionGiverInTree,
  changeCarrierInTree,
  captureCarrierInTree,
  deleteCarrierInTree,
} from '../../core/block/treeQuery'
import { parameterRole, relationFitsToSearch } from '../../core/data/relations'
import { FieldAdoptPicker } from './FieldAdoptPicker'
import { fieldAdopt, type FieldAdoptTarget } from './fieldAdopt'
import { blockName } from '../../core/block/blockName'
import { isWindowPage, pagesOfMask } from '../../core/block/pages'
import {
  selectionGiverOptions,
  blockValueKey,
  captureOptions,
  type BlockValueOption,
} from './parameterText'
import {
  draftFrom,
  candidateFrom,
  stepReducer,
  templateOf,
} from './stepDraft'
import { ParameterRow } from './ParameterRow'
import type { ParameterChoices } from './parameter/choices'
import { relationPreview } from './parameter/relationPreview'
import { RelationPicker } from './RelationPicker'
import { useRelations } from '../state/useRelations'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { PickerControl } from '../inspector/controls/PickerControl'
import { SelectControl } from '../inspector/controls/SelectControl'

interface StepFormProps {
  step?: Step

  chain: readonly Step[]
  onSave: (step: Step) => void
  onClose: () => void
}

export function StepForm({ step, chain, onSave, onClose }: StepFormProps) {
  const relationStore = useRelations()
  const dataSources = useDataSources()
  const ed = useEditor()

  const templates = relationStore.list
  const sources = dataSources.list
  const tree = ed.tree

  const reducer = useMemo(() => stepReducer(templates), [templates])
  const [draft, dispatch] = useReducer(reducer, undefined, () => draftFrom(step, templates))
  const pickerAnchor = useRef<HTMLElement | null>(null)

  const selections = useMemo(() => {
    const blockValues: BlockValueOption[] = valueSpotsInTree(tree).map(({ node, spot }) => {
      const def = blockType(node.type)
      const name = blockName(node, sources)
      const severalSpots = (capability(def, 'actionValue')?.spots.length ?? 0) > 1
      return {
        key: blockValueKey(node.id, spot.prop),
        blockId: node.id,
        prop: spot.prop,
        label: severalSpots ? `${name} — ${spot.name}` : name,
      }
    })
    const giver = selectionGiverOptions(selectionGiverInTree(tree), sources)
    const popupPages = pagesOfMask(tree).filter(isWindowPage)
    return {
      blockValues,
      actionValueRefs: blockValues.map(({ blockId, prop }) => ({ blockId, prop })),
      giver,
      giverIds: giver.map((g) => g.blockId),
      captures: captureOptions(captureCarrierInTree(tree), sources),

      changes: captureOptions(changeCarrierInTree(tree), sources),

      deletions: captureOptions(deleteCarrierInTree(tree), sources),
      popupPages,
      popupIds: popupPages.map((page) => page.id),
    }
  }, [tree, sources])

  const resultSteps = useMemo(
    () => resultStepsBefore(chain, step?.id, templates),
    [chain, step?.id, templates],
  )
  const resultIds = useMemo(() => resultSteps.map((s) => s.id), [resultSteps])

  const choices: ParameterChoices = useMemo(() => ({
    dataSources: sources,
    blockValues: selections.blockValues,
    giver: selections.giver,
    captures: selections.captures,
    changes: selections.changes,
    deletions: selections.deletions,
    steps: resultSteps,
  }), [sources, selections, resultSteps])

  const relation = useMemo(
    () => templateOf(templates, draft.relationId),
    [templates, draft.relationId],
  )
  const defaults = useMemo(
    () => (relation ? relationParameterDefault(relation) : []),
    [relation],
  )
  const visibleRelation = useMemo(
    () => templates.filter((entry) => relationFitsToSearch(entry, draft.search)),
    [templates, draft.search],
  )

  const candidate = useMemo(
    () => candidateFrom(draft, relation, step),
    [draft, relation, step],
  )
  const problem = useMemo(
    () => stepProblem(candidate, {
      relations: templates,
      dataSources: sources,
      popupIds: selections.popupIds,
      resultIds,
      actionValues: selections.actionValueRefs,
      selectionGiverIds: selections.giverIds,
      before: stepsBefore(chain, step?.id),
    }),
    [candidate, templates, sources, selections, resultIds, chain, step?.id],
  )

  const fields = stepAdapter(draft.type).form.fields
  const binding = (index: number) => relationBinding(draft, defaults, index)
  const errorText = draft.showError ? problem ?? undefined : undefined

  const skipped = relation
    ? relation.parameter.map((_, index) => index).filter((i) => binding(i).source === 'omitted')
    : []

  const fieldTriggerActive = relation
    ? relation.parameter.some((raw) => parameterRole(raw) === 'pos')
      && relation.parameter.some((raw) => parameterRole(raw) === 'len')
    : false

  const adoptedValue = (kind: 'pos' | 'len'): string | null => {
    if (!relation) return null
    const index = relation.parameter.findIndex((raw) => parameterRole(raw) === kind)
    if (index < 0) return null
    const b = binding(index)
    return b.source === 'fixed' && /^\d+$/.test(b.value) ? b.value : null
  }
  const adoptPos = adoptedValue('pos')
  const adoptLen = adoptedValue('len')
  const currentAdoptCode = adoptPos !== null && adoptLen !== null
    ? `${adoptPos}_${adoptLen}`
    : ''

  function openAdoptPicker(target: FieldAdoptTarget, anchor: HTMLElement) {
    if (draft.pickerTarget === target && pickerAnchor.current === anchor) {
      dispatch({ kind: 'picker', target: null })
      return
    }
    pickerAnchor.current = anchor
    dispatch({ kind: 'picker', target })
  }

  function adoptField(sourceId: string, code: string) {
    const target = draft.pickerTarget
    if (!relation || !target) return
    const source = sources.find((entry) => entry.id === sourceId)
    if (!source) return
    const field = target === 'field' ? source.fields.find((entry) => entry.code === code) : undefined
    if (target === 'field' && !field) return
    const current = relation.parameter.map((_, index) => binding(index))
    const result = fieldAdopt(current, relation, source, code, target)
    dispatch({ kind: 'adopt', params: result.params })
  }

  function save() {
    if (problem) {
      dispatch({ kind: 'showError' })
      return
    }
    onSave(candidate)
    onClose()
  }

  return (
    <div className="flex flex-col gap-3">
      <SelectControl
        label="Aktion"
        value={draft.type}
        options={STEP_KINDS.map((key) => ({ value: key, name: stepAdapter(key).name }))}
        onChange={(value) => dispatch({ kind: 'type', type: value as StepKind })}
      />

      {fields.includes('popup') && (
        <PickerControl
          label="Popup"
          error={errorText}
          name="Popup"
          groups={[{
            key: 'popups',
            entries: selections.popupPages.map((page) => ({ value: page.id, name: page.name })),
          }]}
          value={draft.popupId}
          onChoose={(id) => dispatch({ kind: 'popup', id })}
        />
      )}

      {fields.includes('toolNumber') && (
        <Row label="Nummer" error={errorText}>
          {(control) => (
            <Field
              {...control}
              value={draft.toolNumber}
              className="w-28"
              onChange={(e) => dispatch({ kind: 'toolNumber', value: e.currentTarget.value })}
            />
          )}
        </Row>
      )}

      {fields.includes('command') && (
        <Row label="Befehl" error={errorText}>
          {(control) => (
            <Field
              {...control}
              value={draft.command}
              onChange={(e) => dispatch({ kind: 'command', value: e.currentTarget.value })}
            />
          )}
        </Row>
      )}

      {fields.includes('relation') && (
        <>
          <RelationPicker
            label="Relation"
            entries={visibleRelation}
            relationId={draft.relationId}
            search={draft.search}
            onSearch={(value) => dispatch({ kind: 'search', value })}
            onSelect={(id) => dispatch({ kind: 'relation', id, chosen: templateOf(templates, id) })}
          />

          {relation && (
            <>

              <Group title="Parameter">
                {relation.parameter.map((raw, index) => {
                  if (binding(index).source === 'omitted') return null
                  const parameterKind = parameterRole(raw)
                  const trigger = parameterKind === 'relid'
                    ? 'idb'
                    : parameterKind === 'pos' && fieldTriggerActive
                      ? 'field'
                      : undefined
                  return (
                    <ParameterRow
                      key={index}
                      number={index + 1}
                      template={raw}
                      binding={binding(index)}
                      choices={choices}
                      placeholder={raw}
                      remove={{
                        label: `Parameter ${index + 1} für diese Aktion weglassen`,
                        onClick: () =>
                          dispatch({ kind: 'binding', index, binding: { source: 'omitted', value: '' } }),
                      }}
                      trigger={trigger}
                      onChange={(next) => dispatch({ kind: 'binding', index, binding: next })}
                      onTrigger={trigger
                        ? (anchor) => openAdoptPicker(trigger, anchor)
                        : undefined}
                    />
                  )
                })}
                {skipped.length > 0 && (
                  <div className="flex items-center justify-between gap-2 text-dense text-muted">
                    <span>
                      {`Weggelassen: ${skipped.map((i) => i + 1).join(', ')}`}
                    </span>
                    <Button onClick={() => dispatch({ kind: 'bringBack' })}>Zurückholen</Button>
                  </div>
                )}
              </Group>

              <p className="break-all font-mono text-dense text-muted">
                {relationPreview(
                  relation,
                  relation.parameter.map((_, index) => binding(index)),
                  draft.extraParams,
                  choices,
                )}
              </p>
              {draft.pickerTarget && (
                <FieldAdoptPicker
                  sources={sources}
                  target={draft.pickerTarget}
                  current={currentAdoptCode}
                  anchor={pickerAnchor}
                  onPick={adoptField}
                  onClose={() => dispatch({ kind: 'picker', target: null })}
                />
              )}
            </>
          )}

          {relation?.extraParameterAllowed && (
            <Group
              title="Zusatzparameter"
              actions={(
                <Button onClick={() => dispatch({ kind: 'extraAdd' })}>
                  <Plus size={13} /> Parameter
                </Button>
              )}
            >
              {draft.extraParams.map((binding, index) => (
                <ParameterRow
                  key={index}
                  number={index + 1}
                  binding={binding}
                  choices={choices}
                  remove={{
                    label: `Zusatzparameter ${index + 1} entfernen`,
                    onClick: () => dispatch({ kind: 'extraRemove', index }),
                  }}
                  onChange={(next) => dispatch({ kind: 'extraChange', index, binding: next })}
                />
              ))}
            </Group>
          )}

        </>
      )}

      {draft.showError && problem && fields.includes('relation') && (
        <p className="text-ui text-error">{problem}</p>
      )}

      <div className="flex justify-end gap-2 border-t border-line pt-3">
        <Button onClick={onClose}>Abbrechen</Button>
        <Button kind="primary" onClick={save}>Speichern</Button>
      </div>
    </div>
  )
}
