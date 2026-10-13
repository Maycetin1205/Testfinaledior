import { Check } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'

// The box of a checkbox in the mask (.cb of behandlung-modern.html): a soft
// edge on white, blue with a white tick once it is on.
export function TickBox({ on, className }: { on: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[var(--radius-small)] border-[1.5px] transition-colors',
        on ? 'border-accent bg-accent text-panel' : 'border-box-line bg-panel',
        className,
      )}
    >
      {on && <Check size={12} strokeWidth={3} />}
    </span>
  )
}
