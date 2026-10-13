import type { ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

interface BadgeProps {
  children: ReactNode

  technical?: boolean
  className?: string
}

// What an entry is called in SoftEngine, like a field code: quiet text beside
// the name, as .tbl .code of the mask, no ground of its own.
export function Badge({ children, technical = true, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'min-w-0 shrink-0 truncate text-dense text-muted',
        technical && 'font-mono',
        className,
      )}
    >
      {children}
    </span>
  )
}
