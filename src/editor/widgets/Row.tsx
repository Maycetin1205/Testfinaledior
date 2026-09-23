import { useId, type ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

export interface RowKind {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
}

export interface RowProps {
  label?: ReactNode

  error?: ReactNode

  wide?: boolean
  className?: string
  children: (kind: RowKind) => ReactNode
}

export function Row({ label, error, wide = false, className, children }: RowProps) {
  const id = useId()
  const errorId = error ? `${id}-fehler` : undefined
  const kind: RowKind = {
    id,
    'aria-describedby': errorId,
    'aria-invalid': error ? true : undefined,
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', wide && 'col-span-full', className)}>
      {label !== undefined && (
        <label htmlFor={id} className="text-ui leading-tight text-matt">
          {label}
        </label>
      )}

      <div className="flex min-w-0 flex-col">{children(kind)}</div>
      {error && <p id={errorId} className="break-words text-dicht text-fehler">{error}</p>}
    </div>
  )
}
