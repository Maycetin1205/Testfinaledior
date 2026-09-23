import { Check } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'

export interface TileProps {
  label: string
  on: boolean
  id?: string
  onToggle: (on: boolean) => void
}

export function Tile({ label, on, id, onToggle }: TileProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onToggle(!on)}
      className={cn(
        'flex h-steuer min-w-0 max-w-full shrink-0 items-center gap-1.5 rounded border px-2',
        'text-ui transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent',
        on
          ? 'border-akzent bg-akzent/15 font-medium text-tinte'
          : 'border-linie text-matt hover:border-matt hover:text-tinte',
      )}
    >
      <Check size={12} aria-hidden className={cn('shrink-0', !on && 'invisible')} />
      <span className="min-w-0 truncate">{label}</span>
    </button>
  )
}
