// Das Fenster einer Berechnung: Formel, Rechenrichtungen, Datensatz, Vorschau.
import { useState, type ReactNode } from 'react'
import { Ankreuz } from '@/ui/werkbank/Ankreuz'
import { Dialog } from '@/ui/werkbank/Dialog'
import { Feld } from '@/ui/werkbank/Feld'
import { Knopf } from '@/ui/werkbank/Knopf'
import { Wahl, type WahlOption } from '@/ui/werkbank/Wahl'
import { Zahl } from '@/ui/werkbank/Zahl'
import {
  alleFaktoren,
  berechnungsMaengel,
  einheitenProbe,
  ergebnisFaktoren,
  faktorName,
  freieFaktorKennung,
  neuerFaktor,
  rechneBerechnung,
  richtungAlsText,
  type Berechnung,
  type Faktor,
  type FaktorStand,
  type SpaltenFaktor,
} from '../../core/data/berechnung'
import { einheitKurz } from '../../core/data/einheiten'
import { zahlStreng, STELLEN_MAX, type RundungsRichtung } from '../../core/data/rechnung'
import type { QuelleInReichweite } from '../../core/data/sourceLinks'
import { FaktorZeile } from './BerechnungFaktor'

const RICHTUNGEN: WahlOption[] = [
  { wert: 'auf', name: 'aufrunden' },
  { wert: 'ab', name: 'abrunden' },
  { wert: 'kfm', name: 'kaufmännisch' },
]

export interface Spaltenkopf {
  kennung: string
  titel: string
  hatFormel: boolean
}

function Schritt({ nr, titel, hinweis, children }: {
  nr: number
  titel: string
  hinweis?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-ui font-semibold text-tinte">{nr}. {titel}</h3>
      {hinweis !== undefined && <p className="text-dicht text-matt">{hinweis}</p>}
      {children}
    </section>
  )
}

// Die Testwerte der Vorschau, je Faktor als getippter Text.
function vorschauStand(text: string | undefined): FaktorStand {
  const t = (text ?? '').trim()
  if (t === '') return { art: 'leer' }
  const zahl = zahlStreng(t)
  return zahl === null ? { art: 'ungueltig', text: t } : { art: 'zahl', zahl }
}

export interface BerechnungDialogProps {
  berechnung: Berechnung
  spalten: readonly Spaltenkopf[]
  quellen: readonly QuelleInReichweite[]
  onBerechnung: (b: Berechnung) => void
  onClose: () => void
}

export function BerechnungDialog({
  berechnung,
  spalten,
  quellen,
  onBerechnung,
  onClose,
}: BerechnungDialogProps) {
  const [proben, setProben] = useState<Record<string, string>>({})

  const titelVon = (kennung: string): string | null => {
    const s = spalten.find((sp) => sp.kennung === kennung)
    return s === undefined ? null : (s.titel === '' ? s.kennung : s.titel)
  }
  const name = (f: Faktor): string => faktorName(f, (k) => titelVon(k) ?? '')

  // Zwei Groessen ohne Spalte melden denselben Satz; einmal reicht.
  const maengel = [...new Set(berechnungsMaengel(
    berechnung,
    titelVon,
    (feld) => (feld === '' ? null : feld),
    (kennung) => spalten.find((s) => s.kennung === kennung)?.hatFormel === true,
  ))]
  const probe = einheitenProbe(berechnung)

  const setzeFaktor = (alt: Faktor, neu: Faktor): void => {
    const ersetze = (liste: readonly Faktor[]): Faktor[] =>
      liste.map((f) => (f.kennung === alt.kennung ? neu : f))
    if (berechnung.leit.kennung === alt.kennung && neu.art === 'spalte') {
      onBerechnung({ ...berechnung, leit: { ...neu, ergebnis: true } })
      return
    }
    onBerechnung({
      ...berechnung,
      zaehler: ersetze(berechnung.zaehler),
      nenner: ersetze(berechnung.nenner),
    })
  }

  const faktorWeg = (weg: Faktor): void => {
    onBerechnung({
      ...berechnung,
      zaehler: berechnung.zaehler.filter((f) => f.kennung !== weg.kennung),
      nenner: berechnung.nenner.filter((f) => f.kennung !== weg.kennung),
    })
  }

  const faktorDazu = (seite: 'zaehler' | 'nenner'): void => {
    const neu = neuerFaktor(freieFaktorKennung(berechnung))
    onBerechnung({ ...berechnung, [seite]: [...berechnung[seite], neu] })
  }

  const setzeErgebnis = (f: SpaltenFaktor, ergebnis: boolean): void => {
    setzeFaktor(f, { ...f, ergebnis })
  }

  const spaltenFaktoren = alleFaktoren(berechnung)
    .filter((f): f is SpaltenFaktor => f.art === 'spalte')
  const datenFaktoren = alleFaktoren(berechnung).filter((f) => f.art === 'datenfeld')

  const vorschau = rechneBerechnung(
    berechnung,
    (f) => (f.art === 'zahl' ? { art: 'zahl', zahl: f.zahl } : vorschauStand(proben[f.kennung])),
    (k) => titelVon(k) ?? '',
    maengel,
  )

  return (
    <Dialog
      titel={berechnung.name === '' ? 'Berechnung' : berechnung.name}
      nebenTitel={richtungAlsText(berechnung, berechnung.leit.kennung, (k) => titelVon(k) ?? '?')}
      fuss={<Knopf art="primaer" onClick={onClose}>Fertig</Knopf>}
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        {maengel.length > 0 && (
          <ul className="flex flex-col gap-0.5 rounded border border-fehler/60 p-2 text-dicht text-fehler">
            {maengel.map((m) => <li key={m}>{m}</li>)}
          </ul>
        )}

        <Schritt
          nr={1}
          titel="Name und Formel"
          hinweis={'Links steht die Größe, die sich zuerst ergibt; rechts ihre Faktoren und '
            + 'Teiler. Einheit und Datenfeld stehen direkt beim Operanden, nicht in einer '
            + 'eigenen Liste: sonst stellte man sie weit weg von dem ein, wofür sie gelten.'}
        >
          <Feld
            placeholder="Name der Berechnung"
            defaultValue={berechnung.name}
            onBlur={(e) => onBerechnung({ ...berechnung, name: e.currentTarget.value.trim() })}
          />

          <span className="text-dicht text-matt">Ergebnisgröße (links vom Gleichheitszeichen)</span>
          <FaktorZeile
            faktor={berechnung.leit}
            spalten={spalten}
            quellen={quellen}
            leit
            onFaktor={(f) => setzeFaktor(berechnung.leit, f)}
          />

          <span className="text-dicht text-matt">mal (Zähler)</span>
          {berechnung.zaehler.map((f) => (
            <FaktorZeile
              key={f.kennung}
              faktor={f}
              spalten={spalten}
              quellen={quellen}
              onFaktor={(neu) => setzeFaktor(f, neu)}
              onWeg={() => faktorWeg(f)}
            />
          ))}
          <Knopf onClick={() => faktorDazu('zaehler')}>+ Faktor</Knopf>

          <span className="text-dicht text-matt">geteilt durch (Nenner)</span>
          {berechnung.nenner.map((f) => (
            <FaktorZeile
              key={f.kennung}
              faktor={f}
              spalten={spalten}
              quellen={quellen}
              onFaktor={(neu) => setzeFaktor(f, neu)}
              onWeg={() => faktorWeg(f)}
            />
          ))}
          <Knopf onClick={() => faktorDazu('nenner')}>+ Teiler</Knopf>

          <p className={probe === '' ? 'text-dicht text-matt' : 'text-dicht text-fehler'}>
            {probe === ''
              ? 'Die Einheiten beider Seiten passen zusammen.'
              : probe}
          </p>
        </Schritt>

        <Schritt
          nr={2}
          titel="Rechenrichtungen und Rundung"
          hinweis={'Jede angekreuzte Größe kann aus den übrigen entstehen. Gerundet wird erst '
            + 'das fertige Ergebnis, darum steht die Rundung bei der Größe und nicht bei der Formel.'}
        >
          {spaltenFaktoren.map((f) => (
            <div key={f.kennung} className="flex flex-col gap-1 rounded border border-linie p-2">
              <div className="flex items-center gap-2">
                <Ankreuz
                  className="min-w-0 flex-1"
                  checked={f.ergebnis}
                  disabled={f.kennung === berechnung.leit.kennung}
                  onChange={() => setzeErgebnis(f, !f.ergebnis)}
                >
                  {name(f)} berechnen
                </Ankreuz>
                <Zahl
                  einheit="NK"
                  title="Nachkommastellen dieses Ergebnisses"
                  className="w-16"
                  min={0}
                  max={STELLEN_MAX}
                  value={f.runden.stellen}
                  onChange={(e) => {
                    const stellen = Number.parseInt(e.target.value, 10)
                    if (Number.isInteger(stellen) && stellen >= 0 && stellen <= STELLEN_MAX) {
                      setzeFaktor(f, { ...f, runden: { ...f.runden, stellen } })
                    }
                  }}
                />
                <Wahl
                  className="w-auto"
                  optionen={RICHTUNGEN}
                  wert={f.runden.richtung}
                  onWaehle={(richtung) => setzeFaktor(f, {
                    ...f,
                    runden: { ...f.runden, richtung: richtung as RundungsRichtung },
                  })}
                />
              </div>
              {f.ergebnis && (
                <span className="text-dicht text-matt">
                  {richtungAlsText(berechnung, f.kennung, (k) => titelVon(k) ?? '?')}
                </span>
              )}
            </div>
          ))}
        </Schritt>

        <Schritt
          nr={3}
          titel="Datensatzzuordnung"
          hinweis={'Ein Datenfeld liefert den Wert des Satzes, der FÜR DIESE ZEILE gewählt ist — '
            + 'über die Schlüsselpaare unter „Weitere Quellen". Ist keiner eindeutig zugeordnet, '
            + 'rechnet die Zeile nicht; der erste Satz einer Quelle wäre geraten.'}
        >
          {datenFaktoren.length === 0
            ? <p className="text-dicht text-matt">Diese Berechnung liest kein Datenfeld.</p>
            : datenFaktoren.map((f) => {
              const quelle = quellen.find(
                (q) => f.art === 'datenfeld' && f.feld.startsWith(`${q.source.id}::`),
              )
              const paare = quelle?.paare ?? []
              return (
                <div key={f.kennung} className="rounded border border-linie p-2 text-dicht">
                  <span className="text-ui">{name(f)}</span>
                  <div className="text-matt">
                    {quelle === undefined
                      ? 'Noch keine Datenquelle gewählt.'
                      : paare.length === 0
                        ? `Quelle „${quelle.source.name}" ist über kein Schlüsselpaar verbunden — `
                          + 'die Zeile kann keinen Satz zuordnen.'
                        : `Quelle „${quelle.source.name}", verbunden über `
                          + paare.map((p) => `${p.fromField} → ${p.toField}`).join(', ')}
                  </div>
                </div>
              )
            })}
        </Schritt>

        <Schritt
          nr={4}
          titel="Vorschau"
          hinweis="Lass genau ein Feld leer — es wird berechnet."
        >
          {alleFaktoren(berechnung).filter((f) => f.art !== 'zahl').map((f) => (
            <div key={f.kennung} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-ui">{name(f)}</span>
              <Zahl
                className="w-28"
                einheit={einheitKurz(f.einheit)}
                value={proben[f.kennung] ?? ''}
                onChange={(e) => setProben({ ...proben, [f.kennung]: e.target.value })}
              />
            </div>
          ))}
          <p className={vorschau.art === 'ergebnis' || vorschau.art === 'stimmt'
            ? 'text-dicht text-matt'
            : 'text-dicht text-fehler'}
          >
            {vorschau.art === 'ergebnis'
              ? `${name(alleFaktoren(berechnung).find((f) => f.kennung === vorschau.kennung) ?? berechnung.leit)} = ${vorschau.text} ${einheitKurz(
                alleFaktoren(berechnung).find((f) => f.kennung === vorschau.kennung)?.einheit ?? '',
              )}`.trim()
              : vorschau.art === 'stimmt'
                ? 'Alle Werte gefüllt und stimmig.'
                : vorschau.art === 'offen'
                  ? 'Es fehlt mehr als ein Wert — es wird nicht geraten.'
                  : vorschau.text}
          </p>
          {ergebnisFaktoren(berechnung).length === 0 && (
            <p className="text-dicht text-fehler">Keine Größe darf Ergebnis sein.</p>
          )}
        </Schritt>
      </div>
    </Dialog>
  )
}
