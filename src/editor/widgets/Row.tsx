import { useId, type ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

export interface RowControl {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
}

interface RowProps {
  label?: ReactNode

  error?: ReactNode

  wide?: boolean
  className?: string
  children: (control: RowControl) => ReactNode
}

export function Row({ label, error, wide = false, className, children }: RowProps) {
  const id = useId()
  const errorId = error ? `${id}-error` : undefined
  const control: RowControl = {
    id,
    'aria-describedby': errorId,
    'aria-invalid': error ? true : undefined,
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', wide && 'col-span-full', className)}>
      {label !== undefined && (
        <label htmlFor={id} className="text-ui leading-tight text-muted">
          {label}
        </label>
      )}

      <div className="flex min-w-0 flex-col">{children(control)}</div>
      {error && <p id={errorId} className="break-words text-dense text-error">{error}</p>}
    </div>
  )
}
