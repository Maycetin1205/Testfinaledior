// Ein Kaestchen mit Beschriftung; der Klick auf die Beschriftung kreuzt an.
import type { ReactNode } from 'react'
import { cn } from '@/editor/werkbank/cn'

export interface AnkreuzProps {
  checked: boolean
  disabled?: boolean
  onChange: () => void

  // Der Rahmen der Zeile, in der das Ankreuzfeld steht; den kennt die Liste.
  className?: string

  children: ReactNode
}

// Das Kaestchen sitzt oben statt mittig: bei mehrzeiliger Beschriftung verliert
// es sonst den Bezug zur ersten Zeile.
export function Ankreuz({ checked, disabled = false, onChange, className, children }: AnkreuzProps) {
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
