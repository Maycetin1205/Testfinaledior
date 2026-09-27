import { useMemo, useRef, useState } from 'react'
import { ArrowUp, Plus, X } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { Field } from '@/editor/widgets/Field'
import { List } from '@/editor/widgets/List'
import { Popover } from '@/editor/widgets/Popover'
import type { BlockNode } from '../../core/block/tree'
import type { EventDef } from '../../core/block/capability'
import { blockType } from '../../core/block/registry'
import { capability } from '../../core/block/capability'
import { blockName } from '../../core/block/blockName'
import { isWindowPage, pagesOfMask } from '../../core/block/pages'
import {
  captureCarrierInTree,
  changeCarrierInTree,
  deleteCarrierInTree,
  selectionGiverInTree,
  valueSpotsInTree,
} from '../../core/block/treeQuery'
import { relationParameterDefault, type Parameter } from '../../core/data/actions'
import type { DataSource } from '../../core/data/dataSources'
import {
  fieldCodeSplit,
  parameterRole,
  relIdFromIdbId,
  type RelationTemplate,
} from '../../core/data/relations'
import type { RelationStep } from '../../core/data/steps/relation'
import { resultStepsBefore } from '../../core/data/steps/chains'
import type { StepFormValues } from '../../core/data/steps/stepAdapter'
import { STEP_KINDS, stepAdapter, type Step, type StepKind } from '../../core/data/steps/steps'
import { OriginPicker } from '../controls/OriginPicker'
import type { OriginOffer } from '../controls/originOffer'
import { PickerControl } from '../controls/PickerControl'
import { useInputSession } from '../controls/useInputSession'
import { adoptFields, fieldAdopt } from '../datacenter/fieldAdopt'
import { bindingText } from '../datacenter/parameter/bindingRegistry'
import type { ParameterChoices } from '../datacenter/parameter/choices'
import {
  blockValueKey,
  captureOptions,
  placeholderName,
  selectionGiverOptions,
  type BlockValueOption,
} from '../datacenter/parameterText'
import { useDataSources } from '../state/useDataSources'
import { useEditor } from '../state/useEditor'
import { useRelations } from '../state/useRelations'
import { Labeled } from './BarControl'
import { choosable, originOfParameter, parameterOfOrigin, parameterOffer } from './parameterOrigin'

// How a step reads in its sentence.
const STEP_NAMES: Record<StepKind, string> = {
  RELATION: 'Relation',
  POPUP_OPEN: 'Popup öffnen',
  POPUP_CLOSE: 'Popup schließen',
  START_TOOL: 'Werkzeug starten',
  BW_LINK: 'BW-Befehl',
}

const EMPTY_VALUES: StepFormValues = {
  toolNumber: '',
  command: '',
  popupId: '',
  relationId: '',
  relationParams: [],
  extraParams: [],
}

interface Context {
  relations: readonly RelationTemplate[]
  popups: readonly { id: string; name: string }[]
  choices: Omit<ParameterChoices, 'steps'>
}

// The actions of a block as sentences under their event: a step a line, every
// part of it a small choice, only fixed values typed.
export function ActionsSection({ block, events }: { block: BlockNode; events: readonly EventDef[] }) {
  const ed = useEditor()
  const relations = useRelations().list
  const sources = useDataSources().list
  const tree = ed.tree

  const context: Context = useMemo(() => {
    const blockValues: BlockValueOption[] = valueSpotsInTree(tree).map(({ node, spot }) => {
      const name = blockName(node, sources)
      const severalSpots = (capability(blockType(node.type), 'actionValue')?.spots.length ?? 0) > 1
      return {
        key: blockValueKey(node.id, spot.prop),
        blockId: node.id,
        prop: spot.prop,
        label: severalSpots ? `${name} — ${spot.name}` : name,
      }
    })
    return {
      relations,
      popups: pagesOfMask(tree).filter(isWindowPage).map((p) => ({ id: p.id, name: p.name })),
      choices: {
        dataSources: sources,
        blockValues,
        giver: selectionGiverOptions(selectionGiverInTree(tree), sources),
        captures: captureOptions(captureCarrierInTree(tree), sources),
        changes: captureOptions(changeCarrierInTree(tree), sources),
        deletions: captureOptions(deleteCarrierInTree(tree), sources),
      },
    }
  }, [tree, sources, relations])

  const chainOf = (key: string): Step[] => tree[block.id]?.chains?.[key] ?? []
  const setChain = (key: string, steps: Step[]): void => {
    const node = ed.tree[block.id]
    if (!node) return
    ed.updateBlockEvents(block.id, { ...(node.chains ?? {}), [key]: steps })
  }

  return (
    <div className="flex flex-col gap-[10px]">
      {events.map((ev) => {
        const chain = chainOf(ev.key)
        const set = (steps: Step[]) => setChain(ev.key, steps)
        return (
          <section key={ev.key} className="flex flex-col gap-[4px]">
            <span className="text-label font-semibold uppercase tracking-label text-muted">{ev.name}</span>
            {chain.map((step, i) => (
              <StepLine
                key={step.id}
                step={step}
                first={i === 0}
                chain={chain}
                context={context}
                onChange={(next) => set(chain.map((s) => (s.id === step.id ? next : s)))}
                onUp={i === 0 ? undefined : () => {
                  const next = [...chain]
                  next.splice(i - 1, 0, ...next.splice(i, 1))
                  set(next)
                }}
                onRemove={() => set(chain.filter((s) => s.id !== step.id))}
              />
            ))}
            <AddStep
              onAdd={(kind) => set([...chain, stepAdapter(kind).form.step(crypto.randomUUID(), EMPTY_VALUES, undefined, undefined)])}
            />
          </section>
        )
      })}
    </div>
  )
}

function StepLine({ step, first, chain, context, onChange, onUp, onRemove }: {
  step: Step
  first: boolean
  chain: readonly Step[]
  context: Context
  onChange: (step: Step) => void
  onUp?: () => void
  onRemove: () => void
}) {
  const choices: ParameterChoices = useMemo(() => ({
    ...context.choices,
    steps: resultStepsBefore(chain, step.id, context.relations),
  }), [context, chain, step.id])

  return (
    <div className="flex items-start gap-[4px]">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-[6px] gap-y-[4px] text-ui text-ink">
        {!first && <span className="text-muted">dann</span>}
        <Sentence step={step} context={context} choices={choices} onChange={onChange} />
      </div>
      {onUp && (
        <Button onlyIcon aria-label="Schritt nach oben" title="Nach oben" onClick={onUp}>
          <ArrowUp size={12} />
        </Button>
      )}
      <Button onlyIcon aria-label="Schritt entfernen" title="Entfernen" onClick={onRemove}>
        <X size={13} />
      </Button>
    </div>
  )
}

function Sentence({ step, context, choices, onChange }: {
  step: Step
  context: Context
  choices: ParameterChoices
  onChange: (step: Step) => void
}) {
  switch (step.kind) {
    case 'RELATION': {
      const template = context.relations.find((r) => r.id === step.relationId)
      const offer = parameterOffer(choices)
      const setParam = (list: 'parameter' | 'extraParameter', at: number, binding: Parameter) =>
        onChange({ ...step, [list]: step[list].map((b, x) => (x === at ? binding : b)) })
      return (
        <>
          <PickerControl
            name="Relation"
            className="w-auto max-w-[220px]"
            groups={[{ key: 'relations', entries: context.relations.map((r) => ({ value: r.id, name: r.name, badge: `${r.verb.replace('_RELATION', '')} ${r.nr}` })) }]}
            value={step.relationId}
            placeholder={STEP_NAMES.RELATION}
            onChoose={(id) => {
              const chosen = context.relations.find((r) => r.id === id)
              if (!chosen) return
              onChange({
                ...step,
                relationId: id,
                parameter: relationParameterDefault(chosen),
                extraParameter: chosen.extraParameterAllowed ? step.extraParameter : [],
              })
            }}
          />
          {template?.parameter.some((p) => parameterRole(p) === 'pos') === true && (
            <FieldPart step={step} template={template} sources={choices.dataSources} onChange={onChange} />
          )}
          {template && step.parameter.length > 0 && <span className="text-muted">mit</span>}
          {template && step.parameter.map((binding, at) => (
            <ParameterPart
              key={at}
              name={placeholderName(template.parameter[at] ?? '') || template.parameter[at] || `Parameter ${at + 1}`}
              binding={binding}
              choices={choices}
              offer={offer}
              onChange={(b) => setParam('parameter', at, b)}
            />
          ))}
          {template?.extraParameterAllowed === true && (
            <>
              {step.extraParameter.map((binding, at) => (
                <span key={`extra${at}`} className="flex items-center">
                  <ParameterPart
                    name={`Zusatz ${at + 1}`}
                    binding={binding}
                    choices={choices}
                    offer={offer}
                    onChange={(b) => setParam('extraParameter', at, b)}
                  />
                  <Button
                    onlyIcon
                    aria-label={`Zusatz ${at + 1} entfernen`}
                    onClick={() => onChange({ ...step, extraParameter: step.extraParameter.filter((_, x) => x !== at) })}
                  >
                    <X size={12} />
                  </Button>
                </span>
              ))}
              <Button
                onlyIcon
                aria-label="Zusatz anfügen"
                title="Zusatz anfügen"
                onClick={() => onChange({ ...step, extraParameter: [...step.extraParameter, { source: 'fixed', value: '' }] })}
              >
                <Plus size={12} />
              </Button>
            </>
          )}
        </>
      )
    }
    case 'POPUP_OPEN':
    case 'POPUP_CLOSE':
      return (
        <>
          <span>Popup</span>
          <PickerControl
            name="Popup"
            className="w-auto max-w-[180px]"
            groups={[{ key: 'popups', entries: context.popups.map((p) => ({ value: p.id, name: p.name })) }]}
            value={step.popupId}
            placeholder=""
            onChoose={(popupId) => onChange({ ...step, popupId })}
          />
          <span>{step.kind === 'POPUP_OPEN' ? 'öffnen' : 'schließen'}</span>
        </>
      )
    case 'START_TOOL':
      return (
        <>
          <span>Werkzeug</span>
          <InlineText name="Werkzeugnummer" value={step.toolNumber} onChange={(toolNumber) => onChange({ ...step, toolNumber })} />
          <span>starten</span>
          {step.toolParameter.length > 0 && <span className="text-muted">mit</span>}
          {step.toolParameter.map((p, at) => (
            <InlineText
              key={at}
              name={`Parameter ${at + 1}`}
              value={p}
              onChange={(value) => onChange({ ...step, toolParameter: step.toolParameter.map((q, x) => (x === at ? value : q)) })}
            />
          ))}
          <Button
            onlyIcon
            aria-label="Parameter anfügen"
            title="Parameter anfügen"
            onClick={() => onChange({ ...step, toolParameter: [...step.toolParameter, ''] })}
          >
            <Plus size={12} />
          </Button>
        </>
      )
    case 'BW_LINK':
      return (
        <>
          <span>{STEP_NAMES.BW_LINK}</span>
          <InlineText name="Befehl" wide value={step.command} onChange={(command) => onChange({ ...step, command })} />
        </>
      )
  }
}

// A parameter of a relation: where its value comes from, or what the relation
// fills itself, like the record number of the event.
function ParameterPart({ name, binding, choices, offer, onChange }: {
  name: string
  binding: Parameter
  choices: ParameterChoices
  offer: OriginOffer
  onChange: (binding: Parameter) => void
}) {
  if (!choosable(binding)) {
    return <span className="rounded border border-line px-[6px] leading-[26px] text-muted" title={name}>{bindingText(binding, choices)}</span>
  }
  return (
    <Labeled label={name}>
      <OriginPicker
        name={name}
        className="w-auto max-w-[220px]"
        origin={originOfParameter(binding, choices)}
        shown={binding.source === 'context' ? bindingText(binding, choices) : undefined}
        offer={offer}
        onChoose={(origin) => {
          const next = parameterOfOrigin(origin, choices)
          if (next !== null) onChange(next)
        }}
      />
    </Labeled>
  )
}

const FIELD_KEY = '::'

// A relation that names position and length of a field takes them, and the
// table, from one field of a source.
function FieldPart({ step, template, sources, onChange }: {
  step: RelationStep
  template: RelationTemplate
  sources: readonly DataSource[]
  onChange: (step: Step) => void
}) {
  const fixed = (role: string): string => {
    const at = template.parameter.findIndex((p) => parameterRole(p) === role)
    const b = at < 0 ? undefined : step.parameter[at]
    return b?.source === 'fixed' ? b.value.trim() : ''
  }
  const fields = adoptFields(sources)
  const hasTable = template.parameter.some((p) => parameterRole(p) === 'relid')
  const current = fields.find((f) => {
    const split = fieldCodeSplit(f.posLen)
    const source = sources.find((s) => s.id === f.sourceId)
    return split !== null && split.pos === fixed('pos') && split.len === fixed('len')
      && (!hasTable || relIdFromIdbId(source?.tableId ?? '') === fixed('relid'))
  })
  const bySource = sources
    .map((s) => ({ key: s.id, name: s.name, entries: fields
      .filter((f) => f.sourceId === s.id)
      .map((f) => ({ value: `${f.sourceId}${FIELD_KEY}${f.code}`, name: f.label || f.code, badge: f.code })) }))
    .filter((g) => g.entries.length > 0)

  return (
    <Labeled label="Feld">
      <PickerControl
        name="Feld"
        className="w-auto max-w-[220px]"
        groups={bySource}
        value={current ? `${current.sourceId}${FIELD_KEY}${current.code}` : ''}
        placeholder=""
        onChoose={(v) => {
          const at = v.indexOf(FIELD_KEY)
          const source = sources.find((s) => s.id === v.slice(0, at))
          if (!source) return
          const code = v.slice(at + FIELD_KEY.length)
          let params = fieldAdopt(step.parameter, template, source, code, 'field').params
          if (hasTable) params = fieldAdopt(params, template, source, code, 'idb').params
          onChange({ ...step, parameter: params })
        }}
      />
    </Labeled>
  )
}

function InlineText({ name, value, wide = false, onChange }: {
  name: string
  value: string
  wide?: boolean
  onChange: (value: string) => void
}) {
  const ed = useEditor()
  const session = useInputSession(() => ed.beginTransaction(), () => ed.endTransaction())
  return (
    <Field
      aria-label={name}
      title={name}
      value={value}
      className={wide ? 'w-40' : 'w-20'}
      onChange={(e) => {
        session.begin()
        onChange(e.currentTarget.value)
      }}
      onBlur={session.finish}
    />
  )
}

function AddStep({ onAdd }: { onAdd: (kind: StepKind) => void }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  return (
    <>
      <Button ref={button} className="self-start" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Plus size={13} /> Schritt
      </Button>
      {open && (
        <Popover name="Schritt" anchor={button} width={220} onClose={() => setOpen(false)}>
          <List
            groups={[{ key: 'kinds', entries: STEP_KINDS.map((kind) => ({ value: kind, name: STEP_NAMES[kind] })) }]}
            value=""
            onChoose={(kind) => {
              onAdd(kind as StepKind)
              setOpen(false)
            }}
          />
        </Popover>
      )}
    </>
  )
}
