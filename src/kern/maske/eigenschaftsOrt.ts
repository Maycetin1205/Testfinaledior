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
  const klarnamen = new Set(def.customProperties.map((p) => p.klarnameProp))
  return def.customProperties.filter((p) => {
    if (direktGebunden.has(p.attributeName) || klarnamen.has(p.attributeName)) return false
    if (!eigenschaftSichtbar(p.visibleWhen, block.props)) return false
    const ziel = p.bearbeitung ?? (
      p.kind === 'field' || p.kind === 'quelle' || p.kind === 'relation' ? 'inspector' : 'inline'
    )
    return ziel === ort
  })
}
