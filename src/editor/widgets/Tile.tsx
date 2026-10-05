import { Check } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'

interface TileProps {
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
        'flex h-control min-w-0 max-w-full shrink-0 items-center gap-1.5 rounded border px-[10px]',
        'text-ui transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        on
          ? 'border-accent bg-accent-soft font-[550] text-ink'
          : 'border-line bg-panel text-ink hover:border-accent',
      )}
    >
      {/* Off is an empty box, not a greyed tile: the tile is not locked. */}
      {on
        ? <Check size={12} aria-hidden className="shrink-0" />
        : <span aria-hidden className="h-[12px] w-[12px] shrink-0 rounded border border-line" />}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  )
}
