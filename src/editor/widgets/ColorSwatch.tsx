import { Check } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'

interface ColorSwatchProps {
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
        // The chosen color with the blue outline a focused button of the mask has.
        'flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[var(--radius-small)] border border-line',
        'outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
        chosen
          ? 'outline outline-2 outline-accent'
          : 'hover:outline hover:outline-2 hover:outline-box-line',
      )}
    >
      {chosen && <Check size={13} strokeWidth={3} className="text-panel" />}
    </button>
  )
}
