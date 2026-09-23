import type { Property } from '../../../core/block/property'
import { useInputSession } from './editSession'
import { FieldMultiline } from '@/editor/widgets/Field'
import { Row } from '@/editor/widgets/Row'

interface TextareaControlProps {
  property: Property<unknown>
  value: string
  onChange: (value: string) => void

  onBeginEditing?: () => void
  onEndEditing?: () => void
}

export function TextareaControl({
  property,
  value,
  onChange,
  onBeginEditing,
  onEndEditing,
}: TextareaControlProps) {
  const session = useInputSession(onBeginEditing, onEndEditing)
  return (
    <Row wide label={property.label}>
      {(kind) => (
        <FieldMultiline
          {...kind}
          value={value ?? ''}
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
