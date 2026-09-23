import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/editor/widgets/cn'

export const INPUT_EDGE =
  'w-full min-w-0 rounded border border-line bg-control text-ui text-ink transition-colors'
  + ' placeholder:text-muted'
  + ' focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent'
  + ' disabled:cursor-not-allowed disabled:opacity-40'
  + ' aria-[invalid=true]:border-error aria-[invalid=true]:focus-visible:ring-error'

export type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ type = 'text', className, ...rest }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(INPUT_EDGE, 'h-control px-2', className)}
      {...rest}
    />
  ),
)
Field.displayName = 'Field'
