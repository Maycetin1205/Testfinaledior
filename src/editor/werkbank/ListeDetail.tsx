// Der eine Aufbau fuer Fenster mit Liste und Detail (Datencenter, Kettenfenster).
import type { ReactNode } from 'react'
import { cn } from '@/editor/werkbank/cn'

export interface ListeDetailProps {
  bereiche?: ReactNode

  // Kopf der Listenspalte: Anlegen-Knopf, Suche, Filter.
  listeKopf?: ReactNode
  liste: ReactNode
  detail: ReactNode

  // Fuer Listen, die ihre Zeilen selbst rahmen und darum keinen Innenabstand
  // wollen.
  listeOhneRand?: boolean
}

// Muss direktes Kind eines randlosen Dialogs sein: der stellt die Flex-Zeile und
// die Hoehe.
export function ListeDetail({
  bereiche, listeKopf, liste, detail, listeOhneRand = false,
}: ListeDetailProps) {
  return (
    <>
      {bereiche !== undefined && (
        <nav className="flex w-44 shrink-0 flex-col gap-0.5 border-r border-linie bg-panel p-2">
          {bereiche}
        </nav>
      )}
      <div className="flex w-64 shrink-0 flex-col border-r border-linie">
        {listeKopf !== undefined && (
          <div className="flex shrink-0 flex-col gap-1.5 border-b border-linie p-2">
            {listeKopf}
          </div>
        )}
        <div className={cn('min-h-0 flex-1 overflow-y-auto', listeOhneRand ? '' : 'p-2')}>
          {liste}
        </div>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">{detail}</div>
    </>
  )
}
