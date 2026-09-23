import type { Property } from '../../../core/block/property'
import { Tile } from '@/editor/widgets/Tile'

interface TileControlProps {
  property: Property<unknown>
  value: unknown
  onChange: (value: boolean) => void
}

export function TileControl({ property, value, onChange }: TileControlProps) {
  return (
    <Tile
      label={property.label}
      on={value === true}
      onToggle={onChange}
    />
  )
}
