// Die Registry der Bausteintypen: anmelden und wiederfinden.
import { WURZEL_TYP } from './baum'
import type { BausteinArt } from './bausteinArt'

const registry = new Map<string, BausteinArt>()

  // Ein zweiter Baustein desselben Typs ist ein Baufehler: er wuerde den ersten
  // still verdraengen.
export function meldeBausteinArt(def: BausteinArt): void {
  if (registry.has(def.typ)) {
    throw new Error(`Bausteintyp "${def.typ}" ist schon angemeldet.`)
  }
  registry.set(def.typ, def)
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
  return Array.from(registry.values()).find((def) => def.tag.toLowerCase() === tag)
}

export function darfEnthalten(parentType: string, childType: string): boolean {
  const child = registry.get(childType)
  if (!child) return false
  if (child?.erlaubteEltern && !child.erlaubteEltern.includes(parentType)) {
    return false
  }
  const def = registry.get(parentType)
  if (!def) return parentType === WURZEL_TYP
  if (!def.nimmtKinder) return false
  if (!def.erlaubteKinder) return true
  return def.erlaubteKinder.includes(childType)
}
