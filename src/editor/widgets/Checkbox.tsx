import type { ReactNode } from 'react'
import { cn } from '@/editor/widgets/cn'
import { TickBox } from './TickBox'

interface CheckboxProps {
  checked: boolean
  disabled?: boolean
  onChange: () => void

  className?: string

  children: ReactNode
}

// A line with the box of a checkbox of the mask in front, as the switch of a
// window draws it (Labeled.tsx); the checkbox itself is unseen and keeps the keys.
export function Checkbox({ checked, disabled = false, onChange, className, children }: CheckboxProps) {
  return (
    <label
      className={cn(
        'flex items-center gap-[10px] text-ui',
        disabled ? 'opacity-[.45]' : 'cursor-pointer',
        className,
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <TickBox
        on={checked}
        className="peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
      />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  )
}
