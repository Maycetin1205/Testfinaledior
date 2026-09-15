import type { BlockNode } from './BlockData'
import { type BlockDefinition } from './BlockDefinition'
import { bindingProp, faehigkeit } from './faehigkeiten'
import { propertySichtbar, type PropertyDescription } from './PropertyDescription'

export function eigenschaftenFuer(
  block: BlockNode,
  def: BlockDefinition,
  ort: 'inline' | 'inspector',
): PropertyDescription[] {
  // Ausdruecklich Set<string>: `bindingProp` liefert `${P}Field`, und danach
  // gefragt wird mit einem gewoehnlichen Eigenschaftsnamen.
  const direktGebunden = new Set<string>(
    (faehigkeit(def, 'bindbar')?.stellen ?? []).map((s) => bindingProp(s.prop)),
  )
  const klarnamen = new Set(def.customProperties.map((p) => p.klarnameProp))
  return def.customProperties.filter((p) => {
    if (direktGebunden.has(p.attributeName) || klarnamen.has(p.attributeName)) return false
    if (!propertySichtbar(p.visibleWhen, block.props)) return false
    const ziel = p.bearbeitung ?? (
      p.kind === 'field' || p.kind === 'quelle' || p.kind === 'relation' ? 'inspector' : 'inline'
    )
    return ziel === ort
  })
}
