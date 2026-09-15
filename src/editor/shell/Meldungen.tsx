// Die Meldungskaesten am unteren Rand des Editors.
import { X } from '@/editor/zeichen/zeichen'
import { cn } from '@/editor/werkbank/cn'
import { Knopf } from '@/editor/werkbank/Knopf'
import { useMeldungen } from '../zustand/useMeldungen'

export function Meldungen() {
  const stelle = useMeldungen()
  const liste = stelle.liste
  if (liste.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-8 right-3 z-50 flex w-[22rem] max-w-[calc(100vw-1.5rem)] flex-col gap-2">
      {liste.length > 1 && (
        <div className="pointer-events-auto flex justify-end">
          <Knopf onClick={() => stelle.leere()}>Alle schließen</Knopf>
        </div>
      )}
      {liste.map((m) => (
        <div
          key={m.id}
          role="alert"
          className={cn(
            'pointer-events-auto flex items-start gap-1 rounded border border-linie border-l-2',
            'bg-panel p-2 pl-3 shadow-overlay',
            m.art === 'fehler' ? 'border-l-fehler' : 'border-l-akzent',
          )}
        >
          <p className="min-w-0 flex-1 whitespace-pre-line text-ui leading-relaxed text-tinte">
            {m.text}
          </p>
          <Knopf
            nurZeichen
            aria-label="Meldung schließen"
            title="Schließen"
            onClick={() => stelle.schliesse(m.id)}
          >
            <X size={13} />
          </Knopf>
        </div>
      ))}
    </div>
  )
}
