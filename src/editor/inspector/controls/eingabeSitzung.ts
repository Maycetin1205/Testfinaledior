// Klammert das Tippen in einem Feld zu EINEM Undo-Schritt.
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { gestenKlammer, type GestenKlammer } from '../../zustand/history'

export interface Eingabesitzung {
  beginnen: () => void

  beenden: () => void
}

export function useEingabeSitzung(
  onBeginBearbeitung?: () => void,
  onEndeBearbeitung?: () => void,
): Eingabesitzung {
  const klammer = useRef<GestenKlammer | null>(null)

  const rueckrufe = useRef({ onBeginBearbeitung, onEndeBearbeitung })
  useEffect(() => {
    rueckrufe.current = { onBeginBearbeitung, onEndeBearbeitung }
  })

  const beenden = useCallback(() => {
    klammer.current?.schliesse()
    klammer.current = null
  }, [])

  const beginnen = useCallback(() => {
    if (klammer.current) return
    const neue = gestenKlammer(
      () => rueckrufe.current.onBeginBearbeitung?.(),
      () => rueckrufe.current.onEndeBearbeitung?.(),
    )
    klammer.current = neue
    neue.oeffne()
  }, [])

  useEffect(() => beenden, [beenden])

  // Ein STABILES Objekt: als Effekt-Abhaengigkeit gefuehrt schloss ein neues je
  // Render die Klammer bei jedem Tastendruck.
  return useMemo(() => ({ beginnen, beenden }), [beginnen, beenden])
}
