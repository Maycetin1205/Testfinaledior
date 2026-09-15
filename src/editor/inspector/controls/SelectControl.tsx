// Eine Wahl aus einer Liste als natives Auswahlfeld.
import type { Wahloption } from '../../../kern/maske/eigenschaft'
import { Wahl } from '@/editor/werkbank/Wahl'
import { Zeile } from '@/editor/werkbank/Zeile'

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
