import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

type ButtonKind = 'primary' | 'silent' | 'risk'

// The buttons of the mask (behandlung-modern.html): .btn.pri filled blue, .tog
// white with a line, .btn.dan in red; a button of only an icon has no edge,
// like .btn.txt.
const AREA: Record<ButtonKind, string> = {
  primary: 'border border-accent bg-accent text-panel hover:border-accent-ink hover:bg-accent-ink',
  silent: 'border border-line bg-panel text-ink hover:bg-hover',
  risk: 'border border-line bg-panel text-error hover:border-error hover:bg-error-soft',
}

const ONLY_ICON: Record<ButtonKind, string> = {
  primary: 'bg-accent text-panel hover:bg-accent-ink',
  silent: 'text-muted hover:bg-hover hover:text-ink',
  risk: 'text-muted hover:bg-error-soft hover:text-error',
}

// A button whose window is open or whose mode is on: the soft blue of a chosen
// row of the mask, the edge and the text blue.
export const PRESSED = 'border-accent bg-accent-soft text-accent hover:bg-accent-soft'

// A button that shows a choice and opens a small window of all of them, like a
// color or a field: white with a line as a silent button, pressed while open.
export const OPENER =
  'flex h-control shrink-0 items-center gap-[6px] rounded border border-line bg-panel px-[8px] text-ui font-semibold text-ink transition-colors'
  + ' hover:bg-hover aria-expanded:border-accent aria-expanded:bg-accent-soft'
  + ' focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

interface ButtonBase extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  kind?: ButtonKind
  children: ReactNode
}

type ButtonProps =
  & ButtonBase
  & ({ onlyIcon: true; 'aria-label': string } | { onlyIcon?: false })

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ kind = 'silent', onlyIcon = false, className, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex h-control shrink-0 items-center justify-center gap-[6px] whitespace-nowrap rounded text-ui font-semibold',
        // The focus of a button in the mask: a blue outline beside it.
        'transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:pointer-events-none disabled:opacity-[.45]',
        onlyIcon ? `w-control ${ONLY_ICON[kind]}` : `px-[12px] ${AREA[kind]}`,
        className,
      )}
      {...rest}
    />
  ),
)
Button.displayName = 'Button'
