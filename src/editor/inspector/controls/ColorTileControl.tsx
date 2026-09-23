import type { ChoiceOption } from '../../../core/block/property'
import { ColorSwatch } from '@/editor/widgets/ColorSwatch'
import { Row } from '@/editor/widgets/Row'

interface ColorTileControlProps {
  label: string
  value: string
  options: readonly ChoiceOption[]
  onChange: (value: string) => void
}

export function ColorTileControl({ label, value, options, onChange }: ColorTileControlProps) {
  return (
    <Row wide label={label}>
      {(kind) => (
        <div {...kind} className="flex flex-wrap items-center gap-1.5">
          {options.map((o) => (
            <ColorSwatch
              key={o.value}
              color={o.color}
              name={o.name}
              chosen={o.value === value}
              onChoose={() => onChange(o.value)}
            />
          ))}
        </div>
      )}
    </Row>
  )
}
