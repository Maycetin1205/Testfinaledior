import { readActionValue } from '../../core/block/registry'
import { BLOCK_ID_ATTR, type Parameter, type RuntimeValues } from '../../core/data/actions'
import { seWindow } from '../bridge'
import { fieldRead, isObject, rowsOfSource, sourceFromList } from '../data'
import { fieldFromAnswer } from './answer'

// The value a place of a relation takes, from wherever the mask said: the
// event, a step before, a block, a row of a list, a SoftEngine variable or
// the first row of a source.

function resolveBlockValue(binding: Parameter, runtime: unknown): string {
  if (!isObject(runtime)) return ''
  const doc = runtime.document as ParentNode | undefined
  if (!doc || typeof doc.querySelectorAll !== 'function') return ''
  const element = Array.from(doc.querySelectorAll<HTMLElement>(`[${BLOCK_ID_ATTR}]`))
    .find((candidate) => candidate.getAttribute(BLOCK_ID_ATTR) === binding.blockId)
  if (!element) return ''
  return readActionValue(element, binding.value)
}

export function parameterResolve(
  binding: Parameter,
  values: RuntimeValues,
  runtime: unknown = seWindow(),
): string {
  if (binding.source === 'omitted') return ''
  if (binding.source === 'fixed') return binding.value
  if (binding.source === 'context') return values.context[binding.value] ?? ''
  if (binding.source === 'previousResult') return values.previousResult
  if (binding.source === 'stepResult') {
    const idx = Number(binding.value)
    if (!Number.isInteger(idx) || idx < 0) return ''

    const field = binding.resultField ?? ''
    if (field === '') return values.stepResults?.[idx] ?? ''
    return fieldFromAnswer(values.stepRawResults?.[idx], field)
  }
  if (binding.source === 'blockValue') return resolveBlockValue(binding, runtime)
  if (binding.source === 'captureCell'
    || binding.source === 'changeCell'
    || binding.source === 'deleteCell') {
    const index = Number(binding.value)
    if (!Number.isInteger(index) || index < 0) return ''
    return values.rowsCell?.(binding.blockId ?? '', index) ?? ''
  }
  if (binding.source === 'chosenRow') {
    const row = values.chosenRow?.(binding.blockId ?? '')
    return row === undefined ? '' : fieldRead(row, binding.value)
  }
  if (!isObject(runtime)) return ''

  if (binding.source === 'seVariable') {
    const seData = runtime.SEDATA
    if (!isObject(seData) || !isObject(seData.Daten) || !isObject(seData.Daten.VARArrays)) return ''
    const value = seData.Daten.VARArrays[binding.value]
    return value == null ? '' : String(value)
  }

  const source = sourceFromList(runtime.FF_DATA_SOURCES, binding.sourceId ?? '')
  if (!source) return ''
  const rows = rowsOfSource(source, runtime.SEDATA)
  const pindex = values.context.PINDEX ?? ''

  const row = pindex !== '' && source.recordField !== ''
    ? rows.find((entry) => fieldRead(entry, source.recordField) === pindex)
    : rows[0]
  return row ? fieldRead(row, binding.value) : ''
}
