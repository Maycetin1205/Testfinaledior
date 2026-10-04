import { useRef, useState } from 'react'
import { ChevronDown } from '@/editor/icons/icon'
import { ColorSwatch } from '@/editor/widgets/ColorSwatch'
import { Popover } from '@/editor/widgets/Popover'
import { Segment } from '@/editor/widgets/Segment'
import type { Property } from '../../core/block/property'
import type { DeclaredProperty } from '../../core/block/propertyPlace'
import type { BlockNode } from '../../core/block/tree'
import { useEditor } from '../state/useEditor'

const FONT_WIDTH = 264

// Color and size of the type as one button in the bar: it shows both, its
// small window offers both. While the role presets a value, the button shows
// the role's, and choosing that one leaves it to the role again.
export function FontChoice({ block, fonts }: { block: BlockNode; fonts: readonly DeclaredProperty[] }) {
  const ed = useEditor()
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const name = fonts.map((f) => f.property.label).join(' und ')

  const presetOf = (property: Property<unknown>): string => {
    const preset = property.preset
    return preset?.values?.[String(block.values[preset.by] ?? '')] ?? ''
  }
  const shownOf = (d: DeclaredProperty): string => {
    const held = String(block.values[d.key] ?? '')
    return held !== '' ? held : presetOf(d.property)
  }
  const choose = (d: DeclaredProperty, value: string) => {
    ed.updateProperty(block.id, d.key, value === presetOf(d.property) ? d.property.default : value)
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={name}
        title={name}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-control shrink-0 items-center gap-[6px] rounded border border-line bg-panel px-[6px] transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        {fonts.map((d) => {
          const option = d.property.type.options?.find((o) => o.value === shownOf(d))
          return option?.color !== undefined
            ? <span key={d.key} className="h-[14px] w-[14px] rounded border border-line" style={{ backgroundColor: option.color }} />
            : <span key={d.key} className="tabular-nums">{option?.name ?? ''}</span>
        })}
        <ChevronDown size={13} aria-hidden className="text-muted" />
      </button>
      {open && (
        <Popover name={name} anchor={button} width={FONT_WIDTH} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-[8px] p-[6px]">
            {fonts.map((d) => {
              const options = d.property.type.options ?? []
              const shown = shownOf(d)
              return (
                <div key={d.key} className="flex flex-col gap-[4px]">
                  <span className="text-dense font-semibold text-muted">
                    {d.property.label}
                  </span>
                  {options.every((o) => o.color !== undefined)
                    ? (
                        <span className="flex gap-[6px]">
                          {options.map((o) => (
                            <ColorSwatch
                              key={o.value}
                              color={o.color}
                              name={o.name}
                              chosen={o.value === shown}
                              onChoose={() => choose(d, o.value)}
                            />
                          ))}
                        </span>
                      )
                    : <Segment name={d.property.label} options={options} value={shown} onChoose={(v) => choose(d, v)} />}
                </div>
              )
            })}
          </div>
        </Popover>
      )}
    </>
  )
}
