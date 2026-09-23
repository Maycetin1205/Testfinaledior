import type { ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

export interface TabsProps {
  active?: boolean
  onClick: () => void
  onDoubleClick?: () => void
  className?: string
  children: ReactNode
}

export function Tabs({
  active = false,
  onClick,
  onDoubleClick,
  className,
  children,
}: TabsProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        'h-6 shrink-0 whitespace-nowrap rounded px-2.5 text-dense transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        active ? 'bg-accent/15 font-medium text-ink' : 'text-muted hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}
