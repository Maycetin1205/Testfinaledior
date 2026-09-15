// Die Positionen einer Quelle Zeile fuer Zeile per Hol-Relation holen.
import { meldeAnstoss } from './bridge'
import { feldLesen, type LaufzeitLadeRelation } from './data'
import { geholteZeilenFuer, setzeGeholteZeilen } from './geholteZeilen'
import { relationAusfuehren, type RelationAntwort } from './relations'
import { meldeFehler } from './meldung'

const MAX_POSITIONEN = 999

const SCHNITT_POS = '0'
const SCHNITT_LEN = '255'

export interface HolQuelle {
  id: string
  name: string
}

const generationen = new Map<string, number>()

function leereQuelle(name: string): void {
  const vorher = geholteZeilenFuer(name)
  setzeGeholteZeilen(name, [])
  if (vorher !== undefined && vorher.length > 0) meldeAnstoss()
}

async function frage(
  lade: LaufzeitLadeRelation,
  schluessel: { belegart: string; belegnummer: string; jahr: string; archiv: string },
  posNr: number,
  pos: string,
  len: string,
): Promise<RelationAntwort> {
  return relationAusfuehren(
    { id: 'relation-lader', verb: 'GET_RELATION', nr: lade.nr, parameter: [] },
    [
      schluessel.belegart,
      pos,
      len,
      schluessel.belegnummer,
      schluessel.jahr,
      schluessel.archiv,
      '',
      String(posNr),
      '',
      '',
      '',
      '',
    ],
    { still: true, satzAntwort: true },
  )
}

// Die Hol-Rufe laufen 'still': bei bis zu 999 Positionen blinkte der Balken sonst
// ununterbrochen. Der Abbruch selbst muss sichtbar sein.
function meldeAbbruch(nr: string, posNr: number, grund: string): void {
  meldeFehler(
    `Positionen laden bei Zeile ${posNr} abgebrochen (Relation Nr. ${nr}): ${grund} `
    + 'Es werden keine Positionen angezeigt — die Liste wäre unvollständig.',
  )
}

export function ladeZeilenPerRelation(
  quelle: HolQuelle,
  lade: LaufzeitLadeRelation,
  geberZeile: unknown,
): void {
  const gen = (generationen.get(quelle.id) ?? 0) + 1
  generationen.set(quelle.id, gen)

  if (geberZeile === undefined) {
    leereQuelle(quelle.name)
    return
  }

  const schluessel = {
    belegart: feldLesen(geberZeile, lade.belegartFeld),
    belegnummer: feldLesen(geberZeile, lade.belegnummerFeld),

    jahr: lade.jahrFeld === '' ? '' : feldLesen(geberZeile, lade.jahrFeld),
    archiv: lade.archivFeld === '' ? '' : feldLesen(geberZeile, lade.archivFeld),
  }

  // Ohne Belegart und Belegnummer ist die Relation nicht zu fragen. Still
  // leerraeumen hiesse: die Tabelle bleibt leer und niemand sagt warum.
  if (schluessel.belegart === '' || schluessel.belegnummer === '') {
    leereQuelle(quelle.name)
    const fehlt = [
      schluessel.belegart === '' ? `Belegart (${lade.belegartFeld})` : '',
      schluessel.belegnummer === '' ? `Belegnummer (${lade.belegnummerFeld})` : '',
    ].filter((t) => t !== '').join(' und ')
    meldeFehler(
      `Positionen laden: die angeklickte Zeile hat keine ${fehlt}. `
      + `Relation Nr. ${lade.nr} kann so nicht gefragt werden — zeigt der `
      + 'angeklickte Baustein wirklich die Belegliste, die unter "Beleg kommt '
      + 'aus" steht?',
    )
    return
  }

  leereQuelle(quelle.name)

  void (async () => {
    const zeilen: Record<string, string>[] = []
    let endeGesehen = false

    for (let posNr = 1; posNr <= MAX_POSITIONEN; posNr += 1) {
      const antwort = await frage(lade, schluessel, posNr, SCHNITT_POS, SCHNITT_LEN)
      if (generationen.get(quelle.id) !== gen) return

  // Ein gescheiterter Ruf liefert einen LEEREN Satz, von einem echten Listenende
  // nicht zu unterscheiden. Weiterzumachen gaebe die halbe Liste als ganze aus.
      if (antwort.fehler !== undefined) {
        meldeAbbruch(lade.nr, posNr, antwort.fehler)
        return
      }
      const satz = antwort.wert

      if (lade.endeFelder.every((feld) => feldLesen({ SATZ: satz }, feld) === '')) {
        endeGesehen = true
        break
      }

      const zeile: Record<string, string> = { SATZ: satz }
      for (const feld of lade.zusatzFelder) {
        const trenner = feld.indexOf('_')
        const zusatz = await frage(
          lade,
          schluessel,
          posNr,
          feld.slice(0, trenner),
          feld.slice(trenner + 1),
        )
        if (generationen.get(quelle.id) !== gen) return
        if (zusatz.fehler !== undefined) {
          meldeAbbruch(lade.nr, posNr, zusatz.fehler)
          return
        }
        zeile[feld] = zusatz.wert
      }
      zeilen.push(zeile)
    }

    if (!endeGesehen) {
      meldeFehler(
        `Positionen laden: nach ${MAX_POSITIONEN} Zeilen ohne Ende-Kennung abgebrochen `
        + `(Relation Nr. ${lade.nr}) — die Liste ist wahrscheinlich unvollständig, `
        + 'vermutlich passen Relationsnummer oder Ende-Felder nicht.',
      )
    }

    if (generationen.get(quelle.id) === gen) {
      setzeGeholteZeilen(quelle.name, zeilen)
      meldeAnstoss()
    }
  })()
}
