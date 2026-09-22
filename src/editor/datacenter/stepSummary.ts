import type { MaskTree } from '../../core/block/tree'
import { blockName } from '../../core/block/blockName'
import type { Parameter, Step } from '../../core/data/actions'
import {
  sourcesKey,
  tableIdOf,
  type DataSource,
} from '../../core/data/dataSources'
import {
  relIdFromIdbId,
  fieldCodeSplit,
  type RelationTemplate,
} from '../../core/data/relations'
import { fieldAdoptKind } from './fieldAdopt'

export interface StepSummary {
  what: string

  target: string

  origin: string

  table: string
}

function fixedValue(binding: Parameter | undefined): string {
  return binding?.source === 'fixed' ? binding.value.trim() : ''
}

function sourceFromRelId(
  relation: RelationTemplate,
  params: readonly Parameter[],
  sources: readonly DataSource[],
): DataSource | undefined {
  const index = relation.parameter.findIndex((p) => fieldAdoptKind(p) === 'relid')
  const value = index < 0 ? '' : fixedValue(params[index])
  if (value === '') return undefined
  return sources.find((q) => relIdFromIdbId(tableIdOf(q)) === value)
}

function fieldCodeFromParams(
  relation: RelationTemplate,
  params: readonly Parameter[],
): string {
  let pos = ''
  let len = ''
  relation.parameter.forEach((p, i) => {
    const kind = fieldAdoptKind(p)
    if (kind === 'pos') pos = fixedValue(params[i])
    else if (kind === 'len') len = fixedValue(params[i])
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
  stepNr: (id: string) => number,
): string {
  if (!binding) return ''
  switch (binding.source) {
    case 'fixed':
      return binding.value.trim() === '' ? '' : `Fest: ${binding.value.trim()}`
    case 'context':
      return binding.value === '' ? '' : binding.value
    case 'seVariable':
      return binding.value === '' ? '' : `SE VAR ${binding.value}`
    case 'previous_result':
      return 'Vorheriger Schritt'
    case 'from':
      return 'empty'
    case 'step_result': {
      const nr = stepNr(binding.value)
      return nr > 0 ? `Ergebnis von Schritt ${nr}` : 'Ergebnis von Schritt'
    }
    case 'data_field': {
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
    case 'block_value': {
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

export function stepSummary(
  step: Step,
  what: string,
  relation: RelationTemplate | undefined,
  tree: MaskTree,
  sources: readonly DataSource[],

  stepNr: (id: string) => number,
): StepSummary {
  const empty: StepSummary = { what, target: '', origin: '', table: '' }
  if (step.kind !== 'RELATION' || !relation) return empty

  const source = sourceFromRelId(relation, step.parameter, sources)
  const code = fieldCodeFromParams(relation, step.parameter)
  return {
    what,
    target: plainNameForCode(code, source, sources)

      || (code !== '' && fieldCodeSplit(code) ? code : ''),
    origin: originText(valueBinding(relation, step.parameter), tree, sources, stepNr),
    table: source ? `${source.name} · ${sourcesKey(source)}` : '',
  }
}

export function anchorStepId(step: Step): string {
  if (step.kind !== 'RELATION') return ''
  for (const b of [...step.parameter, ...step.extraParameter]) {
    if (b.source === 'step_result' && b.value !== '') return b.value
  }
  return ''
}
