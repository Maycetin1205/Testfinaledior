import { cn } from '@/editor/widgets/cn'
import { TickBox } from './TickBox'

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
        // White with a line as a silent button; the box alone tells on from
        // off, as the checkbox of the mask does.
        'flex h-control min-w-0 max-w-full shrink-0 items-center gap-[8px] rounded border border-line bg-panel px-[10px]',
        'text-ui font-semibold text-ink transition-colors hover:bg-hover',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      )}
    >
      {/* Off is an empty box, not a greyed tile: the tile is not locked. */}
      <TickBox on={on} />
      <span className="min-w-0 truncate">{label}</span>
    </button>
  )
}
