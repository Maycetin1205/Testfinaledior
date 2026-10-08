import { useRef, useState } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { INPUT_EDGE } from '@/editor/widgets/Field'
import { List, type ListGroup } from '@/editor/widgets/List'
import { Popover } from '@/editor/widgets/Popover'
import type { OriginKind, ValueOrigin } from '../../core/data/valueOrigin'
import { decodeOrigin, encodeOrigin, KIND_NAMES, originKey, originName, originsOf, valueName } from './origins'
import type { Reach } from './reach'

const HEADINGS: Partial<Record<OriginKind, string>> = {
  row: KIND_NAMES.row,
  chosenRow: KIND_NAMES.row,
  helper: 'Feld einer Hilfsquelle',
  document: 'Feld des offenen Belegs',
  formField: 'Formularfeld',
}

// The reach in one list: a group per origin, the form fields together in one.
function pickerGroups(reach: Reach): ListGroup[] {
  const origins = originsOf(reach)
  const formFields = origins.filter((o) => o.kind === 'formField')
  return [
    ...origins.filter((o) => o.kind !== 'formField').map((o) => ({
      key: o.key,
      name: HEADINGS[o.kind],
      ...(o.kind === 'row' ? {} : { badge: o.name }),
      entries: o.entries,
    })),
    { key: 'formField', name: HEADINGS.formField, entries: formFields.flatMap((o) => o.entries.map((e) => ({ ...e, name: o.name }))) },
  ].filter((g) => g.entries.length > 0)
}

// The origin in a few words, as the place shows it.
function pickedText(o: ValueOrigin, reach: Reach): string {
  const value = valueName(o, reach)
  const from = originName(originKey(o), reach)
  switch (o.kind) {
    case 'row': return `Spalte ${value}`
    case 'chosenRow': return from !== '' ? `${value} · ${from}` : `Spalte ${value}`
    case 'helper': return from !== '' ? `${from}: ${value}` : value
    case 'document': return `Beleg: ${value}`
    case 'formField': return `Feld ${value}`
    default: return value
  }
}

// Chooses where a value comes from in one list: the origin in words, and below
// it the columns, fields and form fields the place reaches.
export function OriginPicker({ name, origin, reach, onChoose }: {
  name: string
  origin: ValueOrigin | null
  reach: Reach
  onChoose: (origin: ValueOrigin) => void
}) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const text = origin === null ? '' : pickedText(origin, reach)

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={text === '' ? name : `${name}: ${text}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(INPUT_EDGE, 'flex h-control min-w-0 items-center gap-2 px-2 text-left')}
      >
        <span className="min-w-0 flex-1 truncate font-medium">{text}</span>
        <ChevronDown size={13} aria-hidden className="shrink-0 text-muted" />
      </button>
      {open && (
        <Popover name={name} anchor={button} onClose={() => setOpen(false)}>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            <List
              searchable
              groups={pickerGroups(reach)}
              value={origin === null ? '' : encodeOrigin(origin)}
              onChoose={(v) => {
                onChoose(decodeOrigin(v))
                setOpen(false)
              }}
            />
          </div>
        </Popover>
      )}
    </>
  )
}
