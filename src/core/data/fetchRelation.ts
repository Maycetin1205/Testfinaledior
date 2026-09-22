import { sourceKind, type SourceKindId } from './sourceKinds'

export interface LoadRelation {
  nr: string

  documentKindField: string
  documentNumberField: string

  yearField: string
  archiveField: string

  endFields: readonly string[]
}

export const POS_LEN = /^\d+_\d+$/
const ONLY_DIGITS = /^\d+$/

const LOAD_CUT_LEN = 255

export function fieldsBehindCut(used: ReadonlySet<string> | undefined): string[] {
  const out: string[] = []
  for (const code of used ?? []) {
    const m = /^(\d+)_(\d+)$/.exec(code)
    if (!m) continue
    if (Number(m[1]) + Number(m[2]) > LOAD_CUT_LEN) out.push(code)
  }
  return out.sort((a, b) => {
    const [posA = 0, lenA = 0] = a.split('_').map(Number)
    const [posB = 0, lenB = 0] = b.split('_').map(Number)
    return posA - posB || lenA - lenB
  })
}

export function relationNrFromInput(raw: string): string {
  const t = raw.trim()
  return ONLY_DIGITS.test(t) ? t : ''
}

export function loadRelationOf(
  source: { kind: SourceKindId; loadRelation?: LoadRelation },
): LoadRelation | null {
  if (!sourceKind(source.kind).relationLoadPossible) return null
  return source.loadRelation ?? null
}

export function checkLoadRelation(raw: unknown): LoadRelation | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
  const nr = text(e.nr)
  const documentKindField = text(e.documentKindField)
  const documentNumberField = text(e.documentNumberField)
  const yearField = text(e.yearField)
  const archiveField = text(e.archiveField)
  const endFields = Array.isArray(e.endFields)
    ? e.endFields.filter((f): f is string => typeof f === 'string' && POS_LEN.test(f))
    : []
  if (!ONLY_DIGITS.test(nr)) return null
  if (!POS_LEN.test(documentKindField) || !POS_LEN.test(documentNumberField)) return null
  if (yearField !== '' && !POS_LEN.test(yearField)) return null
  if (archiveField !== '' && !POS_LEN.test(archiveField)) return null
  if (endFields.length === 0) return null
  return { nr, documentKindField, documentNumberField, yearField, archiveField, endFields }
}
