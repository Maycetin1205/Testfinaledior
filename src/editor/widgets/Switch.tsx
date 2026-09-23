import { cn } from '@/editor/widgets/cn'

export interface FlagProps {
  on: boolean

  label?: string
  name?: string
  id?: string
  disabled?: boolean
  onToggle: (on: boolean) => void
}

export function Flag({
  on,
  label,
  name,
  id,
  disabled = false,
  onToggle,
}: FlagProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label === undefined ? name : undefined}
        disabled={disabled}
        onClick={() => onToggle(!on)}
        className={cn(
          'relative h-4 w-7 shrink-0 rounded border transition-colors',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent',
          'disabled:pointer-events-none disabled:opacity-40',
          on ? 'border-akzent bg-akzent' : 'border-linie bg-control',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-0.5 h-2.5 w-2.5 rounded-[1px] transition-all',
            on ? 'left-3.5 bg-grund' : 'left-0.5 bg-matt',
          )}
        />
      </button>
      {label !== undefined && (
        <span className="min-w-0 truncate text-ui text-tinte">{label}</span>
      )}
    </span>
  )
}
