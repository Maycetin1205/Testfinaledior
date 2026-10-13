import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

interface MenuRowProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon?: ReactNode

  active?: boolean
  children: ReactNode
}

export function MenuRow({
  icon,
  active = false,
  className,
  children,
  type = 'button',
  ...rest
}: MenuRowProps) {
  return (
    <button
      type={type}
      className={cn(
        // A line of the small windows of the mask, as List draws its entries.
        'flex h-control w-full min-w-0 items-center gap-[8px] rounded-[var(--radius-small)] px-[9px] text-left text-ui font-semibold text-ink',
        'transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
        'disabled:pointer-events-none disabled:opacity-[.45]',
        active ? 'bg-accent-soft text-accent-ink' : 'hover:bg-hover',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
