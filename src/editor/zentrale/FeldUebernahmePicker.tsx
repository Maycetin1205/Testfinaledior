// Die Liste, aus der ein Feld als Parameter-Wert uebernommen wird.
import { useMemo, type RefObject } from 'react'
import { Liste, type ListeGruppe } from '@/ui/werkbank/Liste'
import { Popover } from '@/ui/werkbank/Popover'
import type { Datenquelle } from '../../core/data/dataSources'
import { quellenWorte } from './beschriftungen'
import {
  uebernahmeFelder,
  uebernahmeTabellen,
  type FeldUebernahmeZiel,
} from './feldUebernahme'

interface FeldUebernahmePickerProps {
  quellen: readonly Datenquelle[]
  ziel: FeldUebernahmeZiel

  // Feldcode der bereits uebernommenen POS/LEN, nur zum Anhaken.
  current: string

  // Der Griff, aus dem die Liste aufgegangen ist: das Popover misst sich daran
  // und laesst den Druck darauf durch.
  anker: RefObject<HTMLElement | null>
  onPick: (sourceId: string, code: string) => void
  onClose: () => void
}

const TRENNER = '::'

// Eine leere Liste darf nie ratenlassen, woran es liegt: sie zaehlt auf, was sie
// angesehen hat.
function leerHinweisFuer(
  quellen: readonly Datenquelle[],
  ziel: FeldUebernahmeZiel,
): string {
  if (quellen.length === 0) return 'Es ist keine Datenquelle angelegt.'
  const gesehen = quellen
    .map((q) => `${q.name} (${quellenWorte(q.kind).name}, ${q.fields.length} Felder)`)
    .join(' · ')
  return ziel === 'idb'
    ? `Keine Quelle mit Tabellen-Kennung. Angesehen: ${gesehen}`
    : `Kein Feld mit Position + Länge. Angesehen: ${gesehen}`
}

export function FeldUebernahmePicker({
  quellen,
  ziel,
  current,
  anker,
  onPick,
  onClose,
}: FeldUebernahmePickerProps) {
  const gruppen: ListeGruppe[] = useMemo(() => {
    if (ziel === 'idb') {
      return [{
        key: 'quellen',
        name: 'Datenquelle',
        eintraege: uebernahmeTabellen(quellen)
          .map((quelle) => ({ wert: quelle.sourceId, name: quelle.sourceName })),
      }]
    }
    const nachQuelle = new Map<string, ListeGruppe>()
    for (const feld of uebernahmeFelder(quellen)) {
      let gruppe = nachQuelle.get(feld.sourceId)
      if (!gruppe) {
        gruppe = { key: feld.sourceId, name: feld.sourceName, eintraege: [] }
        nachQuelle.set(feld.sourceId, gruppe)
      }
      ;(gruppe.eintraege as { wert: string; name: string; kennung: string }[]).push({
        wert: `${feld.sourceId}${TRENNER}${feld.code}`,
        name: feld.label,
        kennung: feld.posLen,
      })
    }
    return [...nachQuelle.values()]
  }, [ziel, quellen])

  // Uebernommen wird als POS/LEN-Wert; welche Quelle das Feld hergab, steht
  // nirgends. Angehakt wird darum der erste Treffer mit diesem Feldcode.
  const gewaehlt = ziel === 'feld' && current !== ''
    ? gruppen.flatMap((g) => g.eintraege).find((e) => e.kennung === current)?.wert ?? ''
    : ''

  return (
    <Popover
      bezeichnung={ziel === 'feld' ? 'Feld übernehmen' : 'Tabelle übernehmen'}
      anker={anker}
      escapeAbfangen
      onClose={onClose}
    >
      <Liste
        suchbar
        gruppen={gruppen}
        wert={gewaehlt}
        leerHinweis={leerHinweisFuer(quellen, ziel)}
        onWaehle={(wert) => {
          const at = wert.indexOf(TRENNER)
          if (at < 0) onPick(wert, '')
          else onPick(wert.slice(0, at), wert.slice(at + TRENNER.length))
        }}
      />
    </Popover>
  )
}
