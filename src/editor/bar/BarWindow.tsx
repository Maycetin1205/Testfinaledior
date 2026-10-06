import { createElement, useEffect, useRef, useState, type ReactNode } from 'react'
import { type Icon } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { Popover } from '@/editor/widgets/Popover'
import { LabelsShown } from './labelsShown'

// A button in the bar that opens a small window below it; with a sign, the
// sign alone stands in the bar.
export function BarWindow({ label, icon, width = 340, defaultOpen = false, flush = false, onOpen, children }: {
  label: string
  icon?: Icon
  width?: number
  defaultOpen?: boolean
  // The content reaches the window's edges, as strips with lines do.
  flush?: boolean
  onOpen?: () => void
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => { if (open) onOpen?.() }, [open, onOpen])
  const button = useRef<HTMLButtonElement>(null)
  const toggle = () => setOpen(!open)
  const pressed = open ? 'border-accent bg-accent-soft text-ink' : undefined
  return (
    <>
      {icon
        ? (
            <Button
              ref={button}
              onlyIcon
              aria-label={label}
              title={label}
              aria-haspopup="dialog"
              aria-expanded={open}
              className={pressed}
              onClick={toggle}
            >
              {createElement(icon, { size: 15 })}
            </Button>
          )
        : (
            <Button
              ref={button}
              aria-haspopup="dialog"
              aria-expanded={open}
              className={pressed}
              onClick={toggle}
            >
              {label}
            </Button>
          )}
      {open && (
        <Popover name={label} anchor={button} width={width} maxHeight={480} onClose={() => setOpen(false)}>
          <LabelsShown.Provider value>
            <div className={flush ? undefined : "p-[6px]"}>{children(() => setOpen(false))}</div>
          </LabelsShown.Provider>
        </Popover>
      )}
    </>
  )
}
