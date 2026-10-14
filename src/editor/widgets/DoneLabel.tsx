import type { ReactNode } from 'react'
import { Check } from '@/editor/icons/icon'
import { cn } from './cn'

// The label of a button that wears a check for a moment once its deed is
// done. It keeps the room of the longer of both, so nothing beside it moves.
export function DoneLabel({ done, icon, label, doneLabel }: {
  done: boolean
  icon: ReactNode
  label: string
  doneLabel: string
}) {
  return (
    <span className="grid">
      <span className={cn('col-start-1 row-start-1 inline-flex items-center gap-[6px]', done && 'invisible')}>{icon} {label}</span>
      <span className={cn('col-start-1 row-start-1 inline-flex items-center gap-[6px]', !done && 'invisible')}>
        <Check size={14} /> {doneLabel}
      </span>
    </span>
  )
}
