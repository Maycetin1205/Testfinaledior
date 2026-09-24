import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

interface EntryProps {
  icon: ComponentType<{ size?: number; className?: string }>

  name: string

  right?: ReactNode

  bottom?: ReactNode
  active?: boolean
  onClick: () => void
}

export function Entry({ icon: Icon, name, right, bottom, active = false, onClick }: EntryProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'mb-1 w-full rounded border px-[10px] py-[7px] text-left text-dense transition-colors',
        active ? 'border-accent bg-accent-soft' : 'border-line bg-panel hover:border-accent',
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon size={12} className="shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
        {right}
      </div>
      {bottom !== undefined && (
        <div className="mt-0.5 pl-[1.125rem] text-dense text-muted">{bottom}</div>
      )}
    </button>
  )
}
