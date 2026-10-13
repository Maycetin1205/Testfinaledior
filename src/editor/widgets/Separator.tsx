import { cn } from '@/editor/widgets/cn'

// Upright, it stands between groups of controls, about two thirds of their height.
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
      className={cn('shrink-0 bg-line', vertical ? 'h-[20px] w-px' : 'h-px w-full', className)}
    />
  )
}
