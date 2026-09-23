import { useState } from 'react'
import type { Property } from '../../../core/block/property'
import { useInputSession } from './editSession'
import { NumberInput } from '@/editor/widgets/NumberInput'
import { Row } from '@/editor/widgets/Row'

interface NumberControlProps {
  property: Property<unknown>
  value: unknown
  label?: string
  onChange: (value: number) => void

  onBeginEditing?: () => void
  onEndEditing?: () => void
}

function narrow(n: number, property: Property<unknown>): number {
  const min = property.min ?? Number.NEGATIVE_INFINITY
  const max = property.max ?? Number.POSITIVE_INFINITY
  return Math.min(max, Math.max(min, n))
}

function NumberField({
  property,
  value,
  onChange,
  onBeginEditing,
  onEndEditing,
  id,
}: NumberControlProps & { id?: string }) {
  const session = useInputSession(onBeginEditing, onEndEditing)
  const outside = typeof value === 'number' && Number.isFinite(value) ? String(value) : ''

  const [draft, setDraft] = useState(outside)
  const [base, setBase] = useState(outside)
  if (base !== outside) {
    setBase(outside)
    setDraft(outside)
  }

  const adopt = (raw: string): void => {
    setDraft(raw)
    const n = Number.parseFloat(raw.replace(',', '.'))

    if (Number.isFinite(n) && narrow(n, property) === n) {
      session.begin()
      onChange(n)
    }
  }

  return (
    <NumberInput
      id={id}
      unit={property.unit}
      min={property.min}
      max={property.max}
      step={0.5}
      aria-label={property.label}
      value={draft}
      className="w-16"
      onChange={(e) => adopt(e.currentTarget.value)}
      onBlur={() => {
        const n = Number.parseFloat(draft.replace(',', '.'))
        if (Number.isFinite(n)) {
          const clamped = narrow(n, property)
          setDraft(String(clamped))

          session.begin()
          onChange(clamped)
        } else {
          setDraft(outside)
        }
        session.finish()
      }}
    />
  )
}

export function NumberControl({ label, ...rest }: NumberControlProps) {
  if (!label) return <NumberField {...rest} />
  return (
    <Row label={label}>
      {(control) => <NumberField {...rest} id={control.id} />}
    </Row>
  )
}
