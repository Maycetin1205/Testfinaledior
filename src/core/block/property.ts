// One declaration per block property. Lit property, registry entry, export
// attribute, load check and inspector control are all derived from it.

export type ReadResult<V> =
  | { ok: true; value: V }
  | { ok: false; reason: string }

export type ControlKind =
  | 'text'
  | 'longText'
  | 'number'
  | 'boolean'
  | 'choice'
  | 'segment'
  | 'field'
  | 'source'
  | 'relation'
  | 'page'
  | 'structured'

export interface ChoiceOption {
  value: string
  name: string

  // Ready made css. Carry all options a color, the inspector draws tiles
  // instead of a list.
  color?: string
}

export interface Condition {
  key: string
  equals?: PropertyValue
  notEquals?: PropertyValue
  noneOf?: readonly PropertyValue[]
}

// What a block property may hold in the tree. A structured property keeps
// entries; each block folder reads them back into its own concrete type.
export interface PropertyEntry {
  readonly [key: string]: string | number | boolean | PropertyEntry | readonly PropertyEntry[] | undefined
}

export type PropertyValue = string | number | boolean | readonly PropertyEntry[]

export interface PropertyType<V> {
  control: ControlKind
  read(raw: unknown): ReadResult<V>
  toAttribute(value: V): string
  // null means the attribute is absent, which stands for the declared default.
  fromAttribute(raw: string | null, fallback: V): V
  options?: readonly ChoiceOption[]
}

// Where the builder edits the property: in the inspector, at the block itself,
// or nowhere (it has its own dialog or the editor writes it).
export type PropertyPlace = 'inspector' | 'block' | 'none'

export interface Property<V> {
  type: PropertyType<V>
  default: V

  // German: the builder reads these.
  label: string
  help: string

  place: PropertyPlace

  // Lowercase, english. '' means the property stays in the editor.
  attribute: string

  when?: Condition
  unit?: string
  min?: number
  max?: number
  maxLength?: number

  // Groups several properties into one inspector row.
  row?: string

  needsSource?: boolean
  onlyUnderSiblings?: boolean

  // The property naming the source whose fields this one picks from.
  sourceProp?: string

  // A page property keeps the fixed id; this one mirrors the readable name.
  plainNameProp?: string
}

export type PropertyMap = { readonly [name: string]: Property<unknown> }

export type ValuesOf<P> = { [K in keyof P]: P[K] extends Property<infer V> ? V : never }

export function propertyVisible(
  condition: Condition | undefined,
  values: Readonly<Record<string, PropertyValue>>,
): boolean {
  if (!condition) return true
  const value = values[condition.key]
  if (condition.noneOf) return !condition.noneOf.some((v) => Object.is(value, v))
  if ('notEquals' in condition) return !Object.is(value, condition.notEquals)
  return Object.is(value, condition.equals)
}

interface Init<V> {
  default: V
  label: string
  help: string
  place?: PropertyPlace
  attribute?: string
  when?: Condition
  row?: string
  needsSource?: boolean
  onlyUnderSiblings?: boolean
  sourceProp?: string
  plainNameProp?: string
}

function make<V>(type: PropertyType<V>, init: Init<V>, extra: Partial<Property<V>> = {}): Property<V> {
  return {
    type,
    default: init.default,
    label: init.label,
    help: init.help,
    place: init.place ?? 'inspector',
    attribute: init.attribute ?? '',
    ...(init.when ? { when: init.when } : {}),
    ...(init.row !== undefined ? { row: init.row } : {}),
    ...(init.needsSource !== undefined ? { needsSource: init.needsSource } : {}),
    ...(init.onlyUnderSiblings !== undefined ? { onlyUnderSiblings: init.onlyUnderSiblings } : {}),
    ...(init.sourceProp !== undefined ? { sourceProp: init.sourceProp } : {}),
    ...(init.plainNameProp !== undefined ? { plainNameProp: init.plainNameProp } : {}),
    ...extra,
  }
}

const textType = (control: ControlKind, options?: readonly ChoiceOption[]): PropertyType<string> => ({
  control,
  read: (raw) => (typeof raw === 'string'
    ? { ok: true, value: raw }
    : { ok: false, reason: `Text erwartet, ${typeof raw} gelesen` }),
  toAttribute: (value) => value,
  fromAttribute: (raw, fallback) => (raw === null ? fallback : raw),
  ...(options ? { options } : {}),
})

export function textProperty(init: Init<string> & { maxLength?: number }): Property<string> {
  return make(textType('text'), init,
    init.maxLength === undefined ? {} : { maxLength: init.maxLength })
}

export function longTextProperty(init: Init<string>): Property<string> {
  return make(textType('longText'), init)
}

export function choiceProperty(
  options: readonly ChoiceOption[],
  init: Init<string>,
): Property<string> {
  return make(textType('choice', options), init)
}

export function segmentProperty(
  options: readonly ChoiceOption[],
  init: Init<string>,
): Property<string> {
  return make(textType('segment', options), init)
}

// A binding: source id and field code in one value.
export function fieldProperty(init: Init<string>): Property<string> {
  return make(textType('field'), init)
}

export function sourceProperty(init: Init<string>): Property<string> {
  return make(textType('source'), init)
}

export function relationProperty(init: Init<string>): Property<string> {
  return make(textType('relation'), init)
}

export function pageProperty(init: Init<string>): Property<string> {
  return make(textType('page'), init)
}

export function numberProperty(
  init: Init<number> & { min?: number; max?: number; unit?: string },
): Property<number> {
  const type: PropertyType<number> = {
    control: 'number',
    read: (raw) => (typeof raw === 'number' && Number.isFinite(raw)
      ? { ok: true, value: raw }
      : { ok: false, reason: `Zahl erwartet, ${JSON.stringify(raw)} gelesen` }),
    toAttribute: (value) => String(value),
    fromAttribute: (raw, fallback) => {
      if (raw === null) return fallback
      const parsed = Number(raw)
      return Number.isFinite(parsed) ? parsed : fallback
    },
  }
  return make(type, init, {
    ...(init.min !== undefined ? { min: init.min } : {}),
    ...(init.max !== undefined ? { max: init.max } : {}),
    ...(init.unit !== undefined ? { unit: init.unit } : {}),
  })
}

// `true`/`false` in the attribute; an absent attribute means the default, so a
// property that is on by default only ever shows up as false.
export function booleanProperty(init: Init<boolean>): Property<boolean> {
  const type: PropertyType<boolean> = {
    control: 'boolean',
    read: (raw) => (typeof raw === 'boolean'
      ? { ok: true, value: raw }
      : { ok: false, reason: `Ja/Nein erwartet, ${JSON.stringify(raw)} gelesen` }),
    toAttribute: (value) => (value ? 'true' : 'false'),
    fromAttribute: (raw, fallback) => (raw === null ? fallback : raw === 'true'),
  }
  return make(type, init)
}

// A list or record the block folder reads into its own type.
export function structuredProperty<V>(
  type: Omit<PropertyType<V>, 'control'>,
  init: Init<V>,
): Property<V> {
  return make({ ...type, control: 'structured' }, init)
}

export function defaultsOf(properties: PropertyMap): Record<string, PropertyValue> {
  const out: Record<string, PropertyValue> = {}
  for (const [name, property] of Object.entries(properties)) {
    out[name] = property.default as PropertyValue
  }
  return out
}

export interface ValueProblem {
  property: string
  reason: string
}

// Reads a stored bag of values against the declaration. Unknown names fall
// away, wrong shapes fall back to the default and are reported.
export function readValues(
  properties: PropertyMap,
  raw: Readonly<Record<string, unknown>>,
): { values: Record<string, PropertyValue>; problems: ValueProblem[] } {
  const values: Record<string, PropertyValue> = {}
  const problems: ValueProblem[] = []
  for (const [name, property] of Object.entries(properties)) {
    if (!Object.prototype.hasOwnProperty.call(raw, name)) {
      values[name] = property.default as PropertyValue
      continue
    }
    const result = property.type.read(raw[name])
    if (result.ok) {
      values[name] = result.value as PropertyValue
    } else {
      values[name] = property.default as PropertyValue
      problems.push({ property: name, reason: result.reason })
    }
  }
  return { values, problems }
}

// The typed view a block folder has on its own values.
export function valuesOf<P extends PropertyMap>(
  properties: P,
  values: Readonly<Record<string, PropertyValue>>,
): ValuesOf<P> {
  const out: Record<string, PropertyValue> = {}
  for (const [name, property] of Object.entries(properties)) {
    const held = values[name]
    const result = property.type.read(held)
    out[name] = result.ok ? (result.value as PropertyValue) : (property.default as PropertyValue)
  }
  return out as ValuesOf<P>
}
