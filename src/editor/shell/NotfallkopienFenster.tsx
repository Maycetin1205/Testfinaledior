// Die Notfallkopien im Browser-Speicher zur Wahl: erst der Klick holt eine zurueck.
import { useState } from 'react'
import { Dialog } from '@/editor/werkbank/Dialog'
import { Knopf } from '@/editor/werkbank/Knopf'
import { Liste } from '@/editor/werkbank/Liste'
import { inhaltText, kopienZurWahl, stelleKopieWiederHer, zeitText } from '../zustand/kopienWahl'
import { useEditor } from '../zustand/useEditor'

export function NotfallkopienFenster({ onClose }: { onClose: () => void }) {
  const ed = useEditor()

  // EINMAL beim Aufschlagen gelesen: waehrend das Fenster steht, legt niemand
  // eine Kopie an.
  const [kopien] = useState(kopienZurWahl)
  const [gewaehlt, setGewaehlt] = useState('')

  return (
    <Dialog
      titel="Notfallkopie wiederherstellen"
      nebenTitel={kopien.length === 0 ? undefined : `${kopien.length} im Browser-Speicher`}
      schmal
      fuss={(
        <>
          <Knopf onClick={onClose}>Abbrechen</Knopf>
          <Knopf
            art="primaer"
            disabled={gewaehlt === ''}
            onClick={() => {
              stelleKopieWiederHer(ed, gewaehlt)
              onClose()
            }}
          >
            Wiederherstellen
          </Knopf>
        </>
      )}
      onClose={onClose}
    >
      <div className="flex flex-col gap-2">
        <p className="text-ui text-matt">
          Die gewählte Kopie ersetzt Bausteine, Datenquellen und Relationen.
          Strg+Z nimmt das in einem Schritt zurück.
        </p>

        {/* Jede beschaedigte Maske legt ihre eigene Kopie ab: die Liste muss
            scrollen, sonst waechst das Fenster ueber den Bildrand hinaus.
            Eine Kopie entsteht, WEIL ein Stand beschaedigt war: unlesbare
            stehen mit dem, was sich sagen laesst, in der Liste. */}
        <div className="max-h-[50vh] overflow-y-auto">
          <Liste
            gruppen={[{
              key: 'kopien',
              eintraege: kopien.map((kopie) => ({
                wert: kopie.schluessel,
                name: inhaltText(kopie),
                kennung: zeitText(kopie),
                deaktiviert: !kopie.lesbar,
              })),
            }]}
            wert={gewaehlt}
            leerHinweis="Es liegt keine Notfallkopie im Browser-Speicher."
            onWaehle={setGewaehlt}
          />
        </div>
      </div>
    </Dialog>
  )
}
