import { ICON_MAX, type DataField } from './dataSources'

export interface MaskImport {
  prefix: string

  fields: DataField[]

  onlyDisplay: number

  skipped: number
}

interface RawField {
  Name?: unknown
  Description?: unknown
  Len?: unknown
  Status?: unknown
}

const NAME_TEMPLATE = /^(.*_)?(\d+_\d+)$/

function asList(raw: unknown): RawField[] | null {
  if (Array.isArray(raw)) return raw as RawField[]
  if (raw && typeof raw === 'object') {
    const mask = (raw as { MASK?: unknown }).MASK
    if (Array.isArray(mask)) return mask as RawField[]
  }
  return null
}

function iconFrom(len: unknown): number | undefined {
  const number = Number(len)
  if (!Number.isFinite(number) || number < 1) return undefined
  return Math.min(ICON_MAX, Math.round(number))
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
    const description = typeof entry.Description === 'string'
      ? entry.Description.trim()
      : ''
    const icon = iconFrom(entry.Len)
    if (entry.Status === 'A') onlyDisplay++
    fields.push({
      name: description === '' ? code : description,
      code,
      ...(icon === undefined ? {} : { icon }),
    })
  }
  if (fields.length === 0) return null

  const prefix = prefixes.size === 1 ? [...prefixes][0] ?? '' : ''
  return { prefix, fields, onlyDisplay, skipped }
}
