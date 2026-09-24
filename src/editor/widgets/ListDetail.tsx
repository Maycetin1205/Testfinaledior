import type { ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

interface ListDetailProps {
  listHead?: ReactNode
  list: ReactNode
  detail: ReactNode

  listWithoutEdge?: boolean
}

export function ListDetail({
  listHead, list, detail, listWithoutEdge = false,
}: ListDetailProps) {
  return (
    <>
      <div className="flex w-64 shrink-0 flex-col border-r border-line">
        {listHead !== undefined && (
          <div className="flex shrink-0 flex-col gap-1.5 border-b border-line p-2">
            {listHead}
          </div>
        )}
        <div className={cn('min-h-0 flex-1 overflow-y-auto', listWithoutEdge ? '' : 'p-2')}>
          {list}
        </div>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">{detail}</div>
    </>
  )
}
