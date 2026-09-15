// Ein Zahlenfeld mit Einheit.
import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/editor/werkbank/cn'
import { EINGABE_KANTE } from './Feld'

export interface ZahlProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  // Steht rechts IM Feld (px, %, …) und wird nie mitgetippt.
  einheit?: string
}

export const Zahl = forwardRef<HTMLInputElement, ZahlProps>(
  ({ einheit, className, ...rest }, ref) => (
    <span className="relative inline-flex shrink-0 items-center">
      <input
        ref={ref}
      // Ein Textfeld mit Zahlen-Tastatur, KEIN type="number": das schluckt je
      // Browser das Komma. Was eine Zahl ist, entscheidet der Aufrufer.
        type="text"
        inputMode="decimal"
        className={cn(
          EINGABE_KANTE,
          'h-steuer px-2 tabular-nums',
          einheit !== undefined && einheit !== '' && 'pr-6',
          className,
        )}
        {...rest}
      />
      {einheit !== undefined && einheit !== '' && (
        <span aria-hidden className="pointer-events-none absolute right-2 text-dicht text-matt">
          {einheit}
        </span>
      )}
    </span>
  ),
)
Zahl.displayName = 'Zahl'
