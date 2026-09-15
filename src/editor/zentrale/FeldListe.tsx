// Die Feldliste einer Datenquelle im Formular: Klarname, Position, Laenge,
// Spaltenbreite in Zeichen.
import { Plus, X } from '@/editor/zeichen/zeichen'
import { Feld } from '@/editor/werkbank/Feld'
import { Knopf } from '@/editor/werkbank/Knopf'
import { ZEICHEN_MAX } from '../../kern/daten/datenquellen'
import { LEERE_ZEILE, type FeldZeile } from './feldZeile'

const SPALTEN = 'grid grid-cols-[minmax(0,1fr)_72px_72px_64px_auto] items-center gap-x-2'
const SPALTEN_NAMEN = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_64px_auto] items-center gap-x-2'

interface FeldListeProps {
  zeilen: FeldZeile[]
  setZeilen: (naechste: FeldZeile[]) => void
  zeilenFehler: string[]
  doppeltFehler: string
  zeigeFehler: boolean

  // Quellen mit Klarnamen-Feldern sprechen ihre Spalten mit Namen an: dann steht
  // hier ein Namensfeld statt der zwei Zahlenfelder. Wie die Spalte heisst, sagt
  // die Art.
  spaltenNamen?: boolean
  spaltenLabel?: string
  spaltenBeispiel?: string
}

export function FeldListe({
  zeilen, setZeilen, zeilenFehler, doppeltFehler, zeigeFehler, spaltenNamen = false,
  spaltenLabel = 'Spalte im DataSet', spaltenBeispiel = 'z. B. Chargennummer',
}: FeldListeProps) {
  const raster = spaltenNamen ? SPALTEN_NAMEN : SPALTEN
  const setZeile = (at: number, patch: Partial<FeldZeile>) =>
    setZeilen(zeilen.map((row, i) => (i === at ? { ...row, ...patch } : row)))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-dicht font-semibold uppercase tracking-wide text-matt">Felder</span>
        <Knopf onClick={() => setZeilen([...zeilen, { ...LEERE_ZEILE }])}>
          <Plus size={13} /> Feld
        </Knopf>
      </div>

      <div className={`${raster} text-dicht text-matt`}>
        <span>Klarname</span>
        {spaltenNamen
          ? <span>{spaltenLabel}</span>
          : <><span>Position</span><span>Länge</span></>}
        <span title="Wie breit eine Spalte auf dieses Feld beim Anlegen wird. Leer: wie bisher.">Zeichen</span>
        <span />
      </div>
      {zeilen.map((z, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className={raster}>
            <Feld
              aria-label={`Feld ${i + 1}: Klarname`}
              value={z.label}
              placeholder="z. B. Vorname"
              onChange={(e) => setZeile(i, { label: e.target.value })}
            />
            {spaltenNamen ? (
              <Feld
                aria-label={`Feld ${i + 1}: ${spaltenLabel}`}
                value={z.rawCode}
                placeholder={spaltenBeispiel}
                onChange={(e) => setZeile(i, { rawCode: e.target.value })}
              />
            ) : (
              <>
                <Feld
                  aria-label={`Feld ${i + 1}: Position`}
                  value={z.pos}
                  placeholder={z.rawCode !== '' ? '—' : '193'}
                  onChange={(e) => setZeile(i, { pos: e.target.value })}
                />
                <Feld
                  aria-label={`Feld ${i + 1}: Länge`}
                  value={z.len}
                  placeholder={z.rawCode !== '' ? '—' : '30'}
                  onChange={(e) => setZeile(i, { len: e.target.value })}
                />
              </>
            )}
            <Feld
              type="number"
              min={1}
              max={ZEICHEN_MAX}
              step={1}
              aria-label={`Feld ${i + 1}: Spaltenbreite in Zeichen`}
              title="Nur der Startwert einer neuen Spalte. Ziehen geht danach wie immer."
              value={z.zeichen}
              placeholder="—"
              onChange={(e) => setZeile(i, { zeichen: e.target.value })}
            />
            <Knopf
              nurZeichen
              aria-label={`Feld ${i + 1} entfernen`}
              onClick={() => setZeilen(zeilen.filter((_, at) => at !== i))}
            >
              <X size={14} />
            </Knopf>
          </div>
          {zeigeFehler && zeilenFehler[i] !== '' && (
            <p className="text-dicht text-fehler">{zeilenFehler[i]}</p>
          )}
        </div>
      ))}
      {zeigeFehler && doppeltFehler !== '' && (
        <p className="text-dicht text-fehler">{doppeltFehler}</p>
      )}
    </div>
  )
}
