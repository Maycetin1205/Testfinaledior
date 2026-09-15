// Die kleine Plakette am Ende einer Zeile: die Kennung neben dem Klarnamen.
import type { ReactNode } from 'react'
import { cn } from '@/editor/werkbank/cn'

export interface MarkeProps {
  children: ReactNode

  // Technische Werte stehen in der Schreibmaschinenschrift: dort zaehlt jede
  // Stelle. Der Name einer Art ist kein technischer Wert.
  technisch?: boolean
  hinweis?: string
  className?: string
}

// Der Klarname fuehrt, die Kennung steht daneben und draengelt nicht.
export function Marke({ children, technisch = true, hinweis, className }: MarkeProps) {
  return (
    <span
      title={hinweis}
      className={cn(
        'min-w-0 shrink-0 truncate rounded bg-control px-1.5 text-dicht text-matt',
        technisch && 'font-mono',
        className,
      )}
    >
      {children}
    </span>
  )
}
