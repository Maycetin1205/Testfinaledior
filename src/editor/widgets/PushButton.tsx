import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

export type ButtonKind = 'primary' | 'silent' | 'risk'

const AREA: Record<ButtonKind, string> = {
  primary: 'bg-akzent font-medium text-grund hover:bg-akzent/85',
  silent: 'border border-linie bg-control text-tinte hover:border-matt',
  risk: 'border border-fehler/60 text-fehler hover:bg-fehler/15',
}

const ONLY_ICON: Record<ButtonKind, string> = {
  primary: 'bg-akzent text-grund hover:bg-akzent/85',
  silent: 'text-matt hover:bg-control hover:text-tinte',
  risk: 'text-matt hover:bg-fehler/15 hover:text-fehler',
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
        'inline-flex h-steuer shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded text-ui',
        'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent',
        'disabled:pointer-events-none disabled:opacity-40',
        onlyIcon ? `w-steuer ${ONLY_ICON[kind]}` : `px-2.5 ${AREA[kind]}`,
        className,
      )}
      {...rest}
    />
  ),
)
Button.displayName = 'Knopf'
