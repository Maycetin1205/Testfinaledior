// Eine Faktorzeile im Berechnungsfenster: was sie ist, worauf sie zeigt, in welcher Einheit.
import { Feld } from '@/editor/werkbank/Feld'
import { Knopf } from '@/editor/werkbank/Knopf'
import { Wahl, type WahlOption } from '@/editor/werkbank/Wahl'
import { Zahl } from '@/editor/werkbank/Zahl'
import { X } from '@/editor/zeichen/zeichen'
import { bindungMitQuelle, zerlegeBindung } from '../../kern/maske/bindung'
import { neuerFaktor, zahlStreng, zahlText, STELLEN_MAX, type Faktor } from '../../kern/daten/berechnung'
import { EINHEITEN } from '../../kern/daten/einheiten'
import type { QuelleInReichweite } from '../../kern/daten/weitereQuellen'

const ARTEN: WahlOption[] = [
  { wert: 'spalte', name: 'Spalte der Zeile' },
  { wert: 'datenfeld', name: 'Feld des Datensatzes' },
  { wert: 'zahl', name: 'Feste Zahl' },
]

const EINHEIT_OPTIONEN: WahlOption[] = EINHEITEN.map((e) => ({ wert: e.code, name: e.name }))

function spaltenOptionen(
  spalten: readonly { kennung: string; titel: string }[],
): WahlOption[] {
  return spalten
    .filter((s) => s.kennung !== '')
    .map((s) => ({ wert: s.kennung, name: s.titel === '' ? s.kennung : s.titel }))
}

// Der Techniker sieht den Feldcode als Kennung, beschriftet ist das Feld mit
// seinem Klarnamen.
function feldOptionen(quelle: QuelleInReichweite | undefined): WahlOption[] {
  return (quelle?.source.fields ?? []).map((f) => ({
    wert: f.code,
    name: f.label === '' ? f.code : f.label,
    kennung: f.code,
  }))
}

function mitArt(faktor: Faktor, art: string): Faktor {
  if (art === faktor.art) return faktor
  const { kennung, einheit } = faktor
  if (art === 'datenfeld') return { art: 'datenfeld', kennung, einheit, name: '', feld: '' }
  if (art === 'zahl') return { art: 'zahl', kennung, einheit, name: '', zahl: 1 }
  return { ...neuerFaktor(kennung), einheit }
}

export interface FaktorZeileProps {
  faktor: Faktor
  spalten: readonly { kennung: string; titel: string }[]
  quellen: readonly QuelleInReichweite[]

  // Die Leitgroesse steht fest links und laesst sich weder umwidmen noch
  // wegnehmen: ohne sie gaebe es keine Gleichung.
  leit?: boolean
  onFaktor: (faktor: Faktor) => void
  onWeg?: () => void
}

export function FaktorZeile({
  faktor,
  spalten,
  quellen,
  leit = false,
  onFaktor,
  onWeg,
}: FaktorZeileProps) {
  const ziel = faktor.art === 'datenfeld' ? zerlegeBindung(faktor.feld) : { quelleId: '', code: '' }
  const quelle = quellen.find((q) => q.source.id === ziel.quelleId)

  return (
    <div className="flex flex-col gap-1.5 rounded border border-linie p-2">
      <div className="flex items-center gap-1.5">
        {!leit && (
          <Wahl
            className="w-44"
            optionen={ARTEN}
            wert={faktor.art}
            onWaehle={(art) => onFaktor(mitArt(faktor, art))}
          />
        )}

        {faktor.art === 'spalte' && (
          <Wahl
            optionen={spaltenOptionen(spalten)}
            wert={faktor.spalte}
            leerText="Spalte wählen"
            onWaehle={(spalte) => onFaktor({ ...faktor, spalte })}
          />
        )}

        {faktor.art !== 'spalte' && (
          <Feld
            placeholder="Name, z. B. Behandlungsmenge"
            defaultValue={faktor.name}
            onBlur={(e) => onFaktor({ ...faktor, name: e.currentTarget.value.trim() })}
          />
        )}

        <Wahl
          className="w-32"
          optionen={EINHEIT_OPTIONEN}
          wert={faktor.einheit}
          onWaehle={(einheit) => onFaktor({ ...faktor, einheit })}
        />

        {onWeg !== undefined && (
          <Knopf nurZeichen aria-label="Faktor entfernen" onClick={onWeg}>
            <X className="size-3.5" />
          </Knopf>
        )}
      </div>

      {faktor.art === 'datenfeld' && (
        <div className="flex items-center gap-1.5">
          <Wahl
            optionen={quellen.map((q) => ({ wert: q.source.id, name: q.source.name }))}
            wert={ziel.quelleId}
            leerText="Datenquelle wählen"
            onWaehle={(id) => onFaktor({ ...faktor, feld: bindungMitQuelle(id, ziel.code) })}
          />
          <Wahl
            optionen={feldOptionen(quelle)}
            wert={ziel.code}
            leerText="Feld wählen"
            onWaehle={(code) => onFaktor({ ...faktor, feld: bindungMitQuelle(ziel.quelleId, code) })}
          />
        </div>
      )}

      {faktor.art === 'zahl' && (
        <Zahl
          key={zahlText(faktor.zahl, STELLEN_MAX)}
          className="w-32"
          title="Feste Zahl, deutsch geschrieben"
          defaultValue={zahlText(faktor.zahl, STELLEN_MAX)}
          onBlur={(e) => {
            const zahl = zahlStreng(e.currentTarget.value)
            if (zahl === null) e.currentTarget.value = zahlText(faktor.zahl, STELLEN_MAX)
            else if (zahl !== faktor.zahl) onFaktor({ ...faktor, zahl })
          }}
        />
      )}
    </div>
  )
}
