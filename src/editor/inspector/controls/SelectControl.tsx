import type { ChoiceOption } from '../../../core/block/property'
import { Choice } from '@/editor/widgets/Select'
import { Row } from '@/editor/widgets/Row'

type SelectOption = ChoiceOption & { detail?: string }

interface SelectControlProps {
  label: string
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
}

export function SelectControl({ label, value, options, onChange }: SelectControlProps) {
  return (
    <Row label={label}>
      {(kind) => (
        <Choice
          {...kind}
          value={value ?? ''}
          options={options.map((o) => ({ value: o.value, name: o.name, badge: o.detail }))}
          onChoose={onChange}
        />
      )}
    </Row>
  )
}
