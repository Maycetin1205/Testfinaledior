// Das Eingabefeld der Werkbank und die Kante, die jedes Eingabeding traegt.
import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/editor/werkbank/cn'

// Die eine Kante, die jedes Eingabeding der Werkbank traegt.
export const EINGABE_KANTE =
  'w-full min-w-0 rounded border border-linie bg-control text-ui text-tinte transition-colors'
  + ' placeholder:text-matt'
  + ' focus-visible:border-akzent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent'
  + ' disabled:cursor-not-allowed disabled:opacity-40'
  + ' aria-[invalid=true]:border-fehler aria-[invalid=true]:focus-visible:ring-fehler'

export type FeldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>

export const Feld = forwardRef<HTMLInputElement, FeldProps>(
  ({ type = 'text', className, ...rest }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(EINGABE_KANTE, 'h-steuer px-2', className)}
      {...rest}
    />
  ),
)
Feld.displayName = 'Feld'

export type FeldMehrzeiligProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export const FeldMehrzeilig = forwardRef<HTMLTextAreaElement, FeldMehrzeiligProps>(
  ({ rows = 3, className, ...rest }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(EINGABE_KANTE, 'px-2 py-1.5 leading-relaxed', className)}
      {...rest}
    />
  ),
)
FeldMehrzeilig.displayName = 'FeldMehrzeilig'
