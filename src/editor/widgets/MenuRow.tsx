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
        'flex h-control w-full min-w-0 items-center gap-2 rounded px-2 text-left text-ui text-ink',
        'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        'disabled:pointer-events-none disabled:opacity-[.45]',
        active ? 'bg-accent-soft' : 'hover:bg-accent-soft',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
