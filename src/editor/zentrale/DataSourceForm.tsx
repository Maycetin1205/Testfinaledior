// Das Formular einer Datenquelle: Art, Kennung, Felder, Satznummer, Hol-Weg.
import { useMemo, useState } from 'react'
import { Feld } from '@/editor/werkbank/Feld'
import { Gruppe } from '@/editor/werkbank/Gruppe'
import { Knopf } from '@/editor/werkbank/Knopf'
import { Zeile } from '@/editor/werkbank/Zeile'
import {
  relationsParameterVorgabe,
  type Parameter,
} from '../../kern/daten/aktionen'
import {
  aliasVon,
  artFuer,
  feldVorsatzAusEingabe,
  HOL_WERT_QUELLEN,
  holWertQuelleErlaubt,
  kennungAnzeige,
  kennungAusEingabe,
  kopfsatzAusEingabe,
  LADE_RELATION_STANDARD,
  QUELLEN_ARTEN,
  relationNrAusEingabe,
  tabellenKennungNoetig,
  type Datenquelle,
  type QuellenArtKennung,
} from '../../kern/daten/datenquellen'
import { leseMaskenFelder } from '../../kern/daten/maskenFelder'
import { relationPasstZurSuche } from '../../kern/daten/relationen'
import { useDataSources } from '../zustand/useDataSources'
import { useRelations } from '../zustand/useRelations'
import { ParameterZeile } from './ParameterZeile'
import type { ParameterWahlen } from './parameter/wahlen'
import { RelationAuswahl } from './RelationAuswahl'
import { SelectControl } from '../inspector/controls/SelectControl'
import { FeldListe } from './FeldListe'
import { quellenWorte } from './beschriftungen'
import {
  LEERE_ZEILE,
  zeileFromField,
  zeileGefuellt,
  zeilenCode,
  zeilenZeichen,
  type FeldZeile,
} from './feldZeile'
import { FormularKarte } from './FormularKarte'

const FELDCODE = /^\d+_\d+$/

interface DataSourceFormProps {
  source?: Datenquelle
  onClose: () => void
}

export function DataSourceForm({ source, onClose }: DataSourceFormProps) {
  const store = useDataSources()
  const [name, setName] = useState(source?.name ?? '')
  const [kind, setKind] = useState<QuellenArtKennung>(source?.art ?? 'idb')
  const [kennungEingabe, setKennungEingabe] = useState(kennungAnzeige(source?.idbId))
  const [kopfsatzEingabe, setKopfsatzEingabe] = useState(source?.kopfsatzIndex ?? '')

  const [vorsatzEingabe, setVorsatzEingabe] = useState(source?.feldVorsatz ?? '')
  const [bereichEingabe, setBereichEingabe] = useState(source?.bereich ?? '')

  // Die Feldbeschreibung einer ERP-Maske entsteht erst im ERP; der Editor im
  // Browser kennt sie nicht. Darum wird sie einmal eingelesen statt abgetippt.
  const [maskenText, setMaskenText] = useState('')
  const [maskenHinweis, setMaskenHinweis] = useState('')

  const [lieferung, setLieferung] = useState<'liste' | 'offenerSatz'>(
    source?.lieferung ?? 'liste',
  )

  const lade = source?.ladeRelation
  const [zeilenWeg, setZeilenWeg] = useState<'geschoben' | 'holen'>(lade ? 'holen' : 'geschoben')
  const [relationNr, setRelationNr] = useState(lade?.nr ?? LADE_RELATION_STANDARD.nr)
  const feldZuordnung = {
    belegartFeld: lade?.belegartFeld ?? LADE_RELATION_STANDARD.belegartFeld,
    belegnummerFeld: lade?.belegnummerFeld ?? LADE_RELATION_STANDARD.belegnummerFeld,
    jahrFeld: lade?.jahrFeld ?? LADE_RELATION_STANDARD.jahrFeld,
    archivFeld: lade?.archivFeld ?? LADE_RELATION_STANDARD.archivFeld,
    endeFelder: lade?.endeFelder ?? LADE_RELATION_STANDARD.endeFelder,
  }
  const [zeilen, setZeilen] = useState<FeldZeile[]>(
    source && source.felder.length > 0

      ? source.felder.map((f) => zeileFromField(
          f, source.feldVorsatz ?? '', artFuer(source.art).spaltenNamen,
        ))
      : [{ ...LEERE_ZEILE }],
  )

  const [satzNummer, setSatzNummer] = useState(source?.satzFeld ?? '')

  const [zeigeFehler, setZeigeFehler] = useState(false)

  const relationen = useRelations()
  const holVorlagen = relationen.list
  const [holRelationId, setHolRelationId] = useState(source?.holWert?.relationId ?? '')
  const [holParams, setHolParams] = useState<Parameter[]>(
    source?.holWert ? [...source.holWert.parameter] : [],
  )
  const [holSuche, setHolSuche] = useState('')

  const art = artFuer(kind)
  const worte = quellenWorte(kind)
  const kennungEingeben = tabellenKennungNoetig(art)

  const kopfsatzEingeben = art.kopfsatzMoeglich

  const bereichEingeben = art.bereichNoetig

  const holenMoeglich = art.relationLadenMoeglich

  const vorsatz = feldVorsatzAusEingabe(vorsatzEingabe)

  // Der Vorsatz steckt in JEDEM Feldcode dieser Quelle. Wer die Art wechselt,
  // soll ihn sehen und selbst entfernen, sonst fielen die Codes beim Speichern
  // still auf die Form ohne Vorsatz zurueck.
  const vorsatzEingeben = art.feldVorsatzMoeglich || vorsatz !== ''
  const holtZeilen = holenMoeglich && zeilenWeg === 'holen'

  // Der offene Satz kommt aus dem VAR-Abschnitt: Schleife und offener Satz
  // schliessen sich aus.
  const lieferungWaehlbar = art.varMoeglich && !holtZeilen
  const offenerSatz = lieferungWaehlbar && lieferung === 'offenerSatz'

  const geberOptionen = store.list.filter((s) => s.id !== source?.id)

  const holtWert = art.holWertMoeglich
  const holRelation = holVorlagen.find((r) => r.id === holRelationId)
  const sichtbareRelationen = useMemo(
    () => holVorlagen.filter((eintrag) => relationPasstZurSuche(eintrag, holSuche)),
    [holVorlagen, holSuche],
  )

  // Eine Quelle holt ohne Baustein und ohne laufende Kette; die uebrigen
  // Herkuenfte haetten hier gar keinen Wert.
  const holWahlen: ParameterWahlen = {
    dataSources: geberOptionen,
    blockValues: [],
    geber: [],
    erfassungen: [],
    aenderungen: [],
    loeschungen: [],
    schritte: [],
    erlaubt: HOL_WERT_QUELLEN,
  }

  function waehleHolRelation(id: string): void {
    setHolRelationId(id)
    const vorlage = holVorlagen.find((r) => r.id === id)
    setHolParams(vorlage
      ? relationsParameterVorgabe(vorlage).map((binding) =>
          holWertQuelleErlaubt(binding.quelle)
            ? binding
            : { quelle: 'fixed' as const, wert: '' })
      : [])
  }

  let holFehler = ''
  if (holtWert && holRelationId === '') holFehler = 'Wähle die Relation, die den Wert holt.'
  else if (holtWert && holRelation !== undefined && holRelation.verb !== 'GET_RELATION') {
    holFehler = 'Nur eine lesende Relation (GET) liefert einen Wert zurück.'
  }

  function waehleArt(neu: QuellenArtKennung): void {
    setKind(neu)
    const neueArt = artFuer(neu)
    const standardFelder = quellenWorte(neu).standardFelder
    if (standardFelder.length > 0 && !zeilen.some(zeileGefuellt)) {
      setZeilen(standardFelder.map((f) => zeileFromField(f)))
    }
    if (neueArt.kopfsatzStandard !== '' && kopfsatzEingabe.trim() === '') {
      setKopfsatzEingabe(neueArt.kopfsatzStandard)
    }
  }

  // SoftEngine legt die Zeilen unter dem Namen ab, und die Laufzeit sucht sie
  // ueber genau diesen Namen; zwei gleich benannte zeigten stumm dieselben Daten.
  const nameDoppelt = store.list.some(
    (s) => s.id !== source?.id && aliasVon(s.name) === aliasVon(name),
  )
  let nameFehler = ''
  if (name.trim() === '') nameFehler = 'Anzeigename fehlt.'
  else if (nameDoppelt) nameFehler = 'Diesen Namen trägt schon eine andere Quelle.'
  const kennungFehler =
    kennungEingeben && kennungAusEingabe(kennungEingabe, art.idbKurzform) === ''
      ? `${worte.kennungLabel} fehlt (z. B. ${worte.kennungBeispiel}).`
      : ''

  const kopfsatzFehler =
    kopfsatzEingeben && kopfsatzEingabe.trim() !== '' && kopfsatzAusEingabe(kopfsatzEingabe) === ''
      ? 'Ungültig — Beispiel: BEL_0_11.'
      : ''

  const bereichFehler = bereichEingeben && bereichEingabe.trim() === ''
    ? 'Bereich fehlt (z. B. BEL).'
    : ''

  function maskenFelderUebernehmen() {
    const gelesen = leseMaskenFelder(maskenText)
    if (gelesen === null) {
      setMaskenHinweis('Daraus wird keine Feldbeschreibung. Erwartet wird, was SEDATA.Daten.Masken.<Name> liefert.')
      return
    }
    setZeilen(gelesen.felder.map((f) => zeileFromField(f, gelesen.vorsatz, false)))
    if (gelesen.vorsatz !== '') setVorsatzEingabe(gelesen.vorsatz)
    const teile = [`${gelesen.felder.length} Felder übernommen`]
    if (gelesen.nurAnzeige > 0) teile.push(`${gelesen.nurAnzeige} davon nur Anzeige`)
    if (gelesen.uebersprungen > 0) teile.push(`${gelesen.uebersprungen} ohne Feldcode übersprungen`)
    setMaskenHinweis(`${teile.join(', ')}.`)
    setMaskenText('')
  }
  const zeilenFehler = zeilen.map((z) => {
    if (z.label.trim() === '') return 'Klarname fehlt.'
    if (!art.spaltenNamen && FELDCODE.test(z.label.trim())) {
      return 'Klarname darf kein Feldcode sein.'
    }
    if (zeilenCode(z, vorsatz, art.spaltenNamen) === '') {
      return art.spaltenNamen
        ? 'Spaltenname fehlt (ohne Komma).'
        : 'Position und Länge als Zahlen angeben.'
    }
    return ''
  })
  const codes = zeilen.map((z) => zeilenCode(z, vorsatz, art.spaltenNamen))
  const doppeltFehler = codes.some((c, i) => c !== '' && codes.indexOf(c) !== i)
    ? (art.spaltenNamen
        ? 'Zwei Felder zeigen auf dieselbe Spalte.'
        : 'Zwei Felder haben dieselbe Position + Länge.')
    : ''

    // Gewaehlt wird ein FELD der Quelle, nicht ein getippter Code.
  const satzNummerOptionen = [
    { wert: '', name: 'Nicht gebunden' },
    ...zeilen
      .map((z, i) => ({ code: codes[i] ?? '', label: z.label.trim() }))
      .filter((e) => e.code !== '' && e.label !== '')
      .map((e) => ({ wert: e.code, name: e.label, detail: e.code })),
  ]
      // Ein Wert, der zu keinem Feld gehoert, bleibt sichtbar statt still zu
      // verschwinden: sonst aendert das blosse Oeffnen die Quelle.
  if (satzNummer !== '' && !satzNummerOptionen.some((o) => o.wert === satzNummer)) {
    satzNummerOptionen.push({
      wert: satzNummer, name: satzNummer, detail: 'kein Feld dieser Quelle',
    })
  }

  const relationNrFehler = holtZeilen && relationNrAusEingabe(relationNr) === ''
    ? 'Relationsnummer fehlt — nur Ziffern.'
    : ''
  const alleFehler = [
    nameFehler, kennungFehler, kopfsatzFehler, bereichFehler, doppeltFehler,
    relationNrFehler, holFehler,
    ...zeilenFehler,
  ]

  function speichern() {
    if (alleFehler.some((f) => f !== '')) {
      setZeigeFehler(true)
      return
    }
    const daten: Omit<Datenquelle, 'id'> = {
      name: name.trim(),
      art: kind,
      ...(kennungEingeben ? { idbId: kennungAusEingabe(kennungEingabe, art.idbKurzform) } : {}),

      ...(kopfsatzEingeben && kopfsatzAusEingabe(kopfsatzEingabe) !== ''
        ? { kopfsatzIndex: kopfsatzAusEingabe(kopfsatzEingabe) }
        : {}),

      ...(vorsatz !== '' ? { feldVorsatz: vorsatz } : {}),

      ...(bereichEingeben ? { bereich: bereichEingabe.trim().toUpperCase() } : {}),

      ...(offenerSatz ? { lieferung: 'offenerSatz' as const } : {}),

      ...(art.satzNummerMoeglich && satzNummer !== ''
        ? { satzFeld: satzNummer }
        : {}),

      ...(holtZeilen
        ? {
            ladeRelation: {
              nr: relationNrAusEingabe(relationNr),
              ...feldZuordnung,
            },
          }
        : {}),

      ...(holtWert && holRelationId !== ''
        ? { holWert: { relationId: holRelationId, parameter: holParams } }
        : {}),
      felder: zeilen.map((z) => {
        const zeichen = zeilenZeichen(z)
        return {
          code: zeilenCode(z, vorsatz, art.spaltenNamen),
          name: z.label.trim(),
          ...(zeichen === undefined ? {} : { zeichen }),
        }
      }),
    }
    if (source) store.update(source.id, daten)
    else store.add(daten)
    onClose()
  }

  return (
    <FormularKarte title={source ? 'Datenquelle bearbeiten' : 'Neue Datenquelle'} onClose={onClose}>
      <div className="flex flex-col gap-2">
        <Zeile label="Anzeigename" fehler={zeigeFehler ? nameFehler : undefined}>
          {(f) => (
            <Feld
              {...f}
              value={name}
              placeholder="z. B. Terminplaner"
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Zeile>

        <SelectControl
          label="Art"
          value={kind}
          options={QUELLEN_ARTEN.map((a) => ({ wert: a.id, name: quellenWorte(a.id).name }))}
          onChange={(v) => waehleArt(v as QuellenArtKennung)}
        />

        {kennungEingeben && (
          <Zeile label={worte.kennungLabel} fehler={zeigeFehler ? kennungFehler : undefined}>
            {(f) => (
              <Feld
                {...f}
                value={kennungEingabe}
                placeholder={`z. B. ${worte.kennungBeispiel}`}
                className="w-32"
                onChange={(e) => setKennungEingabe(e.target.value)}
              />
            )}
          </Zeile>
        )}

        {bereichEingeben && (
          <Zeile label="Bereich" fehler={zeigeFehler ? bereichFehler : undefined}>
            {(f) => (
              <Feld
                {...f}
                value={bereichEingabe}
                placeholder="z. B. BEL"
                className="w-32"
                onChange={(e) => setBereichEingabe(e.target.value)}
              />
            )}
          </Zeile>
        )}

        {bereichEingeben && (
          <Zeile label="Felder einlesen">
            {() => (
              <div className="flex flex-col gap-1">
                <textarea
                  value={maskenText}
                  onChange={(e) => setMaskenText(e.target.value)}
                  rows={3}
                  placeholder="In SoftEngine F12, SEDATA.Daten.Masken.NAME kopieren und hier einfügen"
                  className="w-full rounded border border-linie bg-panel p-1.5 font-mono text-dicht"
                />
                <div className="flex items-center gap-2">
                  <Knopf onClick={maskenFelderUebernehmen} disabled={maskenText.trim() === ''}>
                    Felder übernehmen
                  </Knopf>
                  {maskenHinweis !== '' && (
                    <span className="text-dicht text-matt">{maskenHinweis}</span>
                  )}
                </div>
              </div>
            )}
          </Zeile>
        )}

        {vorsatzEingeben && (
          <Zeile label="Feld-Vorsatz">
            {(f) => (
              <Feld
                {...f}
                value={vorsatzEingabe}
                placeholder="z. B. LFA_"
                className="w-32"
                onChange={(e) => setVorsatzEingabe(e.target.value)}
              />
            )}
          </Zeile>
        )}

        {lieferungWaehlbar && (
          <SelectControl
            label="Was liefert die Quelle?"
            value={lieferung}
            options={[
              { wert: 'liste', name: 'Mehrere Sätze — eine Liste' },
              { wert: 'offenerSatz', name: 'Nur den Satz, der gerade offen ist' },
            ]}
            onChange={(v) => setLieferung(v as 'liste' | 'offenerSatz')}
          />
        )}

        {holenMoeglich && !offenerSatz && (
          <SelectControl
            label="Woher kommen die Zeilen?"
            value={zeilenWeg}
            options={[
              { wert: 'geschoben', name: 'SoftEngine schickt sie beim Laden' },
              { wert: 'holen', name: 'Die Maske holt sie, sobald ein Beleg angeklickt ist' },
            ]}
            onChange={(v) => setZeilenWeg(v as 'geschoben' | 'holen')}
          />
        )}
        {holtZeilen && (
          <>
            <Zeile
              label="Relationsnummer"
              fehler={zeigeFehler ? relationNrFehler : undefined}
            >
              {(f) => (
                <Feld
                  {...f}
                  value={relationNr}
                  className="w-24"
                  onChange={(e) => setRelationNr(e.target.value)}
                />
              )}
            </Zeile>
            <p className="text-dicht text-matt">
              Welche Zeile gemeint ist, stellst du am Baustein ein:
              „Auswahl folgen“ → die Tabelle mit den Belegen.
            </p>
          </>
        )}

        {kopfsatzEingeben && !holtZeilen && (
          <Zeile
            label="Gehört zu"
            fehler={zeigeFehler ? kopfsatzFehler : undefined}
          >
            {(f) => (
              <Feld
                {...f}
                value={kopfsatzEingabe}
                placeholder="z. B. BEL_0_11"
                className="w-32"
                onChange={(e) => setKopfsatzEingabe(e.target.value)}
              />
            )}
          </Zeile>
        )}

        {holtWert && (
          <>
            <RelationAuswahl
              label="Relation"
              eintraege={sichtbareRelationen}
              relationId={holRelationId}
              suche={holSuche}
              onSuche={setHolSuche}
              onSelect={waehleHolRelation}
            />
            {zeigeFehler && holFehler !== '' && (
              <p className="break-words text-dicht text-fehler">{holFehler}</p>
            )}
            {holRelation && (
              <Gruppe titel="Parameter">
                {holRelation.parameter.map((raw, index) => (
                  <ParameterZeile
                    key={index}
                    nummer={index + 1}
                    kennung={raw === '' ? '(leer)' : raw}
                    binding={holParams[index] ?? { quelle: 'fixed', wert: '' }}
                    wahlen={holWahlen}
                    platzhalter={raw === '' ? '(leer)' : raw}
                    onChange={(naechste) => setHolParams((alt) => {
                      const neu = [...alt]
                      neu[index] = naechste
                      return neu
                    })}
                  />
                ))}
                {holRelation.parameter.length === 0 && (
                  <p className="text-ui text-matt">Keine Parameter.</p>
                )}
              </Gruppe>
            )}
          </>
        )}

        <FeldListe
          spaltenNamen={art.spaltenNamen}
          spaltenLabel={worte.spaltenLabel}
          spaltenBeispiel={worte.spaltenBeispiel}
          zeilen={zeilen}
          setZeilen={setZeilen}
          zeilenFehler={zeilenFehler}
          doppeltFehler={doppeltFehler}
          zeigeFehler={zeigeFehler}
        />

        {art.satzNummerMoeglich && (
          <SelectControl
            label="Satznummer"
            description="Macht eine Zeile eindeutig. Ohne sie kann die Maske neue Zeilen anlegen, aber keine bestehende ändern oder löschen."
            value={satzNummer}
            options={satzNummerOptionen}
            onChange={setSatzNummer}
          />
        )}

        <div className="flex justify-end gap-2 border-t border-linie pt-3">
          <Knopf onClick={onClose}>Abbrechen</Knopf>
          <Knopf art="primaer" onClick={speichern}>Speichern</Knopf>
        </div>
      </div>
    </FormularKarte>
  )
}
