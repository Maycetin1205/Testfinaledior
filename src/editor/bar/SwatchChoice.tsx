import { useRef, useState } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { OPENER } from '@/editor/widgets/Button'
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
        className={OPENER}
      >
        <span
          className="h-[16px] w-[16px] rounded-[var(--radius-small)] border border-line"
          style={{ backgroundColor: chosen?.color }}
        />
        <ChevronDown size={13} aria-hidden className="text-muted" />
      </button>
      {open && (
        <Popover
          name={label}
          anchor={button}
          width={options.length * SWATCH_STEP + 18}
          onClose={() => setOpen(false)}
        >
          <div className="flex flex-wrap gap-[6px] p-[4px]">
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
