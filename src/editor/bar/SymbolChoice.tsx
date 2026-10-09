import { useRef, useState } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { Popover } from '@/editor/widgets/Popover'
import { cn } from '@/editor/widgets/cn'
import type { ChoiceOption } from '../../core/block/property'
import { Labeled } from './Labeled'

const SYMBOL_STEP = 34
const SYMBOLS_PER_LINE = 8

function Outline({ path, size }: { path: string | undefined; size: number }) {
  if (path === undefined) return <span className="block" style={{ width: size, height: size }} />
  return (
    <svg viewBox="0 0 256 256" width={size} height={size} fill="currentColor" aria-hidden>
      <path d={path} />
    </svg>
  )
}

// A choice of symbols: the chosen one in the bar, all of them in a small
// window, each as its outline with its name on hover. „Kein" is the empty
// square in front.
export function SymbolChoice({
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
        title={`${label}: ${chosen?.name ?? ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-control shrink-0 items-center gap-[6px] rounded border border-line bg-panel px-[6px] text-ink transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        {chosen?.icon === undefined
          ? <span className="text-dense text-muted">{label}</span>
          : <Outline path={chosen.icon} size={16} />}
        <ChevronDown size={13} aria-hidden className="text-muted" />
      </button>
      {open && (
        <Popover
          name={label}
          anchor={button}
          width={Math.min(options.length, SYMBOLS_PER_LINE) * SYMBOL_STEP + 14}
          onClose={() => setOpen(false)}
        >
          <div className="flex flex-wrap gap-[4px] p-[2px]">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-label={o.name}
                aria-pressed={o.value === value}
                title={o.name}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className={cn(
                  'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded text-ink',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                  o.value === value ? 'bg-accent-soft ring-1 ring-accent' : 'hover:bg-control',
                  o.icon === undefined && 'border border-dashed border-line',
                )}
              >
                <Outline path={o.icon} size={18} />
              </button>
            ))}
          </div>
        </Popover>
      )}
    </Labeled>
  )
}
