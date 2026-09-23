import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { INPUT_EDGE } from './Field'

export interface ChoiceOption {
  value: string
  name: string

  badge?: string
  disabled?: boolean
}

export interface ChoiceProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'children'> {
  options: readonly ChoiceOption[]
  value: string

  emptyText?: string
  onChoose: (value: string) => void
}

export const Choice = forwardRef<HTMLSelectElement, ChoiceProps>(
  ({ options, value, emptyText, onChoose, className, ...rest }, ref) => {
    const unknown = value !== '' && !options.some((o) => o.value === value)

    return (
      <span className={cn('relative inline-flex min-w-0 items-center', className ?? 'w-full')}>
        <select
          ref={ref}
          value={value}
          onChange={(e) => onChoose(e.currentTarget.value)}
          className={cn(
            INPUT_EDGE,
            'h-steuer cursor-pointer appearance-none py-0 pl-2 pr-7',
            unknown && 'text-fehler',
          )}
          {...rest}
        >
          {emptyText !== undefined && <option value="">{emptyText}</option>}

          {unknown && <option value={value}>{value}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.badge === undefined || o.badge === '' ? o.name : `${o.name} — ${o.badge}`}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          aria-hidden
          className="pointer-events-none absolute right-2 text-matt"
        />
      </span>
    )
  },
)
Choice.displayName = 'Wahl'
