// Eine Beschriftung mit ihrem Bedienelement, einspaltig: Beschriftung oben.
import { useId, type ReactNode } from 'react'
import { cn } from '@/editor/werkbank/cn'

export interface ZeileKind {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
}

export interface ZeileProps {
  // Steht UEBER dem Bedienelement. Ohne Beschriftung nimmt das Element die Zeile
  // allein.
  label?: ReactNode

  // Erklaerung. Sie haengt als Tooltip an der Beschriftung, statt eine zweite
  // Textzeile zu kosten.
  hinweis?: string
  fehler?: ReactNode

  // Nimmt die GANZE Reihe, auch wo zwei Zeilen nebeneinander stehen: fuer
  // Bedienelemente, die von Natur aus breit sind.
  breit?: boolean
  className?: string
  children: (kind: ZeileKind) => ReactNode
}

// Uebereinander, weil links im schmalen Inspector nur ein Dutzend Zeichen fuer
// die Beschriftung blieben und die Zeilen unterschiedlich hoch wuerden.
export function Zeile({ label, hinweis, fehler, breit = false, className, children }: ZeileProps) {
  const id = useId()
  const fehlerId = fehler ? `${id}-fehler` : undefined
  const kind: ZeileKind = {
    id,
    'aria-describedby': fehlerId,
    'aria-invalid': fehler ? true : undefined,
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', breit && 'col-span-full', className)}>
      {label !== undefined && (
        <label
          htmlFor={id}
          title={hinweis}
          className={cn(
            'text-ui leading-tight text-matt',
            hinweis !== undefined && hinweis !== '' && 'cursor-help',
          )}
        >
          {label}
        </label>
      )}
      {/* SPALTE, nicht Reihe: eine Reihe mit items-center laesst ihre Kinder
          auf Inhaltsbreite schrumpfen — die Farbkacheln und das Bild-Element
          waeren zusammengefallen, und der Waehler-Knopf haette wieder nur so
          viel Platz genommen, wie sein laengster Eintrag braucht. Eine Spalte
          streckt sie auf die volle Breite; wer schmal bleiben will, sagt es
          selbst (Zahl w-16, Segment w-fit). */}
      <div className="flex min-w-0 flex-col">{children(kind)}</div>
      {fehler && <p id={fehlerId} className="break-words text-dicht text-fehler">{fehler}</p>}
    </div>
  )
}
