import { cn } from '@/editor/widgets/cn'

export function Separator({
  vertical = false,
  className,
}: {
  vertical?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn('shrink-0 bg-line', vertical ? 'h-4 w-px' : 'h-px w-full', className)}
    />
  )
}
