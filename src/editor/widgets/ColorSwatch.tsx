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
        'flex h-6 w-6 shrink-0 items-center justify-center rounded border border-linie',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent focus-visible:ring-offset-1',
        chosen
          ? 'ring-1 ring-akzent ring-offset-1'
          : 'hover:ring-1 hover:ring-matt hover:ring-offset-1',
      )}
    >
      {chosen && <Check size={13} strokeWidth={3} className="text-grund" />}
    </button>
  )
}
