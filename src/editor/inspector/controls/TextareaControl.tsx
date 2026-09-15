// Ein mehrzeiliger Text im Inspector.
import type { Eigenschaft } from '../../../kern/maske/eigenschaft'
import { useEingabeSitzung } from './eingabeSitzung'
import { FeldMehrzeilig } from '@/editor/werkbank/Feld'
import { Zeile } from '@/editor/werkbank/Zeile'

interface TextareaControlProps {
  property: Eigenschaft
  value: string
  onChange: (value: string) => void

  onBeginBearbeitung?: () => void
  onEndeBearbeitung?: () => void
}

export function TextareaControl({
  property,
  value,
  onChange,
  onBeginBearbeitung,
  onEndeBearbeitung,
}: TextareaControlProps) {
  const sitzung = useEingabeSitzung(onBeginBearbeitung, onEndeBearbeitung)
  return (
    <Zeile breit label={property.name} hinweis={property.beschreibung}>
      {(kind) => (
        <FeldMehrzeilig
          {...kind}
          value={value ?? ''}
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
