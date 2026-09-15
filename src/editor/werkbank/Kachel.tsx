// Ein Ja/Nein als anklickbare Kachel statt als Zeile mit Umschalter.
import { Check } from '@/editor/zeichen/zeichen'
import { cn } from '@/editor/werkbank/cn'

export interface KachelProps {
  beschriftung: string
  an: boolean
  hinweis?: string
  id?: string
  onSchalte: (an: boolean) => void
}

// Ein Baustein hat mehrere davon; nebeneinander sieht man auf einen Blick, was
// er kann und was davon an ist. Das Haekchen bleibt im Aus-Zustand als
// unsichtbarer Platzhalter stehen, sonst huepft die Kachel in der Breite.
export function Kachel({ beschriftung, an, hinweis, id, onSchalte }: KachelProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={an}
      title={hinweis}
      onClick={() => onSchalte(!an)}
      className={cn(
        'flex h-steuer min-w-0 max-w-full shrink-0 items-center gap-1.5 rounded border px-2',
        'text-ui transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-akzent',
        an
          ? 'border-akzent bg-akzent/15 font-medium text-tinte'
          : 'border-linie text-matt hover:border-matt hover:text-tinte',
      )}
    >
      <Check size={12} aria-hidden className={cn('shrink-0', !an && 'invisible')} />
      <span className="min-w-0 truncate">{beschriftung}</span>
    </button>
  )
}
