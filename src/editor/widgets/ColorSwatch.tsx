import { Check } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'

export interface ColorSwatchProps {
  color?: string

  name: string

  chosen: boolean
  onChoose: () => void
}

export function ColorSwatch({ color, name, chosen, onChoose }: ColorSwatchProps) {
  return (
    <button
      type="button"
      aria-label={name}
      aria-pressed={chosen}
      title={name}
      onClick={onChoose}
      style={{ backgroundColor: color }}
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1',
        chosen
          ? 'ring-1 ring-accent ring-offset-1'
          : 'hover:ring-1 hover:ring-muted hover:ring-offset-1',
      )}
    >
      {chosen && <Check size={13} strokeWidth={3} className="text-ground" />}
    </button>
  )
}
