// Eine Aktionskette laufen lassen: Abschnitte bilden, Schritte senden, je Zeile berichten.
import {
  BAUSTEIN_ID_ATTR,
  abschnitteVon,
  kettenLesen,
  SATZ_PLATZHALTER,
  type LaufzeitSchritt,
} from '../../core/data/aktionen'
import {
  type GeschriebeneZeile,
  type LaufBerichtElement,
  type VormerkArt,
  hatFaehigkeit,
  vertragVon,
} from '../../core/blocks/faehigkeiten'
import { auswahlFuer } from './auswahl'
import { bausteinArtFuerTag, bausteinArt } from '../../core/blocks/blockRegistry'
import {
  heuteAlsText,
  platzhalterEinsetzen,
  type Platzhalterwerte,
} from '../../core/data/relations'
import { sendeBwLink, sendeStartTool } from '../../softengine/befehle'
import { bootSe, frischeDatenAnfordern } from '../../softengine/bridge'
import { meldeFehler } from '../../softengine/meldung'
import { executeRelation, laufzeitRelation, resolveActionParam } from '../../softengine/relations'

export function applyPopupStep(root: ParentNode, name: string, oeffnen: boolean): void {
  if (name.trim() === '') return
  // Nach dem Fenster-Baustein wird die Registry gefragt: eine Maske ohne
  // Fenster laedt seinen Code gar nicht erst.
  const fensterArt = bausteinArt('popup')
  const alle = fensterArt === undefined ? [] : Array.from(root.querySelectorAll(fensterArt.tagName))
  const treffer = alle.filter(
    (el) => (el.getAttribute('name') ?? fensterArt?.defaultProps.name) === name,
  )
  if (treffer.length === 0) {
    meldeFehler('Fenster „' + name + '“ gibt es in dieser Maske nicht.')
    return
  }
  if (treffer.length > 1) {
    meldeFehler('Fenster „' + name + '“ gibt es mehrfach — keines ist gemeint.')
    return
  }
  const ziel = treffer[0]
  if (!oeffnen) {
    ziel.removeAttribute('offen')
    return
  }
  for (const el of alle) {
    if (el !== ziel) el.removeAttribute('offen')
  }
  ziel.setAttribute('offen', '')
}

const laufend = new WeakMap<HTMLElement, Set<string>>()

export function meldeKettenFehler(fehler: unknown): void {
  const text = fehler instanceof Error ? fehler.message : String(fehler)
  meldeFehler('Aktionskette fehlgeschlagen: ' + text)
}

type ZeilenTraeger = HTMLElement

// Welche Listen ein Traeger fuehrt, sagt die Registry; der Vertrag dahinter ist
// verbindlich (vertragVon).
const FAEHIGKEIT_JE_LISTE = { erfasst: 'erfassen', geaendert: 'aendern', geloescht: 'loeschen' } as const

function berichtAn(traeger: ZeilenTraeger, art: VormerkArt): LaufBerichtElement {
  return vertragVon(traeger, FAEHIGKEIT_JE_LISTE[art])
}

export function sucheTraeger(root: ParentNode, blockId: string): ZeilenTraeger | undefined {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${BAUSTEIN_ID_ATTR}]`))
    .find((el) => el.getAttribute(BAUSTEIN_ID_ATTR) === blockId)
}

// satz ist die Satznummer ({PINDEX}) und leer, solange die Zeile im ERP nicht
// existiert; schluessel ist ihre Kennung im Bericht und immer gesetzt.
interface LaufZeile {
  satz: string
  schluessel: string
  werte: readonly string[]
}

export interface LaufErgebnis {
  geschrieben: boolean

  fehler: string

  mitschrift: Mitschrift
}

// Was ein Lauf hinterlaesst. Weitergereicht wird nur, was ein EINMAL-Abschnitt
// erarbeitet hat: was eine Zeile erarbeitet, gehoert ihr allein.
export interface Mitschrift {
  values: Record<string, string | undefined>

  // Nach Platz IN DER GANZEN KETTE, damit „Ergebnis von Schritt N" ueber
  // Abschnittsgrenzen hinweg dieselbe Zahl meint.
  stepResults: readonly string[]

  rohErgebnisse: readonly unknown[]

  previousResult: string
}

function zeilenDerListe(traeger: ZeilenTraeger, art: VormerkArt): LaufZeile[] | undefined {
  if (!hatFaehigkeit(bausteinArtFuerTag(traeger.tagName), FAEHIGKEIT_JE_LISTE[art])) return undefined
  if (art === 'erfasst') {
    const v = vertragVon(traeger, 'erfassen')
    return v.erfassteZeilen.map((werte, platz) => ({
      satz: '',
      schluessel: v.erfassteSchluessel[platz] ?? String(platz),
      werte,
    }))
  }
  const roh = art === 'geaendert'
    ? vertragVon(traeger, 'aendern').geaenderteZeilen
    : vertragVon(traeger, 'loeschen').geloeschteZeilen
  return roh.map((z) => ({ satz: z.satz, schluessel: z.satz, werte: z.werte }))
}

// Beim Loeschen zusaetzlich als {DROP_PINDEX}: eine Loesch-Relation nennt ihre
// Satznummer anders als eine Schreib-Relation.
function zeilenKontext(
  context: Platzhalterwerte,
  art: VormerkArt,
  zeile: LaufZeile,
): Platzhalterwerte {
  if (zeile.satz === '') return context
  if (art === 'geloescht') {
    return { ...context, PINDEX: zeile.satz, DROP_PINDEX: zeile.satz }
  }
  return { ...context, PINDEX: zeile.satz }
}

// Mit welcher Satznummer die Zeile wirklich hinausging: die eigene, sonst die,
// die ein Schritt der Kette fuer sie geholt hat. Ohne sie waere eine neue
// Position in der naechsten Lieferung nur noch ueber ihre Felder zu finden.
function satzDesLaufs(mitschrift: Mitschrift, zeile: LaufZeile): string {
  if (zeile.satz !== '') return zeile.satz
  return mitschrift.values.PINDEX ?? ''
}

export async function laufeSchritte(
  el: HTMLElement,
  steps: readonly LaufzeitSchritt[],
  context: Platzhalterwerte,
  zeilenZelle: ((blockId: string, spaltenIndex: number) => string) | undefined,

  // Welche Schritte in DIESEM Lauf drankommen; undefined = alle.
  nur?: ReadonlySet<number>,

  start?: Mitschrift,
): Promise<LaufErgebnis> {
  let geschrieben = false
  const values: Record<string, string | undefined> = {
    ...start?.values,
    ...context,
    NOW_DATE: heuteAlsText(new Date()),
  }
  let previousResult = start?.previousResult ?? ''

  // Voll besetzt statt angehaengt: ein uebersprungener Schritt darf nicht das
  // Ergebnis eines frueheren Abschnitts an seinem Platz ueberschreiben.
  const stepResults: string[] = steps.map((_, i) => start?.stepResults[i] ?? '')

  const rohErgebnisse: unknown[] = steps.map((_, i) => start?.rohErgebnisse[i])
  const mitschrift = (): Mitschrift => ({
    values, stepResults, rohErgebnisse, previousResult,
  })
  for (const [platz, step] of steps.entries()) {
    if (nur && !nur.has(platz)) continue
    if (step.type === 'START_TOOL') {
      if (!sendeStartTool(step.toolNr, platzhalterEinsetzen({ params: step.toolParams }, values))) {
        const text = step.toolNr.trim() === ''
          ? `Schritt ${platz + 1} der Kette: START_TOOL ohne Werkzeug-Nummer.`
          : `Schritt ${platz + 1} der Kette: START_TOOL ${step.toolNr} ging nicht hinaus `
            + '— keine Verbindung zu SoftEngine.'
        meldeFehler(text)
        return { geschrieben, fehler: text, mitschrift: mitschrift() }
      }
      continue
    }
    if (step.type === 'BW_LINK') {
      const befehl = platzhalterEinsetzen({ params: [step.befehl] }, values)[0] ?? ''
      if (!sendeBwLink(befehl)) {
        const text = befehl.trim() === ''
          ? `Schritt ${platz + 1} der Kette: BW_LINK ohne Befehl.`
          : `Schritt ${platz + 1} der Kette: BW_LINK ging nicht hinaus — keine Verbindung zu SoftEngine.`
        meldeFehler(text)
        return { geschrieben, fehler: text, mitschrift: mitschrift() }
      }
      continue
    }
    if (step.type === 'POPUP_OPEN' || step.type === 'POPUP_CLOSE') {
      applyPopupStep(el.ownerDocument ?? document, step.popup ?? '', step.type === 'POPUP_OPEN')
      continue
    }
    const relation = laufzeitRelation(step.relationId)
      // Ihn zu ueberspringen hiesse, die Schritte dahinter auf ein Ergebnis zu
      // setzen, das nie kam — still.
    if (!relation) {
      const text = `Schritt ${platz + 1} der Kette: seine Relation fehlt in dieser Maske.`
      meldeFehler(text)
      return { geschrieben, fehler: text, mitschrift: mitschrift() }
    }

    const bindungen = [...step.params, ...step.extraParams]

    // Eine leere Satznummer trifft keinen Satz: der PUT schriebe ins Nichts, die
    // Loesch-Relation loeschte nichts — und beide meldeten nichts zurueck.
    const fehlenderSatz = SATZ_PLATZHALTER.find((name) =>
      bindungen.some((b) => b.source === 'context' && b.value === name)
      && (values[name] ?? '') === '')
    if (fehlenderSatz !== undefined) {
      const loeschen = fehlenderSatz === 'DROP_PINDEX'
      const text = `Schritt ${platz + 1} der Kette braucht die Satznummer der `
        + `${loeschen ? 'zu löschenden Zeile' : 'Zeile'} — sie fehlt `
        + `(Relation Nr. ${relation.nr}). ${loeschen ? 'Nichts gelöscht.' : 'Nichts geschrieben.'}`
      meldeFehler(text)
      return { geschrieben, fehler: text, mitschrift: mitschrift() }
    }

    const runtimeValues = {
      context: values,
      previousResult,
      stepResults,
      stepRohErgebnisse: rohErgebnisse,
      gewaehlteZeile: auswahlFuer,
      ...(zeilenZelle ? { zeilenZelle } : {}),
    }
    const params = bindungen.map((binding) => resolveActionParam(binding, runtimeValues))
    const antwort = await executeRelation(relation, params)
    const result = antwort.wert
    stepResults[platz] = result
    rohErgebnisse[platz] = antwort.roh

    if (relation.verb === 'GET_RELATION') previousResult = result
    else geschrieben = true
      // Weiterlaufen hiesse, die naechsten Schritte auf ein Ergebnis zu setzen,
      // das es nicht gibt.
    if (antwort.fehler !== undefined && antwort.fehler !== '') {
      return { geschrieben, fehler: antwort.fehler, mitschrift: mitschrift() }
    }
    if (step.resultKey !== '') values[step.resultKey] = result
  }
  return { geschrieben, fehler: '', mitschrift: mitschrift() }
}

export interface AktionsErgebnis {
  ausgefuehrt: boolean
  geschrieben: boolean
  abgebrochen: boolean
  beschaeftigt: boolean
}

export async function runEvent(
  el: HTMLElement,
  eventKey: string,
  context: Platzhalterwerte,
): Promise<AktionsErgebnis> {
  const leer = { ausgefuehrt: false, geschrieben: false, abgebrochen: false, beschaeftigt: false }
  if (el.hasAttribute('data-ff-editor')) return leer
  const steps = kettenLesen(el.getAttribute('data-ff-aktionen'))[eventKey]
  if (!steps || steps.length === 0) return leer

  let locks = laufend.get(el)
  if (!locks) {
    locks = new Set()
    laufend.set(el, locks)
  }
  if (locks.has(eventKey)) return { ...leer, beschaeftigt: true }
  locks.add(eventKey)
  try {
    const abschnitte = abschnitteVon(steps)
    const berichte: {
      traeger: ZeilenTraeger; art: VormerkArt; fertige: GeschriebeneZeile[]
    }[] = []
    let geschrieben = false
    let abgebrochen = false

    // Ein Abschnitt laeuft je vorgemerkter Zeile: null Zeilen = null Laeufe.
    let zeilenAbschnitte = 0
    let vorgemerkteZeilen = 0

    let mitschrift: Mitschrift | undefined
    for (const abschnitt of abschnitte) {
      if (abschnitt.art === 'einmal') {
        const ergebnis = await laufeSchritte(
          el, steps, context, undefined, abschnitt.plaetze, mitschrift,
        )
        mitschrift = ergebnis.mitschrift
        if (ergebnis.geschrieben) geschrieben = true
        if (ergebnis.fehler !== '') { abgebrochen = true; break }
        continue
      }
      if (abschnitt.blockId === '') {
        meldeFehler('Ein Schritt liest Zellen aus zwei verschiedenen Listen — das geht nicht.')
        abgebrochen = true
        break
      }
      const traeger = sucheTraeger(el.ownerDocument ?? document, abschnitt.blockId)
      const zeilen = traeger && zeilenDerListe(traeger, abschnitt.art)
      if (!traeger || !zeilen) {
        meldeFehler('Den Baustein, dessen Zellen die Kette liest, gibt es in dieser Maske nicht.')
        abgebrochen = true
        break
      }
      zeilenAbschnitte += 1
      if (zeilen.length === 0) continue
      vorgemerkteZeilen += zeilen.length
      const bericht = { traeger, art: abschnitt.art, fertige: [] as GeschriebeneZeile[] }
      berichte.push(bericht)
      for (const zeile of zeilen) {
        berichtAn(traeger, abschnitt.art).zeileSchreibt(abschnitt.art, zeile.schluessel)
        // Die Mitschrift wird hier nur GELESEN: was eine Zeile erarbeitet,
        // gehoert ihr allein.
        const ergebnis = await laufeSchritte(el, steps, zeilenKontext(context, abschnitt.art, zeile),
          (blockId, spaltenIndex) =>
            (blockId === abschnitt.blockId ? String(zeile.werte[spaltenIndex] ?? '') : ''),
          abschnitt.plaetze, mitschrift)
        if (ergebnis.geschrieben) geschrieben = true
        // Haengengeblieben: die Zeilen dahinter bleiben unangetastet stehen,
        // sonst naehme ein Fehler in Zeile 3 auch den Zeilen 4-10 ihre Chance.
        if (ergebnis.fehler !== '') {
          berichtAn(traeger, abschnitt.art).zeileGescheitert(abschnitt.art, zeile.schluessel, ergebnis.fehler)
          abgebrochen = true
          break
        }
        bericht.fertige.push({
          schluessel: zeile.schluessel,
          satz: satzDesLaufs(ergebnis.mitschrift, zeile),
        })
      }
      if (abgebrochen) break
    }
    // Sonst ist ein Knopf, dem die Vormerkungen fehlen, von einem Knopf ohne
    // Wirkung nicht zu unterscheiden.
    if (!abgebrochen && zeilenAbschnitte > 0 && vorgemerkteZeilen === 0) {
      meldeFehler('Nichts zum Speichern vorgemerkt.')
    }
    // Ausgetragen wird erst, wenn ALLE Abschnitte durch sind: ein spaeterer
    // Abschnitt kann dieselbe Liste noch einmal lesen.
    for (const { traeger, art, fertige } of berichte) berichtAn(traeger, art).laufFertig(art, fertige)
    // Geschrieben heisst: der Stand auf dem Schirm ist von gestern.
    if (geschrieben) frischeDatenAnfordern()
    return { ausgefuehrt: true, geschrieben, abgebrochen, beschaeftigt: false }
  } finally {
    locks.delete(eventKey)
  }
}

const verdrahtet = new WeakSet<HTMLElement>()

export function connectClickAktionen(el: HTMLElement, eventKey: string): void {
  if (el.hasAttribute('data-ff-editor')) return
  if (!el.hasAttribute('data-ff-aktionen')) return
  if (verdrahtet.has(el)) return
  verdrahtet.add(el)
  const chains = kettenLesen(el.getAttribute('data-ff-aktionen'))
  if (Object.values(chains).some((steps) => steps.some((step) => step.type === 'RELATION'))) {
    bootSe()
  }
  el.addEventListener('click', () => {
    runEvent(el, eventKey, {}).catch(meldeKettenFehler)
  })
}
