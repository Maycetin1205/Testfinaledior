import { useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { INPUT_EDGE } from '@/editor/widgets/Field'
import { Button } from '@/editor/widgets/PushButton'
import { List, type ListGroup } from '@/editor/widgets/List'
import { Popover } from '@/editor/widgets/Popover'
import { Row, type RowKind } from '@/editor/widgets/Row'

export interface PickerControlProps {
  label?: string
  error?: ReactNode

  name: string
  groups: readonly ListGroup[]
  value: string

  emptyText?: string
  placeholder?: string
  className?: string
  onChoose: (value: string) => void
}

export function PickerControl({
  label,
  error,
  name,
  groups,
  value,
  emptyText,
  placeholder = '— wählen —',
  className,
  onChoose,
}: PickerControlProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const hit = groups.flatMap((g) => g.entries).find((e) => e.value === value)

  const unknown = value !== '' && hit === undefined

  const shown = unknown ? 'missing' : (hit?.name ?? emptyText ?? placeholder)

  const button = (kind?: RowKind) => (
    <Button
      ref={buttonRef}
      id={kind?.id}
      aria-describedby={kind?.['aria-describedby']}
      aria-invalid={kind?.['aria-invalid']}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={label === undefined ? `${name}: ${shown}` : undefined}
      onClick={() => setOpen(!open)}
      className={cn(INPUT_EDGE, 'flex h-steuer items-center gap-2 px-2 text-left', className)}
    >
      <span
        className={cn(
          'min-w-0 flex-1 truncate',
          value === '' && 'text-matt',
          unknown ? 'text-fehler' : value !== '' && 'font-medium',
        )}
      >
        {shown}
      </span>
      <ChevronDown size={13} aria-hidden className="shrink-0 text-matt" />
    </Button>
  )

  return (
    <>
      {label === undefined && error === undefined
        ? button()
        : <Row label={label} error={error}>{(kind) => button(kind)}</Row>}

      {open && (
        <Popover
          name={name}
          anchor={buttonRef}
          onClose={() => setOpen(false)}
        >
          <List
            searchable
            groups={groups}
            value={value}
            emptyText={emptyText}
            onChoose={(v) => {
              onChoose(v)
              setOpen(false)
            }}
          />
        </Popover>
      )}
    </>
  )
}
