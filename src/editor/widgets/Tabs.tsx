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
        // As high as a button of the toolbar and dressed like one: the active
        // page blue as the primary button, the others white with a line. A long
        // name ends in an ellipsis at the width of the mask name field.
        'h-control max-w-40 shrink-0 truncate rounded border px-[12px] text-ui font-semibold transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        active ? 'border-accent bg-accent text-panel' : 'border-line bg-panel text-ink hover:bg-hover',
        className,
      )}
    >
      {children}
    </button>
  )
}
