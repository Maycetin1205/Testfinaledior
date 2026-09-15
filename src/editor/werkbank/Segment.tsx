// Eine Reihe von Zungen, aus denen genau eine gilt.
import type { ReactNode } from 'react'
import { cn } from '@/editor/werkbank/cn'

export interface SegmentOption {
  wert: string

  // Sichtbar, wenn kein Zeichen gesetzt ist; sonst Tooltip und Vorlesename.
  name: string
  zeichen?: ReactNode
}

export interface SegmentProps {
  bezeichnung: string
  optionen: readonly SegmentOption[]
  wert: string
  hinweis?: string
  id?: string
  onWaehle: (wert: string) => void
}

export function Segment({
  bezeichnung,
  optionen,
  wert,
  hinweis,
  id,
  onWaehle,
}: SegmentProps) {
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={bezeichnung}
      title={hinweis}
      className="flex h-steuer w-fit items-center gap-px rounded border border-linie bg-control p-px"
    >
      {optionen.map((o) => {
        const gewaehlt = o.wert === wert
        return (
          <button
            key={o.wert}
            type="button"
            role="radio"
            aria-checked={gewaehlt}
            aria-label={o.name}
            title={o.name}
            onClick={() => onWaehle(o.wert)}
            className={cn(
              'flex h-full shrink-0 items-center justify-center whitespace-nowrap rounded text-dicht transition-colors',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent',
              o.zeichen === undefined ? 'px-2' : 'px-1.5',
              gewaehlt
                ? 'bg-akzent font-medium text-grund'
                : 'text-matt hover:text-tinte',
            )}
          >
            {o.zeichen ?? o.name}
          </button>
        )
      })}
    </div>
  )
}
