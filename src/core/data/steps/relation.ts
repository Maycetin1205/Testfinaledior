import type { MaskTree } from '../../block/tree'
import { blockName } from '../../block/blockName'
import {
  CELLS_PARAM_SOURCES,
  RECORD_PLACEHOLDER,
  checkParameterBinding,
  relationParameterDefault,
  type Parameter,
} from '../actions'
import { sourcesKey, type DataSource } from '../dataSources'
import {
  fieldCodeSplit,
  isUnnamedTemplate,
  parameterRole,
  relIdFromIdbId,
  type RelationTemplate,
} from '../relations'
import type { Unread } from '../../unread'
import type { StepAdapter, StepBase, StepFormValues } from './stepAdapter'

export interface RelationStep extends StepBase {
  kind: 'RELATION'

  relationId: string

  parameter: Parameter[]

  extraParameter: Parameter[]
}

export type RuntimeRelationStep = Omit<RelationStep, 'id'>

function bindingsRead(raw: unknown): Parameter[] | null {
  if (!Array.isArray(raw)) return null
  const params: Parameter[] = []
  for (const value of raw) {
    const binding = checkParameterBinding(value)
    if (!binding) return null
    params.push(binding)
  }
  return params
}

function relationFields(
  raw: Unread<RuntimeRelationStep>,
): { relationId: string; parameter: Parameter[]; extraParameter: Parameter[] } | null {
  if (typeof raw.relationId !== 'string') return null
  const parameter = bindingsRead(raw.parameter)
  const extraParameter = bindingsRead(raw.extraParameter)
  if (!parameter || !extraParameter) return null
  return { relationId: raw.relationId, parameter, extraParameter }
}

function bindingProblem(binding: Parameter | undefined): boolean {
  if (!binding) return true

  if (binding.source === 'fixed' || binding.source === 'previousResult') return false
  if (binding.source === 'omitted') return false
  if (binding.source === 'dataField') {
    return !binding.sourceId?.trim() || binding.value.trim() === ''
  }

  if (binding.source === 'blockValue' || binding.source === 'chosenRow') {
    return !binding.blockId?.trim() || binding.value.trim() === ''
  }
  if (binding.source === 'stepResult') {
    if (binding.resultField !== undefined && binding.resultField.trim() === '') return true
    return binding.value.trim() === ''
  }
  return binding.value.trim() === ''
}

export function relationBinding(
  values: Pick<StepFormValues, 'relationParams'>,
  defaults: readonly Parameter[],
  index: number,
): Parameter {
  return values.relationParams[index] ?? defaults[index] ?? { source: 'fixed', value: '' }
}

function fixedValue(binding: Parameter | undefined): string {
  return binding?.source === 'fixed' ? binding.value.trim() : ''
}

function sourceFromRelId(
  relation: RelationTemplate,
  params: readonly Parameter[],
  sources: readonly DataSource[],
): DataSource | undefined {
  const index = relation.parameter.findIndex((p) => parameterRole(p) === 'relid')
  const value = index < 0 ? '' : fixedValue(params[index])
  if (value === '') return undefined
  return sources.find((q) => relIdFromIdbId(q.tableId) === value)
}

function fieldCodeFromParams(
  relation: RelationTemplate,
  params: readonly Parameter[],
): string {
  let pos = ''
  let len = ''
  relation.parameter.forEach((p, i) => {
    const role = parameterRole(p)
    if (role === 'pos') pos = fixedValue(params[i])
    else if (role === 'len') len = fixedValue(params[i])
  })
  return pos !== '' && len !== '' ? `${pos}_${len}` : ''
}

function plainNameForCode(
  code: string,
  source: DataSource | undefined,
  sources: readonly DataSource[],
): string {
  if (code === '') return ''
  const own = source?.fields.find((f) => f.code === code)
  if (own) return own.name
  if (source) return ''
  const hit = sources.filter((q) => q.fields.some((f) => f.code === code))
  return hit.length === 1
    ? (hit[0].fields.find((f) => f.code === code)?.name ?? '')
    : ''
}

function originText(
  binding: Parameter | undefined,
  tree: MaskTree,
  sources: readonly DataSource[],
  stepNumber: (id: string) => number,
): string {
  if (!binding) return ''
  switch (binding.source) {
    case 'fixed':
      return binding.value.trim() === '' ? '' : `Fest: ${binding.value.trim()}`
    case 'context':
      return binding.value === '' ? '' : binding.value
    case 'seVariable':
      return binding.value === '' ? '' : `SE VAR ${binding.value}`
    case 'previousResult':
      return 'Vorheriger Schritt'
    case 'omitted':
      return 'leer'
    case 'stepResult': {
      const number = stepNumber(binding.value)
      return number > 0 ? `Ergebnis von Schritt ${number}` : 'Ergebnis von Schritt'
    }
    case 'dataField': {
      const source = sources.find((q) => q.id === binding.sourceId)
      const field = source?.fields.find((f) => f.code === binding.value)?.name ?? ''
      if (!source) return ''
      return field === '' ? source.name : `${source.name} · ${field}`
    }
    case 'chosenRow': {
      const node = binding.blockId ? tree[binding.blockId] : undefined
      const field = plainNameForCode(binding.value, undefined, sources)
      const who = node ? blockName(node, sources) : 'Gewählte Zeile'
      return field === '' ? `Gewählte Zeile · ${who}` : `${who} · ${field}`
    }
    case 'blockValue': {
      const node = binding.blockId ? tree[binding.blockId] : undefined
      return node ? `Baustein „${blockName(node, sources)}“` : ''
    }
    case 'captureCell': {
      const node = binding.blockId ? tree[binding.blockId] : undefined
      const who = node ? blockName(node, sources) : 'Erfassungszelle'
      return `Erfassungszelle · ${who}`
    }
    case 'changeCell': {
      const node = binding.blockId ? tree[binding.blockId] : undefined
      const who = node ? blockName(node, sources) : 'Geänderte Zelle'
      return `Geänderte Zelle · ${who}`
    }
    case 'deleteCell': {
      const node = binding.blockId ? tree[binding.blockId] : undefined
      const who = node ? blockName(node, sources) : 'Gelöschte Zeile'
      return `Gelöschte Zeile · ${who}`
    }
    default:
      return ''
  }
}

function valueBinding(
  relation: RelationTemplate,
  params: readonly Parameter[],
): Parameter | undefined {
  const index = relation.parameter.findIndex((p) => p.trim().toUpperCase() === '{VALUE}')
  return index < 0 ? undefined : params[index]
}

function withBindings(step: RelationStep, map: (binding: Parameter) => Parameter): RelationStep {
  const parameter = step.parameter.map(map)
  const extraParameter = step.extraParameter.map(map)
  const changed = parameter.some((b, i) => b !== step.parameter[i])
    || extraParameter.some((b, i) => b !== step.extraParameter[i])
  return changed ? { ...step, parameter, extraParameter } : step
}

function startParams(step: RelationStep, relation: RelationTemplate | undefined): Parameter[] {
  if (relation && step.parameter.length !== relation.parameter.length) {
    return relationParameterDefault(relation)
  }
  return step.parameter.map((b) => ({ ...b }))
}

export const relation: StepAdapter<'RELATION'> = {
  kind: 'RELATION',
  name: 'Relation',
  answers: true,
  read(raw, base) {
    const fields = relationFields(raw)
    return fields && { id: base.id, kind: 'RELATION', resultName: base.resultName, ...fields }
  },
  readExported(raw, resultName) {
    const fields = relationFields(raw)
    return fields && { kind: 'RELATION', resultName, ...fields }
  },
  export(step, refs) {
    const binding = (b: Parameter): Parameter => {
      if (b.source === 'stepResult') return { ...b, value: refs.stepPosition(b.value) }

      if (CELLS_PARAM_SOURCES[b.source] !== undefined) {
        return { ...b, value: refs.columnsIndex(b.blockId ?? '', b.value) }
      }
      return { ...b }
    }
    return {
      kind: step.kind,
      resultName: step.resultName,
      relationId: step.relationId,
      parameter: step.parameter.map(binding),
      extraParameter: step.extraParameter.map(binding),
    }
  },
  check(step, world) {
    const resultBroken = (binding: Parameter | undefined): boolean =>
      binding?.source === 'stepResult'
      && world.resultIds !== undefined
      && !world.resultIds.includes(binding.value)
    if (step.relationId === '') return 'Schritt "Relation" hat keine Vorlage.'
    if (!world.relations) return null
    const template = world.relations.find((entry) => entry.id === step.relationId)
    if (!template) return 'Schritt "Relation" verweist auf eine gelöschte Vorlage.'
    if (step.parameter.length !== template.parameter.length) {
      return 'Schritt "Relation" hat nicht alle Syntaxparameter übernommen.'
    }
    const missing = step.parameter.findIndex(bindingProblem)
    if (missing >= 0) return `Schritt "Relation": Parameter ${missing + 1} ist unvollständig.`
    if (!template.extraParameterAllowed && step.extraParameter.length > 0) {
      return 'Schritt "Relation" hat nicht erlaubte Zusatzparameter.'
    }
    if (step.extraParameter.some(bindingProblem)) {
      return 'Schritt "Relation" hat einen leeren Zusatzparameter.'
    }
    const allBindings = [
      ...step.parameter,
      ...step.extraParameter,
    ]
    const dataSources = world.dataSources
    const missingSource = allBindings.find((binding) =>
      binding?.source === 'dataField'
      && dataSources
      && !dataSources.some((source) => source.id === binding.sourceId),
    )
    if (missingSource) return 'Schritt "Relation" verweist auf eine gelöschte Datenquelle.'
    const actionValues = world.actionValues
    const missingBlock = allBindings.find((binding) =>
      binding?.source === 'blockValue'
      && actionValues
      && !actionValues.some((target) =>
        target.blockId === binding.blockId && target.prop === binding.value),
    )
    if (missingBlock) return 'Schritt "Relation" verweist auf einen gelöschten Baustein.'
    const giverIds = world.selectionGiverIds
    const missingGiver = allBindings.find((binding) =>
      binding?.source === 'chosenRow'
      && giverIds
      && !giverIds.includes(binding.blockId ?? ''),
    )
    if (missingGiver) {
      return 'Schritt "Relation" liest die gewählte Zeile eines Bausteins, den es nicht mehr gibt (oder der keine Auswahl mehr gibt).'
    }

    const before = world.before
    if (
      before !== undefined
      && allBindings.some((b) => b?.source === 'context' && b.value === 'DROP_PINDEX')
      && world.section !== 'deleted'
    ) {
      return 'Schritt "Relation" braucht die Satznummer der gelöschten Zeile — dafür muss ein Parameter eine gelöschte Zeile lesen.'
    }

    if (
      world.section === 'captured'
      && allBindings.some((b) => b?.source === 'context' && b.value === 'PINDEX')
      && !(before ?? []).some((s) => s.resultName === 'PINDEX')
    ) {
      return 'Schritt "Relation": erfasste Zeilen haben keine Satznummer — davor einen Schritt setzen, der sie holt oder den Satz anlegt (GET oder PUTADD), und diesen Parameter auf sein Ergebnis binden.'
    }
    if (allBindings.some(resultBroken)) {
      return 'Schritt "Relation": ein Parameter zeigt auf keinen GET-Schritt davor.'
    }
    return null
  },
  async run(step, run) {
    const template = run.host.relation(step.relationId)
    if (!template) return { failed: true }

    const bindings = [...step.parameter, ...step.extraParameter]

    const missingRecord = RECORD_PLACEHOLDER.find((name) =>
      bindings.some((b) => b.source === 'context' && b.value === name)
      && (run.values[name] ?? '') === '')
    if (missingRecord !== undefined) return { failed: true }

    const params = bindings.map((binding) => run.host.resolveParameter(binding, run.parameterValues))
    const answer = await run.host.runRelation(template, params)
    return {
      failed: answer.failed === true,
      answer: { value: answer.value, raw: answer.raw, wrote: template.verb !== 'GET_RELATION' },
    }
  },
  summary(step, world) {
    const template = world.relations.find((r) => r.id === step.relationId)
    const what = template && !isUnnamedTemplate(template) ? template.name : 'Relation'
    if (!template) return { what, detail: '', target: '', origin: '', table: '' }

    const source = sourceFromRelId(template, step.parameter, world.sources)
    const code = fieldCodeFromParams(template, step.parameter)
    return {
      what,
      detail: '',
      target: plainNameForCode(code, source, world.sources)

        || (code !== '' && fieldCodeSplit(code) ? code : ''),
      origin: originText(valueBinding(template, step.parameter), world.tree, world.sources, world.stepNumber),
      table: source ? `${source.name} · ${sourcesKey(source)}` : '',
      relation: template,
    }
  },
  form: {
    fields: ['relation'],
    values(step, relations) {
      return {
        relationId: step.relationId,
        relationParams: startParams(step, relations.find((r) => r.id === step.relationId)),
        extraParams: step.extraParameter.map((b) => ({ ...b })),
      }
    },
    step(id, values, before, template) {
      const defaults = template ? relationParameterDefault(template) : []
      return {
        id,
        kind: 'RELATION',
        relationId: values.relationId,
        parameter: template
          ? template.parameter.map((_, index) => relationBinding(values, defaults, index))
          : [],
        extraParameter: [...values.extraParams],
        resultName: before?.resultName ?? '',
      }
    },
  },
  bindings: (step) => [...step.parameter, ...step.extraParameter],
  withBindings,
  withBlockIds(step, newId) {
    return withBindings(step, (b) => {
      const target = b.blockId === undefined || b.blockId === '' ? undefined : newId(b.blockId)
      return target === undefined ? b : { ...b, blockId: target }
    })
  },
  relationId: (step) => step.relationId,
}
