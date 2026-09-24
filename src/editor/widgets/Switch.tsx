import { cn } from '@/editor/widgets/cn'

interface SwitchProps {
  on: boolean

  label?: string
  name?: string
  id?: string
  disabled?: boolean
  onToggle: (on: boolean) => void
}

export function Switch({
  on,
  label,
  name,
  id,
  disabled = false,
  onToggle,
}: SwitchProps) {
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
          'relative h-[16px] w-[28px] shrink-0 rounded border transition-colors',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
          'disabled:pointer-events-none disabled:opacity-[.45]',
          on ? 'border-accent bg-accent' : 'border-line bg-control',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute top-[2px] h-[10px] w-[10px] rounded transition-all',
            on ? 'left-[14px] bg-panel' : 'left-[2px] bg-muted',
          )}
        />
      </button>
      {label !== undefined && (
        <span className="min-w-0 truncate text-ui text-ink">{label}</span>
      )}
    </span>
  )
}
