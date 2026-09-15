// Die Farbwahl im Inspector als Reihe von Farbfeldern.
import type { Wahloption } from '../../../core/blocks/PropertyDescription'
import { Farbfeld } from '@/ui/werkbank/Farbfeld'
import { Zeile } from '@/ui/werkbank/Zeile'

interface ColorTileControlProps {
  label: string
  description?: string
  value: string
  options: Wahloption[]
  onChange: (value: string) => void
}

export function ColorTileControl({ label, description, value, options, onChange }: ColorTileControlProps) {
  return (
    <Zeile breit label={label} hinweis={description}>
      {(kind) => (
        <div {...kind} className="flex flex-wrap items-center gap-1.5">
          {options.map((o) => (
            <Farbfeld
              key={o.value}
              farbe={o.farbe}
              name={o.label}
              gewaehlt={o.value === value}
              onWaehle={() => onChange(o.value)}
            />
          ))}
        </div>
      )}
    </Zeile>
  )
}
