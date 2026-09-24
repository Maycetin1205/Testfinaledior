import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/editor/widgets/cn'
import { INPUT_EDGE } from './Field'

interface NumberProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  unit?: string
}

export const NumberInput = forwardRef<HTMLInputElement, NumberProps>(
  ({ unit, className, ...rest }, ref) => (
    <span className="relative inline-flex shrink-0 items-center">
      <input
        ref={ref}

        type="text"
        inputMode="decimal"
        className={cn(
          INPUT_EDGE,
          'h-control px-2 tabular-nums',
          unit !== undefined && unit !== '' && 'pr-6',
          className,
        )}
        {...rest}
      />
      {unit !== undefined && unit !== '' && (
        <span aria-hidden className="pointer-events-none absolute right-2 text-dense text-muted">
          {unit}
        </span>
      )}
    </span>
  ),
)
NumberInput.displayName = 'NumberInput'
