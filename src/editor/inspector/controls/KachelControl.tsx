// Ein Ja/Nein als Kachel im Inspector.
import type { Eigenschaft } from '../../../core/blocks/PropertyDescription'
import { Kachel } from '@/ui/werkbank/Kachel'

interface KachelControlProps {
  property: Eigenschaft
  value: unknown
  onChange: (value: string) => void
}

// Welche zwei Werte ein Ja/Nein speichert, steht in der Eigenschaft selbst und
// nicht hier: die exportierte Maske haengt an genau diesen Werten.
export function KachelControl({ property, value, onChange }: KachelControlProps) {
  const optionen = property.options ?? []
  const aus = optionen[0]?.value ?? 'nein'
  const an = optionen[1]?.value ?? 'ja'

  return (
    <Kachel
      beschriftung={property.name}
      hinweis={property.description}
      an={String(value ?? '') === an}
      onSchalte={(jetztAn) => onChange(jetztAn ? an : aus)}
    />
  )
}
