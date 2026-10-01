import { useMemo, useRef, useState, type ReactNode } from 'react'
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
import { choosable, originOfParameter, parameterOfOrigin, parameterOffer } from './parameterOrigin'

// How a step is named.
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

// The actions of a block under their event, as SoftEngine lists a relation:
// a line per place, its name on the left, what stands there on the right.
// Only fixed values are typed.
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
          <section key={ev.key} className="flex flex-col gap-[6px]">
            <span className="text-label font-semibold uppercase tracking-label text-muted">{ev.name}</span>
            {chain.map((step, i) => (
              <StepLines
                key={step.id}
                step={step}
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

const NAME_WIDTH = 104

// A line of a step: the name of the place, as .vfeld-label writes it, and
// what stands there. At the end, if any, the buttons of the line.
function Line({ name, end, children }: { name: string; end?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-control items-center gap-[8px]">
      <span
        className="shrink-0 truncate text-label font-semibold uppercase tracking-label text-muted"
        style={{ width: NAME_WIDTH }}
        title={name}
      >
        {name}
      </span>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
      {end !== undefined && <div className="flex shrink-0 items-center">{end}</div>}
    </div>
  )
}

// What a place holds without a choice: the relation fills it, or the field
// line above fills it.
function Filled({ children }: { children: string }) {
  return <span className="truncate px-[2px] text-ui text-muted">{children}</span>
}

// A place named by its role without braces reads as the braced one does.
const ROLE_NAMES: Record<string, string> = {
  pos: 'Position',
  len: 'Länge',
  relid: 'Tabelle',
}

// Where a place of the event takes its value from, in a few words.
const CONTEXT_TEXT: Record<string, string> = {
  PINDEX: 'vom Ereignis',
  DROP_PINDEX: 'vom Ereignis',
  VALUE: 'Ereigniswert',
  NOW_DATE: 'Heutiges Datum',
}

function contextText(binding: Parameter, choices: ParameterChoices): string {
  return binding.source === 'context'
    ? CONTEXT_TEXT[binding.value] ?? bindingText(binding, choices)
    : bindingText(binding, choices)
}

// The lines of one step, a thin line above the second step onwards. The first
// line carries the step's buttons: up and remove.
function StepLines({ step, chain, context, onChange, onUp, onRemove }: {
  step: Step
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

  const end = (
    <>
      {onUp && (
        <Button onlyIcon aria-label="Schritt nach oben" title="Nach oben" onClick={onUp}>
          <ArrowUp size={12} />
        </Button>
      )}
      <Button onlyIcon aria-label="Schritt entfernen" title="Entfernen" onClick={onRemove}>
        <X size={13} />
      </Button>
    </>
  )

  return (
    <div className="flex flex-col gap-[3px] border-t border-line pt-[4px] first-of-type:border-t-0 first-of-type:pt-0">
      <StepBody step={step} context={context} choices={choices} end={end} onChange={onChange} />
    </div>
  )
}

function StepBody({ step, context, choices, end, onChange }: {
  step: Step
  context: Context
  choices: ParameterChoices
  end: ReactNode
  onChange: (step: Step) => void
}) {
  switch (step.kind) {
    case 'RELATION':
      return <RelationLines step={step} context={context} choices={choices} end={end} onChange={onChange} />
    case 'POPUP_OPEN':
    case 'POPUP_CLOSE':
      return (
        <Line name={STEP_NAMES[step.kind]} end={end}>
          <PickerControl
            name="Popup"
            className="w-full"
            groups={[{ key: 'popups', entries: context.popups.map((p) => ({ value: p.id, name: p.name })) }]}
            value={step.popupId}
            placeholder=""
            onChoose={(popupId) => onChange({ ...step, popupId })}
          />
        </Line>
      )
    case 'START_TOOL':
      return (
        <>
          <Line name={STEP_NAMES.START_TOOL} end={end}>
            <InlineText name="Werkzeugnummer" value={step.toolNumber} onChange={(toolNumber) => onChange({ ...step, toolNumber })} />
          </Line>
          {step.toolParameter.map((p, at) => (
            <Line
              key={at}
              name={`Parameter ${at + 1}`}
              end={(
                <Button
                  onlyIcon
                  aria-label={`Parameter ${at + 1} entfernen`}
                  onClick={() => onChange({ ...step, toolParameter: step.toolParameter.filter((_, x) => x !== at) })}
                >
                  <X size={12} />
                </Button>
              )}
            >
              <InlineText
                name={`Parameter ${at + 1}`}
                value={p}
                onChange={(value) => onChange({ ...step, toolParameter: step.toolParameter.map((q, x) => (x === at ? value : q)) })}
              />
            </Line>
          ))}
          <Line name="">
            <Button onClick={() => onChange({ ...step, toolParameter: [...step.toolParameter, ''] })}>
              <Plus size={12} /> Parameter
            </Button>
          </Line>
        </>
      )
    case 'BW_LINK':
      return (
        <Line name={STEP_NAMES.BW_LINK} end={end}>
          <InlineText name="Befehl" value={step.command} onChange={(command) => onChange({ ...step, command })} />
        </Line>
      )
  }
}

// A relation, then its places in the order of its syntax. A place the field
// line fills (position, length, table) and a place the relation fills itself
// (the record number) stand as text; every other place is chosen.
function RelationLines({ step, context, choices, end, onChange }: {
  step: RelationStep
  context: Context
  choices: ParameterChoices
  end: ReactNode
  onChange: (step: Step) => void
}) {
  const template = context.relations.find((r) => r.id === step.relationId)
  const offer = parameterOffer(choices)
  const byField = template?.parameter.some((p) => parameterRole(p) === 'pos') === true
  const setParam = (list: 'parameter' | 'extraParameter', at: number, binding: Parameter) =>
    onChange({ ...step, [list]: step[list].map((b, x) => (x === at ? binding : b)) })

  return (
    <>
      <Line name={STEP_NAMES.RELATION} end={end}>
        <PickerControl
          name="Relation"
          className="w-full"
          groups={[{ key: 'relations', entries: context.relations.map((r) => ({ value: r.id, name: r.name, badge: `${r.verb.replace('_RELATION', '')} ${r.nr}` })) }]}
          value={step.relationId}
          placeholder=""
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
      </Line>
      {template && byField && (
        <FieldLine step={step} template={template} sources={choices.dataSources} onChange={onChange} />
      )}
      {template && step.parameter.map((binding, at) => {
        const raw = template.parameter[at] ?? ''
        const name = placeholderName(raw) || ROLE_NAMES[parameterRole(raw) ?? ''] || raw || `Stelle ${at + 1}`
        const filledByField = byField && parameterRole(raw) !== null
        if (filledByField) {
          return <Line key={at} name={name}><Filled>{binding.source === 'fixed' ? binding.value : ''}</Filled></Line>
        }
        if (!choosable(binding)) {
          return <Line key={at} name={name}><Filled>{contextText(binding, choices)}</Filled></Line>
        }
        return (
          <Line key={at} name={name}>
            <OriginPicker
              name={name}
              className="w-full"
              origin={originOfParameter(binding, choices)}
              shown={binding.source === 'context' ? contextText(binding, choices) : undefined}
              offer={offer}
              onChoose={(origin) => {
                const next = parameterOfOrigin(origin, choices)
                if (next !== null) setParam('parameter', at, next)
              }}
            />
          </Line>
        )
      })}
      {template?.extraParameterAllowed === true && (
        <>
          {step.extraParameter.map((binding, at) => (
            <Line
              key={`extra${at}`}
              name={`Zusatz ${at + 1}`}
              end={(
                <Button
                  onlyIcon
                  aria-label={`Zusatz ${at + 1} entfernen`}
                  onClick={() => onChange({ ...step, extraParameter: step.extraParameter.filter((_, x) => x !== at) })}
                >
                  <X size={12} />
                </Button>
              )}
            >
              <OriginPicker
                name={`Zusatz ${at + 1}`}
                className="w-full"
                origin={originOfParameter(binding, choices)}
                offer={offer}
                onChoose={(origin) => {
                  const next = parameterOfOrigin(origin, choices)
                  if (next !== null) setParam('extraParameter', at, next)
                }}
              />
            </Line>
          ))}
          <Line name="">
            <Button onClick={() => onChange({ ...step, extraParameter: [...step.extraParameter, { source: 'fixed', value: '' }] })}>
              <Plus size={12} /> Zusatz
            </Button>
          </Line>
        </>
      )}
    </>
  )
}

const FIELD_KEY = '::'

// A relation that names position and length of a field takes them, and the
// table, from one field of a source.
function FieldLine({ step, template, sources, onChange }: {
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
    <Line name="Feld">
      <PickerControl
        name="Feld"
        className="w-full"
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
    </Line>
  )
}

function InlineText({ name, value, onChange }: {
  name: string
  value: string
  onChange: (value: string) => void
}) {
  const ed = useEditor()
  const session = useInputSession(() => ed.beginTransaction(), () => ed.endTransaction())
  return (
    <Field
      aria-label={name}
      title={name}
      value={value}
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
