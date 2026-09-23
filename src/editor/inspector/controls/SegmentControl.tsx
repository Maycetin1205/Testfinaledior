import type { ChoiceOption } from '../../../core/block/property'
import { Segment } from '@/editor/widgets/Segment'
import { Row } from '@/editor/widgets/Row'
import { segmentIcon } from '../segmentIcons'

interface SegmentControlProps {
  name: string
  label?: string
  value: string
  options: readonly ChoiceOption[]
  onChange: (value: string) => void
}

function SegmentField({ name, value, options, onChange, id }: SegmentControlProps & { id?: string }) {
  return (
    <Segment
      id={id}
      name={name}
      value={value}
      options={options.map((o) => ({
        value: o.value,
        name: o.name,
        icon: segmentIcon(o.value, { size: 13 }),
      }))}
      onChoose={onChange}
    />
  )
}

export function SegmentControl({ label, ...rest }: SegmentControlProps) {
  if (!label) return <SegmentField {...rest} />

  return (
    <Row label={label}>
      {(control) => <SegmentField {...rest} id={control.id} />}
    </Row>
  )
}
