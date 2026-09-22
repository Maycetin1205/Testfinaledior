import { reportError } from '../softengine/report'

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e) => {
    const base: unknown = e.reason
    reportError(
      'Unerwarteter Fehler in der Maske: '
      + (base instanceof Error ? base.message : String(base)),
    )
  })
}
