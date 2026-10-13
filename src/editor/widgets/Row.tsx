import { useId, type ReactNode } from 'react'

interface RowProps {
  label?: ReactNode
  children: (id: string) => ReactNode
}

// A control under its name, the name as the label of a field of the mask
// (.f .l); the id ties the name to the control.
export function Row({ label, children }: RowProps) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-[2px]">
      {label !== undefined && (
        <label htmlFor={id} className="text-dense font-semibold leading-tight text-muted">
          {label}
        </label>
      )}
      <div className="flex min-w-0 flex-col">{children(id)}</div>
    </div>
  )
}
