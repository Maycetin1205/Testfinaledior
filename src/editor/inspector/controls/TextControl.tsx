import type { Property } from '../../../core/block/property'
import { useInputSession } from './editSession'
import { Field } from '@/editor/widgets/Field'
import { Row } from '@/editor/widgets/Row'

interface TextControlProps {
  property: Property<unknown>
  value: string
  onChange: (value: string) => void

  onBeginEditing?: () => void
  onEndEditing?: () => void
}

export function TextControl({
  property,
  value,
  onChange,
  onBeginEditing,
  onEndEditing,
}: TextControlProps) {
  const session = useInputSession(onBeginEditing, onEndEditing)
  return (
    <Row label={property.label} hint={property.help}>
      {(kind) => (
        <Field
          {...kind}
          value={value}
          maxLength={property.maxLength || undefined}
          onChange={(e) => {
            session.begin()
            onChange(e.currentTarget.value)
          }}
          onBlur={session.finish}
        />
      )}
    </Row>
  )
}
