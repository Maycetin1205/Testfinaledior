import { splitBinding } from './binding'

export interface ListBinding {
  prop: string

  titleKey: string

  fieldKey: string

  keyProperty?: string

  defaultTitle: string

  sourceProp?: string

  entryFlag?: readonly EntrySwitch[]

  entryFieldChoice?: readonly EntryFieldChoice[]

  entryAdd?: (props: Readonly<Record<string, unknown>>) => Record<string, unknown>
  entryRemove?: (props: Readonly<Record<string, unknown>>, index: number) => Record<string, unknown>
  entryMove?: (
    props: Readonly<Record<string, unknown>>,
    from: number,
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

  onByDefault?: boolean

  onlyOwnSource?: boolean

  short?: string
}

export function flagOn(
  flag: EntrySwitch,
  entry: Record<string, unknown>,
): boolean {
  const value = entry[flag.key]
  return typeof value === 'boolean' ? value : flag.onByDefault === true
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

export function listDefaultTitle(b: ListBinding, index: number): string {
  return b.defaultTitle.replace('{n}', String(index + 1))
}

const TITLE_TYPED = 'titleTyped'

export function typedTitle(b: ListBinding, title: string): Record<string, unknown> {
  return {
    [b.titleKey]: title,
    [TITLE_TYPED]: title.trim() === '' ? undefined : true,
  }
}

export function titleToFieldChoice(
  entry: Record<string, unknown>,
  fromField: string,
): string | undefined {
  return entry[TITLE_TYPED] === true ? undefined : fromField
}

export function listRead(raw: unknown, b: ListBinding): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return []
  return raw.map((x, i) => {
    if (x && typeof x === 'object') return { ...(x as Record<string, unknown>) }
    return {
      [b.titleKey]: typeof x === 'string' ? x : listDefaultTitle(b, i),
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
        && flagOn(flag, e) !== (flag.onByDefault === true),
    })
  }
  return rules
}

export function assignKeys(present: readonly string[]): string[] {
  const taken = new Set<string>()
  for (const raw of present) {
    const k = raw.trim()
    if (k !== '') taken.add(k)
  }
  let nextNumber = 1
  for (const k of taken) {
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
    while (taken.has(`s${nextNumber}`)) nextNumber += 1
    const fresh = `s${nextNumber}`
    taken.add(fresh)
    keep.add(fresh)
    return fresh
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

    if (TITLE_TYPED in entry) away.push(TITLE_TYPED)
    if (away.length === 0) return x
    const copy = { ...entry }
    for (const k of away) delete copy[k]
    return copy
  })
}
