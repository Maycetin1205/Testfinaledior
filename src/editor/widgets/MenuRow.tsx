import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

type MenuRowKind = 'silent' | 'risk'

const KIND: Record<MenuRowKind, { color: string; hover: string }> = {
  silent: { color: 'text-ink', hover: 'hover:bg-accent-soft' },
  risk: { color: 'text-error', hover: 'hover:bg-error-soft' },
}

interface MenuRowProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon?: ReactNode

  active?: boolean
  kind?: MenuRowKind
  children: ReactNode
}

export function MenuRow({
  icon,
  active = false,
  kind = 'silent',
  className,
  children,
  type = 'button',
  ...rest
}: MenuRowProps) {
  return (
    <button
      type={type}
      className={cn(
        'flex h-control w-full min-w-0 items-center gap-2 rounded px-2 text-left text-ui',
        'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        'disabled:pointer-events-none disabled:opacity-[.45]',
        KIND[kind].color,
        active ? 'bg-accent-soft' : KIND[kind].hover,
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
