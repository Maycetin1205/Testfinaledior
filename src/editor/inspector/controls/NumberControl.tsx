// Ein Zahlenwert im Inspector, mit Einheit und Grenzen.
import { useState } from 'react'
import type { Eigenschaft } from '../../../kern/maske/eigenschaft'
import { useEingabeSitzung } from './eingabeSitzung'
import { Zahl } from '@/editor/werkbank/Zahl'
import { Zeile } from '@/editor/werkbank/Zeile'

interface NumberControlProps {
  property: Eigenschaft
  value: unknown
  label?: string
  onChange: (value: number) => void

  onBeginBearbeitung?: () => void
  onEndeBearbeitung?: () => void
}

function eingrenzen(n: number, property: Eigenschaft): number {
  const min = property.min ?? Number.NEGATIVE_INFINITY
  const max = property.max ?? Number.POSITIVE_INFINITY
  return Math.min(max, Math.max(min, n))
}

function Zahlenfeld({
  property,
  value,
  onChange,
  onBeginBearbeitung,
  onEndeBearbeitung,
  id,
}: NumberControlProps & { id?: string }) {
  const sitzung = useEingabeSitzung(onBeginBearbeitung, onEndeBearbeitung)
  const aussen = typeof value === 'number' && Number.isFinite(value) ? String(value) : ''

  const [entwurf, setEntwurf] = useState(aussen)
  const [basis, setBasis] = useState(aussen)
  if (basis !== aussen) {
    setBasis(aussen)
    setEntwurf(aussen)
  }

  const uebernehmen = (roh: string): void => {
    setEntwurf(roh)
    const n = Number.parseFloat(roh.replace(',', '.'))

    if (Number.isFinite(n) && eingrenzen(n, property) === n) {
      sitzung.beginnen()
      onChange(n)
    }
  }

  return (
    <Zahl
      id={id}
      einheit={property.einheit}
      min={property.min}
      max={property.max}
      step={0.5}
      aria-label={property.name}
      title={property.beschreibung}
      value={entwurf}
      className="w-16"
      onChange={(e) => uebernehmen(e.currentTarget.value)}
      onBlur={() => {
        const n = Number.parseFloat(entwurf.replace(',', '.'))
        if (Number.isFinite(n)) {
          const begrenzt = eingrenzen(n, property)
          setEntwurf(String(begrenzt))

          sitzung.beginnen()
          onChange(begrenzt)
        } else {
          setEntwurf(aussen)
        }
        sitzung.beenden()
      }}
    />
  )
}

export function NumberControl({ label, ...rest }: NumberControlProps) {
  if (!label) return <Zahlenfeld {...rest} />
  return (
    <Zeile label={label} hinweis={rest.property.beschreibung}>
      {(kind) => <Zahlenfeld {...rest} id={kind.id} />}
    </Zeile>
  )
}
