// Eine Wahl aus einer Liste als natives Auswahlfeld.
import type { Wahloption } from '../../../core/blocks/PropertyDescription'
import { Wahl } from '@/ui/werkbank/Wahl'
import { Zeile } from '@/ui/werkbank/Zeile'

type SelectOption = Wahloption & { detail?: string }

interface SelectControlProps {
  label: string
  description?: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}

export function SelectControl({ label, description, value, options, onChange }: SelectControlProps) {
  return (
    <Zeile label={label} hinweis={description}>
      {(kind) => (
        <Wahl
          {...kind}
          wert={value ?? ''}
          optionen={options.map((o) => ({ wert: o.value, name: o.label, kennung: o.detail }))}
          onWaehle={onChange}
        />
      )}
    </Zeile>
  )
}
