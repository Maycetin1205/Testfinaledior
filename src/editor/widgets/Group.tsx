import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'

export interface GroupProps {
  title: ReactNode

  actions?: ReactNode

  open?: boolean
  standardOpen?: boolean
  onToggle?: (open: boolean) => void
  className?: string
  children: ReactNode
}

export function Group({
  title,
  actions,
  open,
  standardOpen = true,
  onToggle,
  className,
  children,
}: GroupProps) {
  const id = useId()
  const [own, setOwn] = useState(standardOpen)
  const on = open ?? own

  const toggle = () => {
    if (onToggle) onToggle(!on)
    else setOwn(!on)
  }

  return (
    <section className={cn('flex min-w-0 flex-col', className)}>

      <div className="flex h-steuer items-center gap-1 border-b border-linie">
        <button
          type="button"
          aria-expanded={on}
          aria-controls={id}
          onClick={toggle}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1.5 rounded text-left',
            'text-ui font-semibold text-tinte',
            'transition-colors hover:text-akzent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent',
          )}
        >
          <span className="min-w-0 flex-1 truncate">{title}</span>
          <ChevronDown
            size={12}
            aria-hidden
            className={cn('shrink-0 text-matt transition-transform', !on && '-rotate-90')}
          />
        </button>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {on && (
        <div id={id} className="flex min-w-0 flex-col gap-2 pt-2">
          {children}
        </div>
      )}
    </section>
  )
}
