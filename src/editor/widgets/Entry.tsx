import type { ComponentType, ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

export interface EntryProps {
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
        'mb-1 w-full rounded border px-2.5 py-1 text-left text-dicht transition-colors',
        active ? 'border-akzent/60 bg-akzent/15' : 'border-transparent hover:bg-control',
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon size={12} className="shrink-0 text-matt" />
        <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
        {right}
      </div>
      {bottom !== undefined && (
        <div className="mt-0.5 pl-[1.125rem] text-dicht text-matt">{bottom}</div>
      )}
    </button>
  )
}
