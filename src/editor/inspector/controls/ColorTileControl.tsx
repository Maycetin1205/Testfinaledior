// Die Farbwahl im Inspector als Reihe von Farbfeldern.
import type { Wahloption } from '../../../kern/maske/eigenschaft'
import { Farbfeld } from '@/editor/werkbank/Farbfeld'
import { Zeile } from '@/editor/werkbank/Zeile'

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
              key={o.wert}
              farbe={o.farbe}
              name={o.name}
              gewaehlt={o.wert === value}
              onWaehle={() => onChange(o.wert)}
            />
          ))}
        </div>
      )}
    </Zeile>
  )
}
