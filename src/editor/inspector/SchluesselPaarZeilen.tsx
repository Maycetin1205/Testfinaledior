// Die Feldpaare, mit denen zwei Quellen verbunden werden.
import { Plus, X } from '@/editor/zeichen/zeichen'
import { Knopf } from '@/editor/werkbank/Knopf'
import type { Datenfeld } from '../../kern/daten/datenquellen'
import { MAX_SCHLUESSELPAARE, type SchluesselPaar } from '../../kern/daten/weitereQuellen'
import { PickerControl } from './controls/PickerControl'

interface SchluesselPaarZeilenProps {
  frage: string
  paare: readonly SchluesselPaar[]

  linkeFelder: readonly Datenfeld[]
  rechteFelder: readonly Datenfeld[]
  linkeBezeichnung: (at: number) => string
  rechteBezeichnung: (at: number) => string
  entfernenBezeichnung: (at: number) => string
  onAendern: (paare: SchluesselPaar[]) => void
}

export function SchluesselPaarZeilen({
  frage,
  paare,
  linkeFelder,
  rechteFelder,
  linkeBezeichnung,
  rechteBezeichnung,
  entfernenBezeichnung,
  onAendern,
}: SchluesselPaarZeilenProps) {
  const setzePaar = (at: number, teil: Partial<SchluesselPaar>) =>
    onAendern(paare.map((p, i) => (i === at ? { ...p, ...teil } : p)))

  // Der Waehler bringt die Suche mit und zeigt einen Feldcode, den die Quelle
  // nicht mehr kennt, rot statt leer.
  const feldWaehler = (
    bezeichnung: string,
    felder: readonly Datenfeld[],
    wert: string,
    onWaehle: (code: string) => void,
  ) => (
    <PickerControl
      className="flex-1"
      bezeichnung={bezeichnung}
      gruppen={[{
        key: 'felder',
        eintraege: felder.map((f) => ({ wert: f.code, name: f.name, kennung: f.code })),
      }]}
      wert={wert}
      leerText="Nicht gebunden"
      onWaehle={onWaehle}
    />
  )

  return (
    <>
      <span className="text-dicht text-matt">{frage}</span>
      {/* Die beiden Waehler stehen UNTEREINANDER. Nebeneinander teilten sie
          sich eine ohnehin eingerueckte Spalte und trugen jeder die vollen
          Fixkosten (Rahmen, Polster, Pfeil): vom Feldnamen blieben drei bis
          sechs Zeichen — man sah nicht mehr, was man gewaehlt hatte.
          Untereinander hat jeder die volle Breite; es kostet eine Zeilenhoehe
          je Paar. */}
      {paare.map((paar, at) => (
        <div key={at} className="flex flex-col gap-1 rounded border border-linie p-1.5">
          <div className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-dicht text-matt">
              {linkeBezeichnung(at)}
            </span>
            {paare.length > 1 && (
              <Knopf
                nurZeichen
                aria-label={entfernenBezeichnung(at)}
                onClick={() => onAendern(paare.filter((_, x) => x !== at))}
              >
                <X size={13} />
              </Knopf>
            )}
          </div>
          {feldWaehler(linkeBezeichnung(at), linkeFelder, paar.vonFeld,
            (code) => setzePaar(at, { vonFeld: code }))}
          <span className="text-dicht text-matt">{rechteBezeichnung(at)}</span>
          {feldWaehler(rechteBezeichnung(at), rechteFelder, paar.nachFeld,
            (code) => setzePaar(at, { nachFeld: code }))}
        </div>
      ))}
      {paare.length < MAX_SCHLUESSELPAARE && (
        <Knopf
          className="self-start"
          onClick={() => onAendern([...paare, { vonFeld: '', nachFeld: '' }])}
        >
          <Plus size={13} /> Feld dazu
        </Knopf>
      )}
    </>
  )
}
