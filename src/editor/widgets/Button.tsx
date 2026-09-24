import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

type ButtonKind = 'primary' | 'silent' | 'risk'

// .vbtn, .vbtn-primaer and, for a button of only an icon, .vbtn-ghost; a risk
// is a .vbtn in the red of the mask.
const AREA: Record<ButtonKind, string> = {
  primary: 'border border-accent bg-accent text-panel hover:border-accent-ink hover:bg-accent-ink',
  silent: 'border border-line bg-panel text-ink hover:border-accent hover:bg-accent-soft',
  risk: 'border border-line bg-panel text-error hover:border-error hover:bg-error-soft',
}

const ONLY_ICON: Record<ButtonKind, string> = {
  primary: 'bg-accent text-panel hover:bg-accent-ink',
  silent: 'text-muted hover:bg-ground hover:text-ink',
  risk: 'text-muted hover:bg-error-soft hover:text-error',
}

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
        'inline-flex h-control shrink-0 items-center justify-center gap-[6px] whitespace-nowrap rounded text-ui font-[550]',
        'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        'disabled:pointer-events-none disabled:opacity-[.45]',
        onlyIcon ? `w-control ${ONLY_ICON[kind]}` : `px-[10px] ${AREA[kind]}`,
        className,
      )}
      {...rest}
    />
  ),
)
Button.displayName = 'Button'
