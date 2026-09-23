import type { ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

export interface SegmentOption {
  value: string

  name: string
  icon?: ReactNode
}

export interface SegmentProps {
  name: string
  options: readonly SegmentOption[]
  value: string
  id?: string
  onChoose: (value: string) => void
}

export function Segment({
  name,
  options,
  value,
  id,
  onChoose,
}: SegmentProps) {
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={name}
      className="flex h-steuer w-fit items-center gap-px rounded border border-linie bg-control p-px"
    >
      {options.map((o) => {
        const chosen = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={chosen}
            aria-label={o.name}
            title={o.icon === undefined ? undefined : o.name}
            onClick={() => onChoose(o.value)}
            className={cn(
              'flex h-full shrink-0 items-center justify-center whitespace-nowrap rounded text-dicht transition-colors',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent',
              o.icon === undefined ? 'px-2' : 'px-1.5',
              chosen
                ? 'bg-akzent font-medium text-grund'
                : 'text-matt hover:text-tinte',
            )}
          >
            {o.icon ?? o.name}
          </button>
        )
      })}
    </div>
  )
}
