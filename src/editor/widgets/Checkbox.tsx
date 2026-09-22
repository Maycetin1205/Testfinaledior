import type { ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'

export interface CheckboxProps {
  checked: boolean
  disabled?: boolean
  onChange: () => void

  className?: string

  children: ReactNode
}

export function Checkbox({ checked, disabled = false, onChange, className, children }: CheckboxProps) {
  return (
    <label
      className={cn(
        'flex items-start gap-2 text-ui',
        disabled ? 'opacity-50' : 'cursor-pointer',
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-[14px] w-[14px] shrink-0 accent-akzent"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  )
}
