// Der Zugang der Oberflaeche zu den Meldungen.
import { useSyncExternalStore } from 'react'
import { meldungen } from './meldungen'

const abonniere = (cb: () => void) => meldungen.subscribe(cb)
const standVon = () => meldungen.version

export function useMeldungen() {
  useSyncExternalStore(abonniere, standVon)
  return meldungen
}
