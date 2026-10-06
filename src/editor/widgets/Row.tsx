import { useId, type ReactNode } from 'react'

interface RowProps {
  label?: ReactNode
  children: (id: string) => ReactNode
}

// A control under its name; the id ties the name to the control.
export function Row({ label, children }: RowProps) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      {label !== undefined && (
        <label htmlFor={id} className="text-ui leading-tight text-muted">
          {label}
        </label>
      )}
      <div className="flex min-w-0 flex-col">{children(id)}</div>
    </div>
  )
}
