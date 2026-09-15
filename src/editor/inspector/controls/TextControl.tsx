// Ein einzeiliger Text im Inspector.
import type { Eigenschaft } from '../../../kern/maske/eigenschaft'
import { useEingabeSitzung } from './eingabeSitzung'
import { Feld } from '@/editor/werkbank/Feld'
import { Zeile } from '@/editor/werkbank/Zeile'

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
    <Zeile label={property.name} hinweis={property.beschreibung}>
      {(kind) => (
        <Feld
          {...kind}
          value={value}
          maxLength={property.maxLaenge || undefined}
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
