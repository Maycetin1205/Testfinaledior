import { bindingProp, capability, type Capability } from './capability'
import type { Condition, Property, PropertyMap } from './property'

// Every name a block's declaration gives of one of its properties, checked once
// when the block registers. A name the block does not declare stops the start,
// so a slip shows at once and not at the first click. The type checker holds the
// capabilities to the block's properties already; a property names its siblings
// in the object that declares it, which the type checker cannot see.

// Where a declaration gives a name, and the name.
interface Named {
  at: string
  name: string
}

function named(at: string, name: string | undefined): Named[] {
  return name === undefined ? [] : [{ at, name }]
}

function inCondition(condition: Condition | undefined, at: string): Named[] {
  if (!condition) return []
  return [
    ...named(`${at}.key`, condition.key),
    ...inCondition(condition.and, `${at}.and`),
    ...inCondition(condition.otherwise, `${at}.otherwise`),
  ]
}

// The field of the parent block is one of the block holding the list for an
// entry; for the block itself it is one of a parent not known here.
function inProperty(property: Property<unknown>, inEntry: boolean): Named[] {
  return [
    ...named('sourceProp', property.sourceProp),
    ...named('plainNameProp', property.plainNameProp),
    ...named('nameFromParentField', inEntry ? property.nameFromParentField : undefined),
    ...named('preset.by', property.preset?.by),
    ...inCondition(property.when, 'when'),
  ]
}

function inCapability(c: Capability): Named[] {
  switch (c.kind) {
    case 'source':
      return [...named('after', c.after), ...inCondition(c.when, 'when')]
    case 'recordPick':
      return [...named('sourceProp', c.sourceProp), ...inCondition(c.when, 'when'), ...inCondition(c.gives, 'gives')]
    case 'bindable':
      return c.spots.flatMap((spot) => [
        ...named('spots.prop', bindingProp(spot.prop)),
        ...named('spots.previewProp', spot.previewProp),
        ...inCondition(spot.when, 'spots.when'),
      ])
    case 'actionValue':
      return c.spots.flatMap((spot) => named('spots.prop', spot.prop))
    case 'list':
      return [...named('binding.prop', c.binding.prop), ...named('binding.sourceProp', c.binding.sourceProp)]
    case 'lookupWindow': {
      const w = c.window
      if (w.entriesProp !== undefined) {
        return [...named('window.entriesProp', w.entriesProp), ...inCondition(w.when, 'window.when')]
      }
      return [
        ...named('window.columnsKey', w.columnsKey),
        ...named('window.widthKey', w.widthKey),
        ...named('window.heightKey', w.heightKey),
        ...named('window.sourceProp', w.sourceProp),
        ...named('window.storageFieldProp', w.storageFieldProp),
        ...named('window.storageTitleProp', w.storageTitleProp),
        ...named('window.titleProp', w.titleProp),
        ...inCondition(w.when, 'window.when'),
      ]
    }
    case 'capture':
      return inCondition(c.when, 'when')
    case 'compute':
      return named('prop', c.prop)
    default:
      return []
  }
}

// The properties of a list's entries name properties of the block, as the bar
// at an entry's head reads them. The change capability names a switch of the
// entries.
export function checkPropertyNames(type: string, properties: PropertyMap, capabilities: readonly Capability[]): void {
  const stop = (what: string, { at, name }: Named, isNot = 'keine Eigenschaft des Bausteins'): never => {
    throw new Error(`Baustein "${type}": ${what} nennt in ${at} "${name}", das ist ${isNot}.`)
  }
  const check = (what: string, names: readonly Named[]): void => {
    for (const n of names) if (!Object.hasOwn(properties, n.name)) stop(what, n)
  }

  for (const [key, property] of Object.entries(properties)) check(`Eigenschaft "${key}"`, inProperty(property, false))
  for (const c of capabilities) check(`Fähigkeit "${c.kind}"`, inCapability(c))

  const carrier = { capabilities }
  const list = capability(carrier, 'list')?.binding
  for (const entries of [list, list?.inner?.binding]) {
    if (!entries) continue
    for (const [key, property] of Object.entries(entries.entryProperties ?? {})) {
      check(`Eigenschaft "${key}" der Liste "${entries.prop}"`, inProperty(property, true))
    }
  }

  const change = capability(carrier, 'change')
  if (change && !(list?.entryFlag ?? []).some((s) => s.key === change.key)) {
    stop('Fähigkeit "change"', { at: 'key', name: change.key }, 'kein Schalter der Liste')
  }
}
