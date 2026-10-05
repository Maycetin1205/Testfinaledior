import { createElement, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { type Icon } from '@/editor/icons/icon'
import { Button } from '@/editor/widgets/Button'
import { Popover } from '@/editor/widgets/Popover'
import { besideOf } from './barPlacement'
import { LabelsShown } from './labelsShown'

// A button in the bar that opens a small window beside it; with a sign, the
// sign alone stands in the bar.
export function BarWindow({ label, icon, width = 340, defaultOpen = false, flush = false, beside, onOpen, children }: {
  label: string
  icon?: Icon
  width?: number
  defaultOpen?: boolean
  // The content reaches the window's edges, as strips with lines do.
  flush?: boolean
  // The block the window opens beside, so it does not cover it.
  beside?: RefObject<HTMLElement | null>
  onOpen?: () => void
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => { if (open) onOpen?.() }, [open, onOpen])
  const button = useRef<HTMLButtonElement>(null)
  // Where it opens, taken when it is opened by a click.
  const [at, setAt] = useState<{ top: number; left: number } | undefined>(undefined)
  const toggle = () => {
    if (!open) setAt(besideOf(beside?.current, button.current, width))
    setOpen(!open)
  }
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
        <Popover name={label} anchor={button} at={at} width={width} maxHeight={480} onClose={() => setOpen(false)}>
          <LabelsShown.Provider value>
            <div className={flush ? undefined : "p-[6px]"}>{children(() => setOpen(false))}</div>
          </LabelsShown.Provider>
        </Popover>
      )}
    </>
  )
}
