import { splitBinding } from './binding'

// A list property whose entries each show one field, like the columns of a
// table. Only the declaring block knows an entry; the rest reads and writes it here.
export interface ListBinding<E = unknown> {
  prop: string

  defaultTitle: string

  sourceProp?: string

  entryFlag?: readonly EntrySwitch<E>[]

  entryFieldChoice?: readonly EntryFieldChoice<E>[]

  entrySpots?: string

  // The entries of a stored value, read the way the property declares them.
  entries(raw: unknown): E[]

  // Other parts of the mask point at an entry by this key, a step at the cell
  // of a column. A list without it is never pointed at.
  keyOf?(entry: E): string

  titleOf(entry: E): string

  fieldOf(entry: E): string

  // A typed title stays when a field is picked; an empty one follows the field again.
  withTypedTitle(entry: E, title: string): E

  withPickedField(entry: E, field: string, fieldTitle: string, width: number | undefined): E

  // The entry without what only the editor keeps, the way the export writes it.
  withoutEditorMarks(entry: E): E

  // null when the list cannot change that way.
  entryAdd?(entries: readonly E[]): E[] | null
  entryRemove?(entries: readonly E[], index: number): E[] | null
  entryMove?(entries: readonly E[], from: number, to: number): E[] | null
}

export interface EntryFieldChoice<E> {
  key: string

  name: string

  onlyForeignSources?: boolean

  valueOf(entry: E): string

  // An empty field takes the choice away.
  withValue(entry: E, field: string): E
}

export interface EntrySwitch<E> {
  // Names the switch; a change capability points at it by this key.
  key: string

  name: string

  onByDefault?: boolean

  onlyOwnSource?: boolean

  short?: string

  // What the entry holds, undefined when it holds nothing.
  valueOf(entry: E): boolean | undefined

  // undefined takes the switch away.
  withValue(entry: E, on: boolean | undefined): E
}

// The entry with one value set, or without it for undefined. The other values
// keep their place, so a stored entry reads back in the same order.
export function withEntryValue<E, K extends keyof E>(entry: E, key: K, value: E[K] | undefined): E {
  const copy = { ...entry }
  if (value === undefined) delete copy[key]
  else copy[key] = value
  return copy
}

export function flagOn<E>(flag: EntrySwitch<E>, entry: E): boolean {
  const value = flag.valueOf(entry)
  return typeof value === 'boolean' ? value : flag.onByDefault === true
}

export function flagFor<E>(b: ListBinding<E>, entry: E): readonly EntrySwitch<E>[] {
  const fromForeignSource = splitBinding(b.fieldOf(entry)).sourceId !== ''
  return (b.entryFlag ?? [])
    .filter((s) => !(s.onlyOwnSource === true && fromForeignSource))
}

export function fieldChoicesRead<E>(
  b: ListBinding<E>,
  entry: E,
): { choice: EntryFieldChoice<E>; value: string }[] {
  return (b.entryFieldChoice ?? []).map((choice) => ({ choice, value: choice.valueOf(entry) }))
}

export function listDefaultTitle(b: ListBinding, index: number): string {
  return b.defaultTitle.replace('{n}', String(index + 1))
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

// A switch goes into the export only where it applies and differs from its default.
function switchExported<E>(b: ListBinding<E>, flag: EntrySwitch<E>, entry: E): boolean {
  return flagFor(b, entry).includes(flag) && flagOn(flag, entry) !== (flag.onByDefault === true)
}

export function listForExport<E>(entries: readonly E[], b: ListBinding<E>): E[] {
  return entries.map((entry) => (b.entryFlag ?? [])
    .filter((flag) => !switchExported(b, flag, entry))
    .reduce((out, flag) => flag.withValue(out, undefined), b.withoutEditorMarks(entry)))
}
