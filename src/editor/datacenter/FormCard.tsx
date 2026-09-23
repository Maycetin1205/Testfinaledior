import type { ReactNode } from 'react'
import { X } from '@/editor/icons/icon'
import { useCloseOnEscape } from '@/editor/widgets/closeOnEscape'
import { Button } from '@/editor/widgets/PushButton'

interface FormCardProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function FormCard({ title, onClose, children }: FormCardProps) {
  useCloseOnEscape(onClose)

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-ui font-semibold text-ink">{title}</h3>
        <Button onlyIcon aria-label="Abbrechen" title="Abbrechen (Esc)" onClick={onClose}>
          <X size={15} />
        </Button>
      </div>
      {children}
    </div>
  )
}
