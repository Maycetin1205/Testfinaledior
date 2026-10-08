import type { ReactNode, RefObject } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { List, type ListGroup } from '@/editor/widgets/List'
import { Popover } from '@/editor/widgets/Popover'

// A cell that opens a short list, the origin or the entry of a line: what it
// shows, and a chevron on the marked line.
export function ChoiceCell({ label, on, open, groups, value, cellRef, onOpen, onChoose }: {
  label: ReactNode
  on: boolean
  open: boolean
  groups: () => ListGroup[]
  value: string
  cellRef: RefObject<HTMLButtonElement | null>
  onOpen: (open: boolean) => void
  onChoose: (value: string) => void
}) {
  return (
    <>
      <button
        ref={cellRef}
        type="button"
        tabIndex={on ? 0 : -1}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          onOpen(!open)
        }}
        className="flex h-[28px] w-full min-w-0 items-center gap-[6px] px-[10px] text-left outline-none"
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {on && <ChevronDown size={13} aria-hidden className="shrink-0 opacity-80" />}
      </button>
      {open && (
        <Popover name="Wahl" anchor={cellRef} width={280} level={70} onClose={() => onOpen(false)}>
          <List searchable groups={groups()} value={value} onChoose={onChoose} />
        </Popover>
      )}
    </>
  )
}
