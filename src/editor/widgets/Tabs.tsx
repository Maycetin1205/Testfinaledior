import type { ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

export interface TabsProps {
  active?: boolean
  title?: string
  onClick: () => void
  onDoubleClick?: () => void
  className?: string
  children: ReactNode
}

export function Tabs({
  active = false,
  title,
  onClick,
  onDoubleClick,
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
        'h-6 shrink-0 whitespace-nowrap rounded px-2.5 text-dicht transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent',
        active ? 'bg-akzent/15 font-medium text-tinte' : 'text-matt hover:text-tinte',
        className,
      )}
    >
      {children}
    </button>
  )
}
