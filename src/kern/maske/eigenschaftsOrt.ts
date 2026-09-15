import type { Baustein } from './baum'
import { type BausteinArt } from './bausteinArt'
import { bindungsProp, faehigkeit } from './faehigkeiten'
import { eigenschaftSichtbar, type Eigenschaft } from './eigenschaft'

export function eigenschaftenFuer(
  block: Baustein,
  def: BausteinArt,
  ort: 'inline' | 'inspector',
): Eigenschaft[] {
  // Ausdruecklich Set<string>: `bindungsProp` liefert `${P}Field`, und danach
  // gefragt wird mit einem gewoehnlichen Eigenschaftsnamen.
  const direktGebunden = new Set<string>(
    (faehigkeit(def, 'bindbar')?.stellen ?? []).map((s) => bindungsProp(s.prop)),
  )
  const klarnamen = new Set(def.eigenschaften.map((p) => p.klarnameProp))
  return def.eigenschaften.filter((p) => {
    if (direktGebunden.has(p.schluessel) || klarnamen.has(p.schluessel)) return false
    if (!eigenschaftSichtbar(p.wenn, block.werte)) return false
    const ziel = p.bearbeitung ?? (
      p.art === 'field' || p.art === 'quelle' || p.art === 'relation' ? 'inspector' : 'inline'
    )
    return ziel === ort
  })
}
