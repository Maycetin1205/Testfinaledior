import { useRef, useState } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { cn } from '@/editor/widgets/cn'
import { Field, INPUT_EDGE } from '@/editor/widgets/Field'
import { List } from '@/editor/widgets/List'
import { Popover } from '@/editor/widgets/Popover'
import { ORIGIN_KINDS, type ValueOrigin } from '../../core/data/valueOrigin'
import { decodeOrigin, encodeOrigin, originGroups, originText, type OriginOffer } from './originOffer'

// Chooses where a value comes from: the origin in words, and below it the
// columns, fields and form fields the place offers, and a fixed value.
export function OriginPicker({ name, origin, offer, className, onChoose }: {
  name: string
  origin: ValueOrigin | null
  offer: OriginOffer
  className?: string
  onChoose: (origin: ValueOrigin) => void
}) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const text = originText(origin, offer)

  const take = (next: ValueOrigin) => {
    onChoose(next)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={text === '' ? name : `${name}: ${text}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(INPUT_EDGE, 'flex h-control min-w-0 items-center gap-2 px-2 text-left', className)}
      >
        <span className="min-w-0 flex-1 truncate font-medium">{text}</span>
        <ChevronDown size={13} aria-hidden className="shrink-0 text-muted" />
      </button>
      {open && (
        <Popover name={name} anchor={button} onClose={() => setOpen(false)}>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            <List
              searchable
              groups={originGroups(offer)}
              value={origin === null ? '' : encodeOrigin(origin)}
              onChoose={(v) => take(decodeOrigin(v))}
            />
            {offer.fixed === true && (
              <div className="flex shrink-0 flex-col gap-1 px-1.5 pb-1">
                <span className="text-label font-semibold uppercase tracking-label text-muted">
                  {ORIGIN_KINDS.fixed}
                </span>
                <Field
                  aria-label={ORIGIN_KINDS.fixed}
                  defaultValue={origin?.kind === 'fixed' ? origin.value : ''}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    const value = e.currentTarget.value.trim()
                    if (value !== '') take({ kind: 'fixed', value })
                  }}
                />
              </div>
            )}
          </div>
        </Popover>
      )}
    </>
  )
}
