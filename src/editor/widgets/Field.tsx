import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/editor/widgets/cn'

export const INPUT_EDGE =
  'w-full min-w-0 rounded border border-linie bg-control text-ui text-tinte transition-colors'
  + ' placeholder:text-matt'
  + ' focus-visible:border-akzent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent'
  + ' disabled:cursor-not-allowed disabled:opacity-40'
  + ' aria-[invalid=true]:border-fehler aria-[invalid=true]:focus-visible:ring-fehler'

export type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ type = 'text', className, ...rest }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(INPUT_EDGE, 'h-steuer px-2', className)}
      {...rest}
    />
  ),
)
Field.displayName = 'Feld'
