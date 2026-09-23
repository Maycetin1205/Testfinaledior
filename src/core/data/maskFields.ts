import { LENGTH_MAX, type DataField } from './dataSources'

export interface MaskImport {
  prefix: string

  fields: DataField[]

  onlyDisplay: number

  skipped: number
}

// SoftEngine's own keys: the field list arrives as MASKE, the plain name as Beschreibung.
interface RawField {
  Name?: unknown
  Beschreibung?: unknown
  Len?: unknown
  Status?: unknown
}

const NAME_TEMPLATE = /^(.*_)?(\d+_\d+)$/

function asList(raw: unknown): RawField[] | null {
  if (Array.isArray(raw)) return raw as RawField[]
  if (raw && typeof raw === 'object') {
    const mask = (raw as { MASKE?: unknown }).MASKE
    if (Array.isArray(mask)) return mask as RawField[]
  }
  return null
}

function lengthFrom(len: unknown): number | undefined {
  const number = Number(len)
  if (!Number.isFinite(number) || number < 1) return undefined
  return Math.min(LENGTH_MAX, Math.round(number))
}

export function readMaskFields(raw: string): MaskImport | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  const list = asList(data)
  if (list === null) return null

  const fields: DataField[] = []
  const prefixes = new Set<string>()
  let onlyDisplay = 0
  let skipped = 0

  for (const entry of list) {
    const hit = typeof entry?.Name === 'string' ? NAME_TEMPLATE.exec(entry.Name) : null
    if (hit === null) {
      skipped++
      continue
    }
    const code = hit[2] ?? ''
    prefixes.add(hit[1] ?? '')
    const description = typeof entry.Beschreibung === 'string'
      ? entry.Beschreibung.trim()
      : ''
    const length = lengthFrom(entry.Len)
    if (entry.Status === 'A') onlyDisplay++
    fields.push({
      name: description === '' ? code : description,
      code,
      ...(length === undefined ? {} : { length }),
    })
  }
  if (fields.length === 0) return null

  const prefix = prefixes.size === 1 ? [...prefixes][0] ?? '' : ''
  return { prefix, fields, onlyDisplay, skipped }
}
