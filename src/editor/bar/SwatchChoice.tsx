import { useRef, useState } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { ColorSwatch } from '@/editor/widgets/ColorSwatch'
import { Popover } from '@/editor/widgets/Popover'
import type { ChoiceOption } from '../../core/block/property'
import { Labeled } from './Labeled'

const SWATCH_STEP = 30

// A choice of colors: the chosen one in the bar, all of them in a small window.
export function SwatchChoice({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly ChoiceOption[]
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const chosen = options.find((o) => o.value === value) ?? options[0]

  return (
    <Labeled label={label}>
      <button
        ref={button}
        type="button"
        aria-label={`${label}: ${chosen?.name ?? ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-control shrink-0 items-center gap-[6px] rounded border border-line bg-panel px-[6px] transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        <span
          className="h-[14px] w-[14px] rounded border border-line"
          style={{ backgroundColor: chosen?.color }}
        />
        <ChevronDown size={13} aria-hidden className="text-muted" />
      </button>
      {open && (
        <Popover
          name={label}
          anchor={button}
          width={options.length * SWATCH_STEP + 14}
          onClose={() => setOpen(false)}
        >
          <div className="flex flex-wrap gap-[6px] p-[2px]">
            {options.map((o) => (
              <ColorSwatch
                key={o.value}
                color={o.color}
                name={o.name}
                chosen={o.value === value}
                onChoose={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
              />
            ))}
          </div>
        </Popover>
      )}
    </Labeled>
  )
}
