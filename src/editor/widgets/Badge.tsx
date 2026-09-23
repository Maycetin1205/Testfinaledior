import type { ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

export interface BadgeProps {
  children: ReactNode

  technical?: boolean
  className?: string
}

export function Badge({ children, technical = true, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'min-w-0 shrink-0 truncate rounded bg-control px-1.5 text-dense text-muted',
        technical && 'font-mono',
        className,
      )}
    >
      {children}
    </span>
  )
}
