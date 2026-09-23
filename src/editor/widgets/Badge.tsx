import type { ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

export interface MarkProps {
  children: ReactNode

  technical?: boolean
  className?: string
}

export function Mark({ children, technical = true, className }: MarkProps) {
  return (
    <span
      className={cn(
        'min-w-0 shrink-0 truncate rounded bg-control px-1.5 text-dicht text-matt',
        technical && 'font-mono',
        className,
      )}
    >
      {children}
    </span>
  )
}
