import type { ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

interface TabsProps {
  active?: boolean
  onClick: () => void
  onDoubleClick?: () => void
  // The whole name, for a tab that ends in an ellipsis.
  title?: string
  className?: string
  children: ReactNode
}

export function Tabs({
  active = false,
  onClick,
  onDoubleClick,
  title,
  className,
  children,
}: TabsProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        // As high as a button of the toolbar; a long name ends in an ellipsis
        // at the width of the mask name field.
        'h-control max-w-40 shrink-0 truncate rounded px-[10px] text-ui font-[550] transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        active ? 'bg-accent text-panel' : 'text-muted hover:bg-ground hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}
