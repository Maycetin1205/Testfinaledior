// Rechnet aus Daten und Stand die Zeilen, Seiten, Summen und Masse einer Ansicht.
import {
  linealTakte,
  OHNE_MESSUNG,
  platzhalterZeilen,
  rollAufteilung,
  seitenAufteilung,
  ZEILEN_HOEHE,
  type Zeilenmass,
} from './seitengroesse'
import { sortiereIndizes, SUMME_NACHKOMMA, summeText } from './sortierung'
import { spaltenRaster, type Spalte } from './spalten'
import { zeilePasst } from './textSuche'

export interface AnsichtFrage {
  spalten: readonly Spalte[]

  gezeichnet?: readonly Spalte[]
  plaetze?: readonly number[]

  breiteVon?: (index: number) => number | undefined

  hatQuelle: boolean
  datenGeliefert: boolean
  datenzeilen: readonly string[][]
  suchtext: string

  sortSpalte: number
  sortAuf: boolean

  wunschSeite: number

  gemessen: Zeilenmass | null

  // Zeilen, die unter den Daten stehen und Platz auf der Seite brauchen.
  belegteZeilen: number

  wertVon: (rohIndex: number, spalte: number) => string

  blaettert: boolean
}

export interface TabelleAnsicht {
  cols: Record<string, string>

  takt: number

  zeilenHoehe: number
  hatQuelle: boolean
  leer: boolean

  gesamt: number
  seiten: number
  seite: number

  zeilen: readonly (number | null)[]

  linealTakte: number | null

  // Ueber alle Treffer gezaehlt, nicht nur ueber die sichtbare Seite.
  summen: readonly { titel: string; text: string }[]
}

function summenVon(
  frage: AnsichtFrage,
  sichtbar: readonly number[],
): { titel: string; text: string }[] {
  const raus: { titel: string; text: string }[] = []
  frage.spalten.forEach((spalte, i) => {
    if (spalte.summe !== true) return
    const text = summeText(
      sichtbar.map((zeile) => frage.wertVon(zeile, i)),
      SUMME_NACHKOMMA.min,
      SUMME_NACHKOMMA.max,
    )
    if (text !== '') raus.push({ titel: spalte.titel, text })
  })
  return raus
}

// Gesucht und sortiert wird ueber DENSELBEN Zellwert, den die Summe nimmt:
// sonst faellt die gerade getippte Zeile aus der Liste.
function ansichtsZeilen(frage: AnsichtFrage): string[][] {
  // Ueber die Spalten, nicht ueber die Laenge der Datenzeile: eine frisch
  // angelegte Spalte hat in den Daten noch keinen Eintrag.
  return frage.datenzeilen.map((_, zeile) => frage.spalten.map((__, s) => frage.wertVon(zeile, s)))
}

function sichtbareIndizes(frage: AnsichtFrage): number[] {
  const zeilen = ansichtsZeilen(frage)
  const gefiltert = passendeIndizes(zeilen, frage.suchtext)
  if (frage.sortSpalte < 0) return gefiltert
  const rows = gefiltert.map((i) => zeilen[i])
  return sortiereIndizes(rows, frage.sortSpalte, frage.sortAuf).map((k) => gefiltert[k])
}

export function tabelleAnsicht(frage: AnsichtFrage): TabelleAnsicht {
  // Die Spuren zaehlen die gezeichneten Spalten, die gezogene Breite steht
  // unter dem vollen Platz.
  const gezeichnet = frage.gezeichnet ?? frage.spalten
  const plaetze = frage.plaetze ?? gezeichnet.map((_, i) => i)
  const cols = {
    gridTemplateColumns: spaltenRaster(gezeichnet, (j) => frage.breiteVon?.(plaetze[j] ?? j)),
  }

  const takt = ZEILEN_HOEHE
  const zeilenHoehe = frage.gemessen?.zeilenHoehe ?? takt

  const hatQuelle = frage.hatQuelle

  // Mit belegten Zeilen darunter gibt es keinen Leerzustand: sie SIND der Inhalt.
  const leer = frage.belegteZeilen > 0
    ? false
    : zeigtLeerzustand(hatQuelle, frage.datenGeliefert, frage.datenzeilen.length)

  const alleSichtbar = sichtbareIndizes(frage)

  const belegt = frage.belegteZeilen
  const gemessenPassen = frage.gemessen === null
    ? null
    : Math.max(1, frage.gemessen.passen - belegt)
  const proSeite = gemessenPassen ?? Math.max(1, OHNE_MESSUNG - belegt)
  const aufteilungsFrage = {
    sichtbar: alleSichtbar,
    hatQuelle,
    proSeite,
    wunschSeite: frage.wunschSeite,
    platzhalterZeilen: platzhalterZeilen(gemessenPassen),
  }
  const { seiten, seite, zeilen } = frage.blaettert
    ? seitenAufteilung(aufteilungsFrage)
    : rollAufteilung(aufteilungsFrage)
  return {
    cols,
    takt,
    zeilenHoehe,
    hatQuelle,
    leer,
    gesamt: alleSichtbar.length,
    seiten,
    seite,
    zeilen,

    linealTakte: linealTakte(gemessenPassen, zeilen.length),

    summen: summenVon(frage, alleSichtbar),
  }
}

function passendeIndizes(
  zeilen: readonly (readonly string[])[],
  suchtext: string,
): number[] {
  const raus: number[] = []
  zeilen.forEach((z, i) => {
    if (zeilePasst(z, suchtext)) raus.push(i)
  })
  return raus
}

export function zeigtEchteDaten(imEditor: boolean, source: string): boolean {
  return !imEditor && source.trim() !== ''
}

function zeigtLeerzustand(
  hatQuelle: boolean,
  datenGeliefert: boolean,
  zeilen: number,
): boolean {
  return hatQuelle && datenGeliefert && zeilen === 0
}

export function datensatzText(args: {
  hatQuelle: boolean
  sichtbar: number
  gesamt: number
  suchtAktiv: boolean
  auswahlAktiv?: boolean
}): string {
  if (!args.hatQuelle) return '— Datensätze'
  const zusatz = args.auswahlAktiv ? ' · durch Auswahl gefiltert' : ''

  const wort = (n: number): string => (n === 1 ? 'Datensatz' : 'Datensätze')
  const wortDativ = (n: number): string => (n === 1 ? 'Datensatz' : 'Datensätzen')
  if (!args.suchtAktiv) {
    return (args.gesamt === 0 ? 'Keine Datensätze' : `${args.gesamt} ${wort(args.gesamt)}`) + zusatz
  }
  if (args.sichtbar === 0) return `Kein Treffer von ${args.gesamt} ${wortDativ(args.gesamt)}` + zusatz
  return `${args.sichtbar} von ${args.gesamt} ${wortDativ(args.gesamt)}` + zusatz
}
