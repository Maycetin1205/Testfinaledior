import { useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { INPUT_EDGE } from '@/editor/widgets/Field'
import { Button } from '@/editor/widgets/Button'
import { List, type ListGroup } from '@/editor/widgets/List'
import { Popover } from '@/editor/widgets/Popover'
import { Row, type RowControl } from '@/editor/widgets/Row'

interface PickerControlProps {
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

  const shown = unknown ? 'fehlt' : (hit?.name ?? emptyText ?? placeholder)

  const button = (control?: RowControl) => (
    <Button
      ref={buttonRef}
      id={control?.id}
      aria-describedby={control?.['aria-describedby']}
      aria-invalid={control?.['aria-invalid']}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={label === undefined ? `${name}: ${shown}` : undefined}
      onClick={() => setOpen(!open)}
      className={cn(INPUT_EDGE, 'flex h-control items-center gap-2 px-2 text-left focus-visible:ring-0', className)}
    >
      <span
        className={cn(
          'min-w-0 flex-1 truncate',
          value === '' && 'text-muted',
          unknown ? 'text-error' : value !== '' && 'font-medium',
        )}
      >
        {shown}
      </span>
      <ChevronDown size={13} aria-hidden className="shrink-0 text-muted" />
    </Button>
  )

  return (
    <>
      {label === undefined && error === undefined
        ? button()
        : <Row label={label} error={error}>{(control) => button(control)}</Row>}

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
