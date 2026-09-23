import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

export type ButtonKind = 'primary' | 'silent' | 'risk'

const AREA: Record<ButtonKind, string> = {
  primary: 'bg-accent font-medium text-ground hover:bg-accent/85',
  silent: 'border border-line bg-control text-ink hover:border-muted',
  risk: 'border border-error/60 text-error hover:bg-error/15',
}

const ONLY_ICON: Record<ButtonKind, string> = {
  primary: 'bg-accent text-ground hover:bg-accent/85',
  silent: 'text-muted hover:bg-control hover:text-ink',
  risk: 'text-muted hover:bg-error/15 hover:text-error',
}

interface ButtonBase extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  kind?: ButtonKind
  children: ReactNode
}

export type ButtonProps =
  & ButtonBase
  & ({ onlyIcon: true; 'aria-label': string } | { onlyIcon?: false })

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ kind = 'silent', onlyIcon = false, className, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex h-control shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded text-ui',
        'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        'disabled:pointer-events-none disabled:opacity-40',
        onlyIcon ? `w-control ${ONLY_ICON[kind]}` : `px-2.5 ${AREA[kind]}`,
        className,
      )}
      {...rest}
    />
  ),
)
Button.displayName = 'Button'
