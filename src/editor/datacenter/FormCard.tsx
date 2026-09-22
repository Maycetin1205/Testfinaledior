import { useEffect, type ReactNode } from 'react'
import { X } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/PushButton'

interface FormCardProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function FormCard({ title, onClose, children }: FormCardProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-ui font-semibold text-tinte">{title}</h3>
        <Button onlyIcon aria-label="Abbrechen" title="Abbrechen (Esc)" onClick={onClose}>
          <X size={15} />
        </Button>
      </div>
      {children}
    </div>
  )
}
