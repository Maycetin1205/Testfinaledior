import { useRef, useState } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { INPUT_EDGE } from '@/editor/widgets/Field'
import { Button } from '@/editor/widgets/Button'
import { List, type ListGroup } from '@/editor/widgets/List'
import { Popover } from '@/editor/widgets/Popover'
import { Row } from '@/editor/widgets/Row'

interface PickerControlProps {
  label?: string

  name: string
  groups: readonly ListGroup[]
  value: string

  // What the button shows while nothing is chosen; the list offers it as a choice.
  emptyText?: string
  className?: string
  onChoose: (value: string) => void
}

// A button that opens a list to choose from. It shows the name of the chosen
// entry; a value the list does not have shows nothing.
export function PickerControl({
  label,
  name,
  groups,
  value,
  emptyText,
  className,
  onChoose,
}: PickerControlProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const hit = groups.flatMap((g) => g.entries).find((e) => e.value === value)

  const shown = hit?.name ?? (value === '' ? emptyText ?? '' : '')

  const button = (id?: string) => (
    <Button
      ref={buttonRef}
      id={id}
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
          hit !== undefined && 'font-medium',
        )}
      >
        {shown}
      </span>
      <ChevronDown size={13} aria-hidden className="shrink-0 text-muted" />
    </Button>
  )

  return (
    <>
      {label === undefined
        ? button()
        : <Row label={label}>{(id) => button(id)}</Row>}

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
