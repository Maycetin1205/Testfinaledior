// Ein einzeiliger Text im Inspector.
import type { Eigenschaft } from '../../../core/blocks/PropertyDescription'
import { useEingabeSitzung } from './eingabeSitzung'
import { Feld } from '@/ui/werkbank/Feld'
import { Zeile } from '@/ui/werkbank/Zeile'

interface TextControlProps {
  property: Eigenschaft
  value: string
  onChange: (value: string) => void

  onBeginBearbeitung?: () => void
  onEndeBearbeitung?: () => void
}

export function TextControl({
  property,
  value,
  onChange,
  onBeginBearbeitung,
  onEndeBearbeitung,
}: TextControlProps) {
  const sitzung = useEingabeSitzung(onBeginBearbeitung, onEndeBearbeitung)
  return (
    <Zeile label={property.name} hinweis={property.description}>
      {(kind) => (
        <Feld
          {...kind}
          value={value}
          maxLength={property.maxLength || undefined}
          onChange={(e) => {
            sitzung.beginnen()
            onChange(e.currentTarget.value)
          }}
          onBlur={sitzung.beenden}
        />
      )}
    </Zeile>
  )
}
