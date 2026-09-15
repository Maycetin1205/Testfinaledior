// Die Karte, in der ein Formular des Datencenters steht.
import { useEffect, type ReactNode } from 'react'
import { X } from '@/editor/zeichen/zeichen'
import { Knopf } from '@/editor/werkbank/Knopf'

interface FormularKarteProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function FormularKarte({ title, onClose, children }: FormularKarteProps) {
  useEffect(() => {
    // In der Fangphase und mit gestopptem Weiterlauf: Escape schliesst das
    // Formular, nicht das Fenster dahinter.
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
        <Knopf nurZeichen aria-label="Abbrechen" title="Abbrechen (Esc)" onClick={onClose}>
          <X size={15} />
        </Knopf>
      </div>
      {children}
    </div>
  )
}
