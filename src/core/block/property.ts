// One declaration per block property. Lit property, registry entry, export
// attribute, load check and the control in the bar at the block are all
// derived from it.

import type { Unread } from '../unread'

type ReadResult<V> =
  | { ok: true; value: V }
  | { ok: false }

type ControlKind =
  | 'text'
  | 'number'
  | 'boolean'
  | 'choice'
  | 'segment'
  | 'field'
  | 'source'
  | 'structured'

export interface ChoiceOption {
  value: string
  name: string

  // Ready made css. Carry all options a color, the bar offers swatches
  // instead of a list.
  color?: string
}

export interface Condition {
  key: string
  equals?: PropertyValue
  notEquals?: PropertyValue
  noneOf?: readonly PropertyValue[]

  // A second condition that has to hold as well.
  and?: Condition
}

// What a block property may hold in the tree. A structured property keeps a
// list whose entries only its declaration reads, into its own concrete type.
export type PropertyValue = string | number | boolean | readonly object[]

interface PropertyType<V> {
  control: ControlKind
  read(raw: unknown): ReadResult<V>
  toAttribute(value: V): string
  // null means the attribute is absent, which stands for the declared default.
  fromAttribute(raw: string | null, fallback: V): V
  options?: readonly ChoiceOption[]
}

// Where the builder edits the property: in the bar at the block, in one of the
// bar's small windows (display switches, color and size of the type, what the
// source holds, the lookup), in the bar at a column head, on the block itself,
// or nowhere (it has its own window or the editor writes it).
export type PropertyPlace = 'bar' | 'display' | 'font' | 'source' | 'lookup' | 'column' | 'block' | 'none'

// Another property presets this one, like the role of a text its color: a new
// value there brings this one back to its default, and while it holds the
// default, `values` names what it shows.
export interface Preset {
  by: string
  values?: Readonly<Record<string, string>>
}

export interface Property<V> {
  type: PropertyType<V>
  default: V

  // German: the builder reads it.
  label: string

  place: PropertyPlace

  // Lowercase, english. '' means the property stays in the editor.
  attribute: string

  when?: Condition
  unit?: string
  min?: number
  max?: number
  maxLength?: number

  needsSource?: boolean
  onlyUnderSiblings?: boolean

  // The property naming the source whose fields this one picks from.
  sourceProp?: string

  // A field property keeps the code; this one mirrors the readable name.
  plainNameProp?: string

  // The property of the parent block holding a field; the bar names that field
  // beside this one.
  nameFromParentField?: string

  preset?: Preset
}

export type PropertyMap = { readonly [name: string]: Property<PropertyValue> }

export type ValuesOf<P> = { [K in keyof P]: P[K] extends Property<infer V> ? V : never }

export function propertyVisible(
  condition: Condition | undefined,
  values: Readonly<Record<string, PropertyValue>>,
): boolean {
  if (!condition) return true
  if (condition.and && !propertyVisible(condition.and, values)) return false
  const value = values[condition.key]
  if (condition.noneOf) return !condition.noneOf.some((v) => Object.is(value, v))
  if ('notEquals' in condition) return !Object.is(value, condition.notEquals)
  return Object.is(value, condition.equals)
}

interface Init<V> {
  default: V
  label: string
  place?: PropertyPlace
  attribute?: string
  when?: Condition
  needsSource?: boolean
  onlyUnderSiblings?: boolean
  sourceProp?: string
  plainNameProp?: string
  nameFromParentField?: string
  preset?: Preset
}

function make<V>(type: PropertyType<V>, init: Init<V>, extra: Partial<Property<V>> = {}): Property<V> {
  return {
    type,
    default: init.default,
    label: init.label,
    place: init.place ?? 'bar',
    attribute: init.attribute ?? '',
    ...(init.when ? { when: init.when } : {}),
    ...(init.needsSource !== undefined ? { needsSource: init.needsSource } : {}),
    ...(init.onlyUnderSiblings !== undefined ? { onlyUnderSiblings: init.onlyUnderSiblings } : {}),
    ...(init.sourceProp !== undefined ? { sourceProp: init.sourceProp } : {}),
    ...(init.plainNameProp !== undefined ? { plainNameProp: init.plainNameProp } : {}),
    ...(init.nameFromParentField !== undefined ? { nameFromParentField: init.nameFromParentField } : {}),
    ...(init.preset !== undefined ? { preset: init.preset } : {}),
    ...extra,
  }
}

const textType = (control: ControlKind, options?: readonly ChoiceOption[]): PropertyType<string> => ({
  control,
  read: (raw) => (typeof raw === 'string'
    ? { ok: true, value: raw }
    : { ok: false }),
  toAttribute: (value) => value,
  fromAttribute: (raw, fallback) => (raw === null ? fallback : raw),
  ...(options ? { options } : {}),
})

export function textProperty(init: Init<string> & { maxLength?: number }): Property<string> {
  return make(textType('text'), init,
    init.maxLength === undefined ? {} : { maxLength: init.maxLength })
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

export function numberProperty(
  init: Init<number> & { min?: number; max?: number; unit?: string },
): Property<number> {
  const type: PropertyType<number> = {
    control: 'number',
    read: (raw) => (typeof raw === 'number' && Number.isFinite(raw)
      ? { ok: true, value: raw }
      : { ok: false }),
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
      : { ok: false }),
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
    out[name] = property.default
  }
  return out
}

// Reads a stored bag of values against the declaration. Unknown names fall
// away, wrong shapes fall back to the default.
export function readValues(
  properties: PropertyMap,
  raw: Unread<Record<string, PropertyValue>>,
): Record<string, PropertyValue> {
  const values: Record<string, PropertyValue> = {}
  for (const [name, property] of Object.entries(properties)) {
    if (!Object.prototype.hasOwnProperty.call(raw, name)) {
      values[name] = property.default
      continue
    }
    const result = property.type.read(raw[name])
    values[name] = result.ok ? result.value : property.default
  }
  return values
}
