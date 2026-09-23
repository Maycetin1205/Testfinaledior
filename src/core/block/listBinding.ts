import { splitBinding } from './binding'

export interface ListBinding {
  prop: string

  titleKey: string

  fieldKey: string

  keyProperty?: string

  standardTitle: string

  sourceProp?: string

  entryFlag?: readonly EntrySwitch[]

  entryFieldChoice?: readonly EntryFieldChoice[]

  entryNeu?: (props: Readonly<Record<string, unknown>>) => Record<string, unknown>
  entryAway?: (props: Readonly<Record<string, unknown>>, index: number) => Record<string, unknown>
  entryMove?: (
    props: Readonly<Record<string, unknown>>,
    of: number,
    to: number,
  ) => Record<string, unknown>

  entrySpots?: string
}

export interface EntryFieldChoice {
  key: string

  name: string

  onlyForeignSources?: boolean
}

export interface EntrySwitch {
  key: string

  name: string

  standard?: boolean

  onlyOwnSource?: boolean

  short?: string
}

export function flagOn(
  flag: EntrySwitch,
  entry: Record<string, unknown>,
): boolean {
  const value = entry[flag.key]
  return typeof value === 'boolean' ? value : flag.standard === true
}

export function flagFor(
  b: ListBinding,
  entry: Record<string, unknown>,
): readonly EntrySwitch[] {
  const field = entry[b.fieldKey]
  const fromForeignSource = typeof field === 'string'
    && splitBinding(field).sourceId !== ''
  return (b.entryFlag ?? [])
    .filter((s) => !(s.onlyOwnSource === true && fromForeignSource))
}

export function fieldChoicesRead(
  b: ListBinding,
  entry: Record<string, unknown>,
): { choice: EntryFieldChoice; value: string }[] {
  return (b.entryFieldChoice ?? []).map((choice) => {
    const raw = entry[choice.key]
    return { choice, value: typeof raw === 'string' ? raw : '' }
  })
}

export function listStandardTitle(b: ListBinding, index: number): string {
  return b.standardTitle.replace('{n}', String(index + 1))
}

export const TITLE_OF_HAND = 'titleByHand'

export function typedTitle(b: ListBinding, title: string): Record<string, unknown> {
  return {
    [b.titleKey]: title,
    [TITLE_OF_HAND]: title.trim() === '' ? undefined : true,
  }
}

export function titleToFieldChoice(
  entry: Record<string, unknown>,
  fromField: string,
): string | undefined {
  return entry[TITLE_OF_HAND] === true ? undefined : fromField
}

export function listRead(raw: unknown, b: ListBinding): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return []
  return raw.map((x, i) => {
    if (x && typeof x === 'object') return { ...(x as Record<string, unknown>) }
    return {
      [b.titleKey]: typeof x === 'string' ? x : listStandardTitle(b, i),
      [b.fieldKey]: '',
    }
  })
}

interface ConditionalKey {
  key: string
  allowed: (entry: Record<string, unknown>) => boolean
}

function conditionalKey(b: ListBinding): ConditionalKey[] {
  const rules: ConditionalKey[] = []
  for (const flag of b.entryFlag ?? []) {
    rules.push({
      key: flag.key,
      allowed: (e) => flagFor(b, e).includes(flag)
        && flagOn(flag, e) !== (flag.standard === true),
    })
  }
  return rules
}

export function assignKeys(present: readonly string[]): string[] {
  const assign = new Set<string>()
  for (const raw of present) {
    const k = raw.trim()
    if (k !== '') assign.add(k)
  }
  let nextNumber = 1
  for (const k of assign) {
    const hit = /^s(\d+)$/.exec(k)
    if (hit) nextNumber = Math.max(nextNumber, Number(hit[1]) + 1)
  }
  const keep = new Set<string>()
  return present.map((raw) => {
    const k = raw.trim()
    if (k !== '' && !keep.has(k)) {
      keep.add(k)
      return k
    }
    while (assign.has(`s${nextNumber}`)) nextNumber += 1
    const next = `s${nextNumber}`
    assign.add(next)
    keep.add(next)
    return next
  })
}

export function listForExport(raw: unknown, b: ListBinding): unknown {
  if (!Array.isArray(raw)) return raw
  const rules = conditionalKey(b)
  return raw.map((x) => {
    if (!x || typeof x !== 'object') return x
    const entry = x as Record<string, unknown>
    const away = rules
      .filter((r) => r.key in entry && !r.allowed(entry))
      .map((r) => r.key)

    if (TITLE_OF_HAND in entry) away.push(TITLE_OF_HAND)
    if (away.length === 0) return x
    const copy = { ...entry }
    for (const k of away) delete copy[k]
    return copy
  })
}
