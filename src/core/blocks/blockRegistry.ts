// Die Registry der Bausteintypen: anmelden und wiederfinden.
import { WURZEL_TYP } from './BlockData'
import type { BausteinArt } from './BlockDefinition'

const registry = new Map<string, BausteinArt>()

  // Ein zweiter Baustein desselben Typs ist ein Baufehler: er wuerde den ersten
  // still verdraengen.
export function meldeBausteinArt(def: BausteinArt): void {
  if (registry.has(def.type)) {
    throw new Error(`Bausteintyp "${def.type}" ist schon angemeldet.`)
  }
  registry.set(def.type, def)
}

export function bausteinArt(type: string): BausteinArt | undefined {
  return registry.get(type)
}

export function alleBausteinArten(): BausteinArt[] {
  return Array.from(registry.values())
}

// Die Bausteinart hinter einem Element: die Laufzeit hat nur seinen Tag.
export function bausteinArtFuerTag(tagName: string): BausteinArt | undefined {
  const tag = tagName.toLowerCase()
  return Array.from(registry.values()).find((def) => def.tagName.toLowerCase() === tag)
}

export function darfEnthalten(parentType: string, childType: string): boolean {
  const child = registry.get(childType)
  if (!child) return false
  if (child?.allowedParentTypes && !child.allowedParentTypes.includes(parentType)) {
    return false
  }
  const def = registry.get(parentType)
  if (!def) return parentType === WURZEL_TYP
  if (!def.acceptsChildren) return false
  if (!def.allowedChildTypes) return true
  return def.allowedChildTypes.includes(childType)
}
