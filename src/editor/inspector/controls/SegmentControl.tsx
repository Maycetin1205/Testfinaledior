// Eine Wahl aus wenigen Moeglichkeiten als Zungenreihe.
import type { Wahloption } from '../../../core/blocks/PropertyDescription'
import { Segment } from '@/ui/werkbank/Segment'
import { Zeile } from '@/ui/werkbank/Zeile'
import { segmentIcon } from '../segmentIcons'

interface SegmentControlProps {
  name: string
  label?: string
  description?: string
  value: string
  options: Wahloption[]
  onChange: (value: string) => void
}

function Segmente({ name, description, value, options, onChange, id }: SegmentControlProps & { id?: string }) {
  return (
    <Segment
      id={id}
      bezeichnung={name}
      hinweis={description}
      wert={value}
      optionen={options.map((o) => ({
        wert: o.value,
        name: o.label,
        zeichen: segmentIcon(o.value, { size: 13 }),
      }))}
      onWaehle={onChange}
    />
  )
}

export function SegmentControl({ label, ...rest }: SegmentControlProps) {
  if (!label) return <Segmente {...rest} />

  return (
    <Zeile label={label} hinweis={rest.description}>
      {(kind) => <Segmente {...rest} description={undefined} id={kind.id} />}
    </Zeile>
  )
}
